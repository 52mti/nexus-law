from datetime import datetime

from pydantic import BaseModel


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


class ConversationListResponse(BaseModel):
    success: bool = True
    data: list[ConversationRead]
    error: None = None
    request_id: str | None = None


class MessageListResponse(BaseModel):
    success: bool = True
    data: list[MessageRead]
    error: None = None
    request_id: str | None = None
