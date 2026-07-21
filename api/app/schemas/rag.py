from pydantic import BaseModel, Field


class DocumentUploadData(BaseModel):
    document_id: str
    source: str
    status: str
    collection: str


class DocumentUploadResponse(BaseModel):
    success: bool = True
    data: DocumentUploadData
    error: None = None
    request_id: str | None = None


class DocumentDetailData(BaseModel):
    document_id: str
    source: str
    title: str | None = None
    status: str
    chunk_count: int
    collection: str
    content_type: str | None = None
    file_extension: str | None = None
    file_size_bytes: int | None = None
    error_message: str | None = None
    storage_status: str | None = None
    oss_url: str | None = None
    oss_key: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class DocumentDetailResponse(BaseModel):
    success: bool = True
    data: DocumentDetailData
    error: None = None
    request_id: str | None = None


class ChunkItem(BaseModel):
    id: str | None = None
    content: str = Field(min_length=1)


class ChunkData(BaseModel):
    id: str
    chunk_index: int
    content: str
    char_count: int | None = None


class ChunkListData(BaseModel):
    document_id: str
    status: str
    chunks: list[ChunkData]


class ChunkListResponse(BaseModel):
    success: bool = True
    data: ChunkListData
    error: None = None
    request_id: str | None = None


class ChunkReplaceRequest(BaseModel):
    chunks: list[ChunkItem] = Field(min_length=1)


class ChunkReplaceResponse(BaseModel):
    success: bool = True
    data: ChunkListData
    error: None = None
    request_id: str | None = None


class DocumentPublishData(BaseModel):
    document_id: str
    status: str
    chunk_count: int
    collection: str


class DocumentPublishResponse(BaseModel):
    success: bool = True
    data: DocumentPublishData
    error: None = None
    request_id: str | None = None
