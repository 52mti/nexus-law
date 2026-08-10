from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Request, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_principal
from app.core.exceptions import AppError
from app.core.security import Principal
from app.db.models import Document
from app.db.session import get_db_session
from app.rag.ingest import SUPPORTED_EXTENSIONS
from app.schemas.rag import (
    ChunkData,
    ChunkListData,
    ChunkListResponse,
    ChunkReplaceRequest,
    ChunkReplaceResponse,
    CollectionDeleteData,
    CollectionDeleteResponse,
    DatasetCreateRequest,
    DatasetData,
    DatasetListData,
    DatasetListResponse,
    DatasetResponse,
    DocumentDeleteData,
    DocumentDeleteResponse,
    DocumentDetailData,
    DocumentDetailResponse,
    DocumentPublishData,
    DocumentPublishResponse,
    DocumentUploadData,
    DocumentUploadResponse,
)
from app.services import document as document_service
from app.services.document import normalize_collection_name

router = APIRouter(prefix="/rag", tags=["rag"])


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _document_detail(document) -> DocumentDetailData:  # noqa: ANN001
    return DocumentDetailData(
        document_id=document.id,
        source=document.source,
        title=document.title,
        status=document.status,
        chunk_count=document.chunk_count,
        dataset_id=document.dataset_id,
        collection=document.collection,
        content_type=document.content_type,
        file_extension=document.file_extension,
        file_size_bytes=document.file_size_bytes,
        error_message=document.error_message,
        storage_status=document.storage_status,
        oss_url=document.oss_url,
        oss_key=document.oss_key,
        created_at=document.created_at.isoformat() if document.created_at else None,
        updated_at=document.updated_at.isoformat() if document.updated_at else None,
    )


def _chunk_data(chunk) -> ChunkData:  # noqa: ANN001
    return ChunkData(
        id=chunk.id,
        chunk_index=chunk.chunk_index,
        content=chunk.content,
        char_count=chunk.char_count,
    )


async def _dataset_data(session: AsyncSession, dataset) -> DatasetData:  # noqa: ANN001
    count_result = await session.execute(
        select(func.count()).select_from(Document).where(Document.dataset_id == dataset.id)
    )
    document_count = int(count_result.scalar_one() or 0)
    return DatasetData(
        dataset_id=dataset.id,
        name=dataset.name,
        weaviate_collection=dataset.weaviate_collection,
        title=dataset.title,
        description=dataset.description,
        document_count=document_count,
        created_by=dataset.created_by,
        created_at=dataset.created_at.isoformat() if dataset.created_at else None,
        updated_at=dataset.updated_at.isoformat() if dataset.updated_at else None,
    )


@router.post("/datasets", response_model=DatasetResponse)
async def create_dataset(
    body: DatasetCreateRequest,
    request: Request,
    principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> DatasetResponse:
    dataset = await document_service.create_dataset(
        session,
        name=body.name,
        title=body.title,
        description=body.description,
        created_by=principal.subject,
    )
    return DatasetResponse(
        data=await _dataset_data(session, dataset),
        request_id=_request_id(request),
    )


@router.get("/datasets", response_model=DatasetListResponse)
async def list_datasets(
    request: Request,
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> DatasetListResponse:
    datasets = await document_service.list_datasets(session)
    items = [await _dataset_data(session, ds) for ds in datasets]
    return DatasetListResponse(
        data=DatasetListData(datasets=items),
        request_id=_request_id(request),
    )


@router.get("/datasets/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: str,
    request: Request,
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> DatasetResponse:
    dataset = await document_service.get_dataset(session, dataset_id)
    return DatasetResponse(
        data=await _dataset_data(session, dataset),
        request_id=_request_id(request),
    )


@router.delete("/datasets/{name}", response_model=CollectionDeleteResponse)
async def delete_dataset_by_name(
    name: str,
    request: Request,
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> CollectionDeleteResponse:
    """Delete dataset by name (alias of DELETE /collections/{collection})."""
    result = await document_service.delete_collection_dataset(session, name)
    return CollectionDeleteResponse(
        data=CollectionDeleteData.model_validate(result),
        request_id=_request_id(request),
    )


@router.post("/documents", response_model=DocumentUploadResponse)
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    collection: str = Form(
        ...,
        description="Dataset / Weaviate collection name (e.g. NexusLawDocuments)",
    ),
    principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentUploadResponse:
    filename = file.filename or "document.txt"
    content = await file.read()
    if not content:
        raise AppError("Uploaded file is empty", code="empty_upload", status_code=422)

    collection_name = normalize_collection_name(collection)

    document = await document_service.create_upload_stub(
        session,
        filename=filename,
        content=content,
        collection=collection_name,
        content_type=file.content_type,
        uploaded_by=principal.subject,
    )
    # Ensure row is visible before the background task starts.
    await session.commit()
    background_tasks.add_task(document_service.run_parse_task, document.id)

    return DocumentUploadResponse(
        data=DocumentUploadData(
            document_id=document.id,
            source=document.source,
            status=document.status,
            dataset_id=document.dataset_id,
            collection=document.collection,
        ),
        request_id=_request_id(request),
    )


@router.get("/documents/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: str,
    request: Request,
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentDetailResponse:
    document = await document_service.get_document(session, document_id)
    return DocumentDetailResponse(
        data=_document_detail(document),
        request_id=_request_id(request),
    )


@router.get("/documents/{document_id}/chunks", response_model=ChunkListResponse)
async def get_document_chunks(
    document_id: str,
    request: Request,
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> ChunkListResponse:
    document = await document_service.get_document(session, document_id)
    chunks = await document_service.list_chunks(session, document_id)
    return ChunkListResponse(
        data=ChunkListData(
            document_id=document.id,
            status=document.status,
            chunks=[_chunk_data(c) for c in chunks],
        ),
        request_id=_request_id(request),
    )


@router.put("/documents/{document_id}/chunks", response_model=ChunkReplaceResponse)
async def replace_document_chunks(
    document_id: str,
    body: ChunkReplaceRequest,
    request: Request,
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> ChunkReplaceResponse:
    document = await document_service.get_document(session, document_id)
    chunks = await document_service.replace_chunks(
        session,
        document_id,
        items=[item.model_dump() for item in body.chunks],
    )
    return ChunkReplaceResponse(
        data=ChunkListData(
            document_id=document.id,
            status=document.status,
            chunks=[_chunk_data(c) for c in chunks],
        ),
        request_id=_request_id(request),
    )


@router.post("/documents/{document_id}/publish", response_model=DocumentPublishResponse)
async def publish_document(
    document_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentPublishResponse:
    document = await document_service.mark_publishing(session, document_id)
    await session.commit()
    background_tasks.add_task(document_service.run_publish_task, document.id)

    return DocumentPublishResponse(
        data=DocumentPublishData(
            document_id=document.id,
            status=document.status,
            chunk_count=document.chunk_count,
            dataset_id=document.dataset_id,
            collection=document.collection,
        ),
        request_id=_request_id(request),
    )


@router.delete("/documents/{document_id}", response_model=DocumentDeleteResponse)
async def delete_document(
    document_id: str,
    request: Request,
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentDeleteResponse:
    """Delete one document: COS original + Weaviate vectors + PG rows/chunks."""
    result = await document_service.delete_document_by_id(session, document_id)
    return DocumentDeleteResponse(
        data=DocumentDeleteData.model_validate(result),
        request_id=_request_id(request),
    )


@router.delete("/collections/{collection}", response_model=CollectionDeleteResponse)
async def delete_collection(
    collection: str,
    request: Request,
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> CollectionDeleteResponse:
    """Delete a dataset: PG documents + chunks (cascade) and Weaviate vectors."""
    result = await document_service.delete_collection_dataset(session, collection)
    return CollectionDeleteResponse(
        data=CollectionDeleteData.model_validate(result),
        request_id=_request_id(request),
    )


@router.get("/supported-types")
async def supported_types(
    request: Request,
    _principal: Principal = Depends(require_principal),
) -> dict:
    return {
        "success": True,
        "data": {"extensions": sorted(SUPPORTED_EXTENSIONS)},
        "error": None,
        "request_id": _request_id(request),
    }
