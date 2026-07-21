from typing import Any

from pydantic import BaseModel, Field


class DocumentIngestData(BaseModel):
    document_id: str
    source: str
    chunk_count: int
    collection: str


class DocumentIngestResponse(BaseModel):
    success: bool = True
    data: DocumentIngestData
    error: None = None
    request_id: str | None = None
