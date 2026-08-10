from __future__ import annotations

import asyncio
import hashlib
import re
from pathlib import Path
from uuid import uuid4

from loguru import logger
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db.models import Dataset, Document, DocumentChunk, DocumentStatus, StorageStatus
from app.db.session import AsyncSessionLocal
from app.rag.ingest import new_document_id, parse_and_chunk, publish_to_weaviate
from app.rag.store import delete_weaviate_by_document_id, delete_weaviate_collection
from app.services.cos_storage import delete_objects as cos_delete_objects
from app.services.cos_storage import upload_bytes as cos_upload_bytes

# Weaviate collection / class names: start with uppercase letter.
_COLLECTION_RE = re.compile(r"^[A-Z][A-Za-z0-9_]{0,127}$")


def checksum_sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def normalize_collection_name(collection: str) -> str:
    """Validate dataset / Weaviate collection name (kept name for API compatibility)."""
    name = (collection or "").strip()
    if not name:
        raise AppError(
            "collection is required (dataset / Weaviate class name)",
            code="collection_required",
            status_code=422,
        )
    if not _COLLECTION_RE.match(name):
        raise AppError(
            "Invalid collection name. Use Weaviate class style: "
            "start with A-Z, then letters/digits/underscore "
            "(e.g. NexusLawDocuments, LaborContracts).",
            code="invalid_collection",
            status_code=422,
        )
    return name


normalize_dataset_name = normalize_collection_name


_EDITABLE_STATUSES = {DocumentStatus.DRAFT.value, DocumentStatus.FAILED.value}
_PUBLISHABLE_STATUSES = {DocumentStatus.DRAFT.value}


async def get_or_create_dataset(
    session: AsyncSession,
    name: str,
    *,
    title: str | None = None,
    description: str | None = None,
    created_by: str | None = None,
) -> Dataset:
    dataset_name = normalize_dataset_name(name)
    result = await session.execute(select(Dataset).where(Dataset.name == dataset_name))
    dataset = result.scalar_one_or_none()
    if dataset:
        return dataset

    dataset = Dataset(
        id=str(uuid4()),
        name=dataset_name,
        weaviate_collection=dataset_name,
        title=title or dataset_name,
        description=description,
        created_by=created_by,
    )
    session.add(dataset)
    await session.flush()
    return dataset


async def get_dataset(session: AsyncSession, dataset_id: str) -> Dataset:
    result = await session.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise AppError("Dataset not found", code="dataset_not_found", status_code=404)
    return dataset


async def get_dataset_by_name(session: AsyncSession, name: str) -> Dataset:
    dataset_name = normalize_dataset_name(name)
    result = await session.execute(select(Dataset).where(Dataset.name == dataset_name))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise AppError(
            f"Dataset '{dataset_name}' not found",
            code="dataset_not_found",
            status_code=404,
        )
    return dataset


async def list_datasets(session: AsyncSession) -> list[Dataset]:
    result = await session.execute(select(Dataset).order_by(Dataset.created_at.desc()))
    return list(result.scalars().all())


async def create_dataset(
    session: AsyncSession,
    *,
    name: str,
    title: str | None = None,
    description: str | None = None,
    created_by: str | None = None,
) -> Dataset:
    dataset_name = normalize_dataset_name(name)
    existing = await session.execute(select(Dataset).where(Dataset.name == dataset_name))
    if existing.scalar_one_or_none():
        raise AppError(
            f"Dataset '{dataset_name}' already exists",
            code="dataset_exists",
            status_code=409,
        )
    dataset = Dataset(
        id=str(uuid4()),
        name=dataset_name,
        weaviate_collection=dataset_name,
        title=title or dataset_name,
        description=description,
        created_by=created_by,
    )
    session.add(dataset)
    await session.flush()
    return dataset


async def _upload_raw_to_cos(
    session: AsyncSession,
    document: Document,
    raw: bytes,
) -> None:
    """Upload original bytes to COS and persist oss_* fields. Does not fail parse on error."""
    document.storage_provider = "tencent_cos"
    document.storage_status = StorageStatus.PENDING.value
    await session.flush()
    try:
        result = await asyncio.to_thread(
            cos_upload_bytes,
            content=raw,
            document_id=document.id,
            filename=document.source,
            content_type=document.content_type,
        )
    except Exception as exc:  # noqa: BLE001
        document.storage_status = StorageStatus.FAILED.value
        logger.warning(
            "cos_upload_skipped_continue_parse document_id={} error={}",
            document.id,
            type(exc).__name__,
        )
        if isinstance(exc, AppError):
            logger.warning("cos_error document_id={} message={}", document.id, exc.message)
        return

    document.storage_status = StorageStatus.UPLOADED.value
    document.oss_bucket = result.bucket
    document.oss_region = result.region
    document.oss_key = result.key
    document.oss_url = result.url
    document.oss_etag = result.etag
    document.oss_uploaded_at = result.uploaded_at
    await session.flush()


async def create_upload_stub(
    session: AsyncSession,
    *,
    filename: str,
    content: bytes,
    collection: str,
    content_type: str | None = None,
    uploaded_by: str | None = None,
) -> Document:
    settings = get_settings()
    source = Path(filename).name
    suffix = Path(source).suffix.lower() or None
    cos_on = settings.cos_enabled
    dataset = await get_or_create_dataset(
        session,
        collection,
        created_by=uploaded_by,
    )
    document = Document(
        id=new_document_id(),
        dataset_id=dataset.id,
        source=source,
        title=Path(source).stem or source,
        content_type=content_type,
        file_extension=suffix,
        file_size_bytes=len(content),
        checksum_sha256=checksum_sha256(content),
        raw_content=content,
        chunk_count=0,
        status=DocumentStatus.UPLOADING.value,
        uploaded_by=uploaded_by,
        storage_provider="tencent_cos" if cos_on else None,
        storage_status=(
            StorageStatus.PENDING.value if cos_on else StorageStatus.NONE.value
        ),
    )
    document.dataset = dataset
    session.add(document)
    await session.flush()
    return document


async def get_document(session: AsyncSession, document_id: str) -> Document:
    result = await session.execute(
        select(Document)
        .where(Document.id == document_id)
        .options(selectinload(Document.dataset))
    )
    document = result.scalar_one_or_none()
    if not document:
        raise AppError("Document not found", code="document_not_found", status_code=404)
    return document


async def get_document_with_chunks(session: AsyncSession, document_id: str) -> Document:
    result = await session.execute(
        select(Document)
        .where(Document.id == document_id)
        .options(
            selectinload(Document.chunks),
            selectinload(Document.dataset),
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise AppError("Document not found", code="document_not_found", status_code=404)
    return document


async def list_chunks(session: AsyncSession, document_id: str) -> list[DocumentChunk]:
    await get_document(session, document_id)
    result = await session.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    )
    return list(result.scalars().all())


async def replace_chunks(
    session: AsyncSession,
    document_id: str,
    *,
    items: list[dict],
) -> list[DocumentChunk]:
    """Replace chunk set with ordered items: [{id?, content}, ...]. Reindexes 0..n-1."""
    document = await get_document(session, document_id)
    if document.status not in _EDITABLE_STATUSES:
        raise AppError(
            f"Document status '{document.status}' does not allow chunk edits",
            code="document_not_editable",
            status_code=409,
        )
    if not items:
        raise AppError(
            "At least one chunk is required",
            code="empty_chunks",
            status_code=422,
        )

    existing = await list_chunks(session, document_id)
    by_id = {chunk.id: chunk for chunk in existing}
    kept_ids: set[str] = set()
    new_chunks: list[DocumentChunk] = []

    for index, item in enumerate(items):
        content = (item.get("content") or "").strip()
        if not content:
            raise AppError(
                f"Chunk at index {index} has empty content",
                code="empty_chunk_content",
                status_code=422,
            )
        chunk_id = item.get("id")
        if chunk_id and chunk_id in by_id:
            chunk = by_id[chunk_id]
            chunk.content = content
            chunk.char_count = len(content)
            chunk.chunk_index = index
            kept_ids.add(chunk_id)
            new_chunks.append(chunk)
        else:
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=index,
                content=content,
                char_count=len(content),
            )
            session.add(chunk)
            new_chunks.append(chunk)

    for chunk in existing:
        if chunk.id not in kept_ids:
            await session.delete(chunk)

    document.chunk_count = len(new_chunks)
    if document.status == DocumentStatus.FAILED.value:
        document.status = DocumentStatus.DRAFT.value
        document.error_message = None
    await session.flush()
    return new_chunks


async def mark_publishing(session: AsyncSession, document_id: str) -> Document:
    document = await get_document_with_chunks(session, document_id)
    if document.status not in _PUBLISHABLE_STATUSES:
        raise AppError(
            f"Document status '{document.status}' cannot be published",
            code="document_not_publishable",
            status_code=409,
        )
    if not document.chunks:
        raise AppError(
            "Document has no chunks to publish",
            code="empty_chunks",
            status_code=422,
        )
    document.status = DocumentStatus.PUBLISHING.value
    document.error_message = None
    await session.flush()
    return document


async def run_parse_task(document_id: str) -> None:
    """BackgroundTask: parse raw_content into draft chunks. Uses its own DB session."""
    async with AsyncSessionLocal() as session:
        try:
            document = await get_document(session, document_id)
            if document.status not in {
                DocumentStatus.UPLOADING.value,
                DocumentStatus.PARSING.value,
            }:
                logger.info(
                    "parse_skip document_id={} status={}",
                    document_id,
                    document.status,
                )
                return

            document.status = DocumentStatus.PARSING.value
            await session.commit()

            raw = document.raw_content
            if not raw:
                raise AppError(
                    "Missing raw file content for parsing",
                    code="missing_raw_content",
                    status_code=422,
                )

            settings = get_settings()
            if settings.cos_enabled:
                await _upload_raw_to_cos(session, document, raw)

            parsed = await asyncio.to_thread(
                parse_and_chunk,
                filename=document.source,
                content=raw,
            )

            await session.execute(
                delete(DocumentChunk).where(DocumentChunk.document_id == document_id)
            )
            chunks = [
                DocumentChunk(
                    document_id=document_id,
                    chunk_index=index,
                    content=chunk,
                    char_count=len(chunk),
                )
                for index, chunk in enumerate(parsed.chunks)
            ]
            session.add_all(chunks)
            document.extracted_text = parsed.extracted_text
            document.chunk_count = len(chunks)
            document.raw_content = None
            document.status = DocumentStatus.DRAFT.value
            document.error_message = None
            await session.commit()
            logger.info(
                "parse_done document_id={} chunks={} storage_status={}",
                document_id,
                len(chunks),
                document.storage_status,
            )
        except Exception as exc:  # noqa: BLE001
            await session.rollback()
            async with AsyncSessionLocal() as err_session:
                document = await get_document(err_session, document_id)
                document.status = DocumentStatus.FAILED.value
                if isinstance(exc, AppError):
                    document.error_message = exc.message
                else:
                    document.error_message = str(exc)
                await err_session.commit()
            logger.warning(
                "parse_failed document_id={} error={}",
                document_id,
                type(exc).__name__,
            )


async def run_publish_task(document_id: str) -> None:
    """BackgroundTask: embed + Weaviate write. Uses its own DB session."""
    async with AsyncSessionLocal() as session:
        try:
            document = await get_document_with_chunks(session, document_id)
            if document.status != DocumentStatus.PUBLISHING.value:
                logger.info(
                    "publish_skip document_id={} status={}",
                    document_id,
                    document.status,
                )
                return

            collection = document.collection
            if not collection:
                raise AppError(
                    "Document dataset has no Weaviate collection name",
                    code="dataset_collection_missing",
                    status_code=500,
                )

            chunks = sorted(document.chunks, key=lambda c: c.chunk_index)
            texts = [c.content for c in chunks]
            await asyncio.to_thread(
                publish_to_weaviate,
                document_id=document.id,
                source=document.source,
                chunks=texts,
                collection=collection,
            )
            document.status = DocumentStatus.PUBLISHED.value
            document.error_message = None
            await session.commit()
            logger.info(
                "publish_done document_id={} collection={}",
                document_id,
                collection,
            )
        except Exception as exc:  # noqa: BLE001
            await session.rollback()
            async with AsyncSessionLocal() as err_session:
                document = await get_document(err_session, document_id)
                document.status = DocumentStatus.DRAFT.value
                if isinstance(exc, AppError):
                    document.error_message = exc.message
                else:
                    document.error_message = str(exc)
                await err_session.commit()
            logger.warning(
                "publish_failed document_id={} error={}",
                document_id,
                type(exc).__name__,
            )


async def delete_document_by_id(
    session: AsyncSession,
    document_id: str,
) -> dict[str, object]:
    """Delete one document: COS original + Weaviate vectors + PG document/chunks."""
    settings = get_settings()
    document = await get_document_with_chunks(session, document_id)
    chunk_count = len(document.chunks)
    collection = document.collection
    dataset_id = document.dataset_id

    cos_deleted_count = 0
    if document.oss_key and str(document.oss_key).strip():
        if not settings.cos_enabled:
            raise AppError(
                "Document has a COS original but COS_ENABLED=false; "
                "enable COS to delete the object storage file.",
                code="cos_disabled",
                status_code=503,
                details={"oss_key": document.oss_key},
            )
        cos_deleted_count = await asyncio.to_thread(
            cos_delete_objects,
            items=[(document.oss_bucket, document.oss_key)],
            settings=settings,
        )

    weaviate_deleted_count = await asyncio.to_thread(
        delete_weaviate_by_document_id,
        document_id=document.id,
        collection=collection,
        settings=settings,
    )

    await session.delete(document)
    await session.flush()

    logger.info(
        "document_deleted document_id={} dataset_id={} collection={} chunks={} weaviate={} cos={}",
        document.id,
        dataset_id,
        collection,
        chunk_count,
        weaviate_deleted_count,
        cos_deleted_count,
    )
    return {
        "document_id": document.id,
        "dataset_id": dataset_id,
        "collection": collection,
        "chunk_count": chunk_count,
        "weaviate_deleted_count": weaviate_deleted_count,
        "cos_deleted_count": cos_deleted_count,
    }


async def delete_collection_dataset(
    session: AsyncSession,
    collection: str,
) -> dict[str, object]:
    """Delete a dataset: COS originals + Weaviate collection + PG dataset/docs/chunks."""
    name = normalize_collection_name(collection)
    settings = get_settings()

    dataset_result = await session.execute(select(Dataset).where(Dataset.name == name))
    dataset = dataset_result.scalar_one_or_none()

    documents: list[Document] = []
    if dataset:
        docs_result = await session.execute(
            select(Document).where(Document.dataset_id == dataset.id)
        )
        documents = list(docs_result.scalars().all())

    document_count = len(documents)
    weaviate_name = dataset.weaviate_collection if dataset else name

    chunk_count = 0
    if dataset:
        chunk_count_result = await session.execute(
            select(func.count())
            .select_from(DocumentChunk)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(Document.dataset_id == dataset.id)
        )
        chunk_count = int(chunk_count_result.scalar_one() or 0)

    cos_items = [
        (doc.oss_bucket, doc.oss_key)
        for doc in documents
        if doc.oss_key and str(doc.oss_key).strip()
    ]
    cos_deleted_count = 0
    if cos_items:
        if not settings.cos_enabled:
            raise AppError(
                "Dataset has COS originals but COS_ENABLED=false; "
                "enable COS to delete object storage files.",
                code="cos_disabled",
                status_code=503,
                details={"pending_keys": len(cos_items)},
            )
        cos_deleted_count = await asyncio.to_thread(
            cos_delete_objects,
            items=cos_items,
            settings=settings,
        )

    weaviate_deleted = await asyncio.to_thread(delete_weaviate_collection, weaviate_name)

    if dataset is None and not weaviate_deleted and cos_deleted_count == 0:
        raise AppError(
            f"Dataset / collection '{name}' not found in database or Weaviate",
            code="collection_not_found",
            status_code=404,
        )

    dataset_id = dataset.id if dataset else None
    if dataset:
        await session.delete(dataset)
        await session.flush()

    logger.info(
        "dataset_deleted dataset_id={} collection={} documents={} chunks={} weaviate={} cos={}",
        dataset_id,
        name,
        document_count,
        chunk_count,
        weaviate_deleted,
        cos_deleted_count,
    )
    return {
        "dataset_id": dataset_id,
        "collection": name,
        "document_count": document_count,
        "chunk_count": chunk_count,
        "weaviate_deleted": weaviate_deleted,
        "cos_deleted_count": cos_deleted_count,
    }
