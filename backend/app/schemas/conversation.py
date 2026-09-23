from datetime import datetime

from pydantic import BaseModel, Field


class ConversationRead(BaseModel):
    id: str
    title: str | None
    content: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageRead(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationPage(BaseModel):
    records: list[ConversationRead]
    total: int
    current: int
    size: int
    pages: int


class ConversationListResponse(BaseModel):
    success: bool = True
    data: ConversationPage
    error: None = None
    request_id: str | None = None


class MessageListResponse(BaseModel):
    success: bool = True
    data: list[MessageRead]
    error: None = None
    request_id: str | None = None


class ConversationDeleteRequest(BaseModel):
    conversation_id: str = Field(min_length=1, max_length=36)


class ConversationTitleUpdateRequest(BaseModel):
    conversation_id: str = Field(min_length=1, max_length=36)
    title: str = Field(min_length=1, max_length=255)
