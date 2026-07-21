from fastapi import APIRouter, BackgroundTasks, Depends, File, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_principal
from app.core.exceptions import AppError
from app.core.security import Principal
from app.db.session import get_db_session
from app.rag.ingest import SUPPORTED_EXTENSIONS
from app.schemas.rag import (
    ChunkData,
    ChunkListData,
    ChunkListResponse,
    ChunkReplaceRequest,
    ChunkReplaceResponse,
    DocumentDetailData,
    DocumentDetailResponse,
    DocumentPublishData,
    DocumentPublishResponse,
    DocumentUploadData,
    DocumentUploadResponse,
)
from app.services import document as document_service

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


@router.post("/documents", response_model=DocumentUploadResponse)
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentUploadResponse:
    filename = file.filename or "document.txt"
    content = await file.read()
    if not content:
        raise AppError("Uploaded file is empty", code="empty_upload", status_code=422)

    document = await document_service.create_upload_stub(
        session,
        filename=filename,
        content=content,
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
            collection=document.collection,
        ),
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
