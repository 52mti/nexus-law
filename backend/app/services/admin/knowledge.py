from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.biz import BizCode, BizError
from app.core.exceptions import AppError
from app.db.models import (
    Dataset,
    DatasetVisibility,
    Document,
    DocumentChunk,
    DocumentStatus,
)
from app.rag.store import delete_weaviate_by_document_id, delete_weaviate_collection
from app.services import document as document_service
from app.services.admin.common import iso, page_meta
from app.services.audit import write_audit


def _wrap_app_error(exc: AppError) -> BizError:
    mapping = {
        "dataset_not_found": BizCode.DATASET_NOT_FOUND,
        "dataset_exists": BizCode.DATASET_NAME_TAKEN,
        "document_not_found": BizCode.DOCUMENT_NOT_FOUND,
        "document_not_publishable": BizCode.DOCUMENT_STATUS_INVALID,
        "empty_chunks": BizCode.DOCUMENT_STATUS_INVALID,
        "empty_upload": BizCode.INVALID_PARAMS,
        "collection_required": BizCode.INVALID_PARAMS,
    }
    code = mapping.get(exc.code, BizCode.INVALID_PARAMS)
    if exc.status_code >= 500:
        code = BizCode.INTERNAL_ERROR
    return BizError(code, exc.message)


def dump_dataset(item: Dataset, document_count: int | None = None) -> dict[str, Any]:
    return {
        "id": item.id,
        "name": item.name,
        "title": item.title,
        "description": item.description,
        "region": item.region,
        "visibility": item.visibility,
        "weaviate_collection": item.weaviate_collection,
        "document_count": document_count,
        "created_at": iso(item.created_at),
        "updated_at": iso(item.updated_at),
    }


def dump_document(item: Document) -> dict[str, Any]:
    return {
        "id": item.id,
        "dataset_id": item.dataset_id,
        "collection": item.collection,
        "source": item.source,
        "title": item.title,
        "law_level": item.law_level,
        "region": item.region,
        "status": item.status,
        "chunk_count": item.chunk_count,
        "effective_at": iso(item.effective_at),
        "expired_at": iso(item.expired_at),
        "error_message": item.error_message,
        "storage_status": item.storage_status,
        "oss_url": item.oss_url,
        "created_at": iso(item.created_at),
        "updated_at": iso(item.updated_at),
    }


def dump_chunk(item: DocumentChunk) -> dict[str, Any]:
    return {
        "id": item.id,
        "chunk_index": item.chunk_index,
        "content": item.content,
        "char_count": item.char_count,
    }


async def list_datasets(
    session: AsyncSession,
    *,
    keyword: str | None = None,
    region: str | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [Dataset.is_deleted.is_(False)]
    if keyword and keyword.strip():
        like = f"%{keyword.strip()}%"
        filters.append(or_(Dataset.name.ilike(like), Dataset.title.ilike(like)))
    if region:
        filters.append(Dataset.region == region)
    total = int(
        (
            await session.execute(select(func.count()).select_from(Dataset).where(*filters))
        ).scalar_one()
    )
    rows = list(
        (
            await session.execute(
                select(Dataset)
                .where(*filters)
                .order_by(Dataset.created_at.desc())
                .offset((current - 1) * size)
                .limit(size)
            )
        )
        .scalars()
        .all()
    )
    counts: dict[str, int] = {}
    if rows:
        count_rows = (
            await session.execute(
                select(Document.dataset_id, func.count())
                .where(
                    Document.dataset_id.in_([item.id for item in rows]),
                    Document.is_deleted.is_(False),
                )
                .group_by(Document.dataset_id)
            )
        ).all()
        counts = {dataset_id: int(count) for dataset_id, count in count_rows}
    return {
        "records": [dump_dataset(item, counts.get(item.id, 0)) for item in rows],
        **page_meta(total, current, size),
    }


async def get_dataset_detail(session: AsyncSession, dataset_id: str) -> dict[str, Any]:
    try:
        dataset = await document_service.get_dataset(session, dataset_id)
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    count = int(
        (
            await session.execute(
                select(func.count()).select_from(Document).where(
                    Document.dataset_id == dataset.id,
                    Document.is_deleted.is_(False),
                )
            )
        ).scalar_one()
    )
    return dump_dataset(dataset, count)


async def create_dataset(
    session: AsyncSession,
    *,
    admin_id: str,
    name: str,
    title: str | None,
    description: str | None,
    region: str | None,
    visibility: str | None,
) -> dict[str, Any]:
    try:
        dataset = await document_service.create_dataset(
            session,
            name=name,
            title=title,
            description=description,
            created_by=admin_id,
        )
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    if region is not None:
        dataset.region = region
    if visibility:
        try:
            dataset.visibility = DatasetVisibility(visibility).value
        except ValueError as exc:
            raise BizError(BizCode.INVALID_PARAMS, "知识库可见范围不正确") from exc
    await session.flush()
    await session.refresh(dataset)
    await write_audit(
        session,
        admin_id=admin_id,
        action="dataset.create",
        target_type="dataset",
        target_id=dataset.id,
        detail={"name": dataset.name},
    )
    return await get_dataset_detail(session, dataset.id)


async def update_dataset(
    session: AsyncSession,
    *,
    admin_id: str,
    dataset_id: str,
    title: str | None = None,
    description: str | None = None,
    region: str | None = None,
    visibility: str | None = None,
) -> dict[str, Any]:
    try:
        dataset = await document_service.get_dataset(session, dataset_id)
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    if title is not None:
        dataset.title = title
    if description is not None:
        dataset.description = description
    if region is not None:
        dataset.region = region
    if visibility is not None:
        try:
            dataset.visibility = DatasetVisibility(visibility).value
        except ValueError as exc:
            raise BizError(BizCode.INVALID_PARAMS, "知识库可见范围不正确") from exc
    await session.flush()
    await session.refresh(dataset, attribute_names=["created_at", "updated_at"])
    await write_audit(
        session,
        admin_id=admin_id,
        action="dataset.update",
        target_type="dataset",
        target_id=dataset.id,
        detail={"name": dataset.name},
    )
    return await get_dataset_detail(session, dataset.id)


async def delete_dataset(
    session: AsyncSession,
    *,
    admin_id: str,
    dataset_id: str,
) -> dict[str, Any]:
    try:
        dataset = await document_service.get_dataset(session, dataset_id)
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    docs = list(
        (
            await session.execute(
                select(Document).where(
                    Document.dataset_id == dataset.id,
                    Document.is_deleted.is_(False),
                )
            )
        )
        .scalars()
        .all()
    )
    for doc in docs:
        doc.is_deleted = True
        if doc.status == DocumentStatus.PUBLISHED.value:
            try:
                delete_weaviate_by_document_id(
                    document_id=doc.id,
                    collection=dataset.weaviate_collection,
                )
            except AppError:
                pass
            doc.status = DocumentStatus.DRAFT.value
    dataset.is_deleted = True
    try:
        delete_weaviate_collection(dataset.weaviate_collection)
    except AppError:
        pass
    await session.flush()
    await write_audit(
        session,
        admin_id=admin_id,
        action="dataset.delete",
        target_type="dataset",
        target_id=dataset.id,
        detail={"name": dataset.name},
    )
    return {"id": dataset.id}


async def list_documents(
    session: AsyncSession,
    *,
    dataset_id: str | None = None,
    region: str | None = None,
    law_level: str | None = None,
    status: str | None = None,
    keyword: str | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [Document.is_deleted.is_(False)]
    if dataset_id:
        filters.append(Document.dataset_id == dataset_id)
    if region:
        filters.append(Document.region == region)
    if law_level:
        filters.append(Document.law_level == law_level)
    if status:
        filters.append(Document.status == status)
    if keyword and keyword.strip():
        like = f"%{keyword.strip()}%"
        filters.append(or_(Document.title.ilike(like), Document.source.ilike(like)))
    total = int(
        (
            await session.execute(select(func.count()).select_from(Document).where(*filters))
        ).scalar_one()
    )
    rows = list(
        (
            await session.execute(
                select(Document)
                .where(*filters)
                .options(selectinload(Document.dataset))
                .order_by(Document.created_at.desc())
                .offset((current - 1) * size)
                .limit(size)
            )
        )
        .scalars()
        .all()
    )
    return {
        "records": [dump_document(item) for item in rows],
        **page_meta(total, current, size),
    }


async def get_document_detail(session: AsyncSession, document_id: str) -> dict[str, Any]:
    try:
        document = await document_service.get_document(session, document_id)
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    return dump_document(document)


async def list_document_chunks(session: AsyncSession, document_id: str) -> dict[str, Any]:
    try:
        document = await document_service.get_document(session, document_id)
        chunks = await document_service.list_chunks(session, document_id)
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    return {
        "document_id": document.id,
        "status": document.status,
        "records": [dump_chunk(item) for item in chunks],
        "total": len(chunks),
    }


async def upload_document(
    session: AsyncSession,
    *,
    admin_id: str,
    filename: str,
    content: bytes,
    content_type: str | None,
    dataset_id: str | None,
    dataset_name: str | None,
    title: str | None,
    law_level: str | None,
    region: str | None,
    effective_at: datetime | None,
    expired_at: datetime | None,
) -> dict[str, Any]:
    if not content:
        raise BizError(BizCode.INVALID_PARAMS, "上传文件不能为空")
    collection = dataset_name
    if dataset_id:
        try:
            dataset = await document_service.get_dataset(session, dataset_id)
        except AppError as exc:
            raise _wrap_app_error(exc) from exc
        collection = dataset.name
    if not collection:
        raise BizError(BizCode.INVALID_PARAMS, "请指定知识库")
    try:
        document = await document_service.create_upload_stub(
            session,
            filename=filename,
            content=content,
            collection=collection,
            content_type=content_type,
            uploaded_by=admin_id,
        )
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    if title:
        document.title = title
    if law_level:
        document.law_level = law_level
    if region:
        document.region = region
    if effective_at:
        document.effective_at = effective_at
    if expired_at:
        document.expired_at = expired_at
    await session.flush()
    await session.refresh(document, attribute_names=["created_at", "updated_at"])
    await write_audit(
        session,
        admin_id=admin_id,
        action="document.upload",
        target_type="document",
        target_id=document.id,
        detail={"source": document.source, "dataset_id": document.dataset_id},
    )
    return dump_document(document)


async def update_chunks(
    session: AsyncSession,
    *,
    admin_id: str,
    document_id: str,
    chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    try:
        document = await document_service.get_document(session, document_id)
        if document.status == DocumentStatus.PUBLISHED.value:
            raise BizError(BizCode.DOCUMENT_STATUS_INVALID, "已发布文档请先下架再编辑切片")
        saved = await document_service.replace_chunks(session, document_id, items=chunks)
    except BizError:
        raise
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    await write_audit(
        session,
        admin_id=admin_id,
        action="document.chunks.update",
        target_type="document",
        target_id=document_id,
        detail={"chunk_count": len(saved)},
    )
    return await list_document_chunks(session, document_id)


async def publish_document(
    session: AsyncSession,
    *,
    admin_id: str,
    document_id: str,
) -> dict[str, Any]:
    try:
        document = await document_service.mark_publishing(session, document_id)
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    await session.refresh(document, attribute_names=["created_at", "updated_at", "status"])
    await write_audit(
        session,
        admin_id=admin_id,
        action="document.publish",
        target_type="document",
        target_id=document.id,
        detail={"status": document.status},
    )
    return dump_document(document)


async def unpublish_document(
    session: AsyncSession,
    *,
    admin_id: str,
    document_id: str,
) -> dict[str, Any]:
    try:
        document = await document_service.get_document(session, document_id)
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    if document.status not in {
        DocumentStatus.PUBLISHED.value,
        DocumentStatus.PUBLISHING.value,
    }:
        raise BizError(BizCode.DOCUMENT_STATUS_INVALID, "当前状态不可下架")
    try:
        delete_weaviate_by_document_id(
            document_id=document.id,
            collection=document.collection,
        )
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    document.status = DocumentStatus.DRAFT.value
    document.error_message = None
    await session.flush()
    await session.refresh(document, attribute_names=["created_at", "updated_at", "status"])
    await write_audit(
        session,
        admin_id=admin_id,
        action="document.unpublish",
        target_type="document",
        target_id=document.id,
        detail={"status": document.status},
    )
    return dump_document(document)


async def delete_document(
    session: AsyncSession,
    *,
    admin_id: str,
    document_id: str,
) -> dict[str, Any]:
    try:
        document = await document_service.get_document(session, document_id)
    except AppError as exc:
        raise _wrap_app_error(exc) from exc
    if document.status in {DocumentStatus.PUBLISHED.value, DocumentStatus.PUBLISHING.value}:
        try:
            delete_weaviate_by_document_id(
                document_id=document.id,
                collection=document.collection,
            )
        except AppError:
            pass
    chunks = (
        await session.execute(
            select(DocumentChunk).where(
                DocumentChunk.document_id == document.id,
                DocumentChunk.is_deleted.is_(False),
            )
        )
    ).scalars().all()
    for chunk in chunks:
        chunk.is_deleted = True
    document.is_deleted = True
    if document.status == DocumentStatus.PUBLISHED.value:
        document.status = DocumentStatus.DRAFT.value
    await session.flush()
    await write_audit(
        session,
        admin_id=admin_id,
        action="document.delete",
        target_type="document",
        target_id=document.id,
        detail={"source": document.source},
    )
    return {"id": document.id}
