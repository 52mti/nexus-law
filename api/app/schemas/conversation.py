from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    user_external_id: str | None = Field(default=None, max_length=128)
    email: str | None = Field(default=None, max_length=255)
    initial_message: str | None = Field(
        default=None,
        description="Optional first user message; assistant reply is a Stage-2 placeholder.",
    )


class ConversationRead(BaseModel):
    id: str
    user_id: str
    title: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageRead(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationCreateResult(BaseModel):
    conversation: ConversationRead
    messages: list[MessageRead] = Field(default_factory=list)


class ConversationListResponse(BaseModel):
    success: bool = True
    data: list[ConversationRead]
    error: None = None
    request_id: str | None = None


class ConversationCreateResponse(BaseModel):
    success: bool = True
    data: ConversationCreateResult
    error: None = None
    request_id: str | None = None


class MessageListResponse(BaseModel):
    success: bool = True
    data: list[MessageRead]
    error: None = None
    request_id: str | None = None
