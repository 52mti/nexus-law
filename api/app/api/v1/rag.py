import asyncio

from fastapi import APIRouter, File, Request, UploadFile

from app.core.exceptions import AppError
from app.rag.ingest import SUPPORTED_EXTENSIONS, ingest_document
from app.schemas.rag import DocumentIngestData, DocumentIngestResponse

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/documents", response_model=DocumentIngestResponse)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
) -> DocumentIngestResponse:
    filename = file.filename or "document.txt"
    content = await file.read()
    if not content:
        raise AppError("Uploaded file is empty", code="empty_upload", status_code=422)

    # Weaviate + embeddings are sync; keep event loop free.
    result = await asyncio.to_thread(ingest_document, filename=filename, content=content)
    return DocumentIngestResponse(
        data=DocumentIngestData(
            document_id=result.document_id,
            source=result.source,
            chunk_count=result.chunk_count,
            collection=result.collection,
        ),
        request_id=getattr(request.state, "request_id", None),
    )


@router.get("/supported-types")
async def supported_types(request: Request) -> dict:
    return {
        "success": True,
        "data": {"extensions": sorted(SUPPORTED_EXTENSIONS)},
        "error": None,
        "request_id": getattr(request.state, "request_id", None),
    }
