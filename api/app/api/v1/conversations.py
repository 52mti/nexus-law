from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_principal
from app.core.prompt_guard import assert_safe_user_text
from app.core.security import Principal
from app.db.session import get_db_session
from app.schemas.conversation import (
    ConversationCreate,
    ConversationCreateResponse,
    ConversationCreateResult,
    ConversationListResponse,
    ConversationRead,
    MessageListResponse,
    MessageRead,
)
from app.services import conversation as conversation_service

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationCreateResponse)
async def create_conversation(
    payload: ConversationCreate,
    request: Request,
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> ConversationCreateResponse:
    if payload.initial_message:
        assert_safe_user_text(payload.initial_message)
    conversation, messages = await conversation_service.create_conversation(
        session,
        title=payload.title,
        user_external_id=payload.user_external_id,
        email=payload.email,
        initial_message=payload.initial_message,
    )
    return ConversationCreateResponse(
        data=ConversationCreateResult(
            conversation=ConversationRead.model_validate(conversation),
            messages=[MessageRead.model_validate(m) for m in messages],
        ),
        request_id=getattr(request.state, "request_id", None),
    )


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    request: Request,
    user_external_id: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> ConversationListResponse:
    conversations = await conversation_service.list_conversations(
        session,
        user_external_id=user_external_id,
        user_id=user_id,
        limit=limit,
        offset=offset,
    )
    return ConversationListResponse(
        data=[ConversationRead.model_validate(item) for item in conversations],
        request_id=getattr(request.state, "request_id", None),
    )


@router.get("/{conversation_id}/messages", response_model=MessageListResponse)
async def get_conversation_messages(
    conversation_id: str,
    request: Request,
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> MessageListResponse:
    messages = await conversation_service.get_conversation_messages(session, conversation_id)
    return MessageListResponse(
        data=[MessageRead.model_validate(m) for m in messages],
        request_id=getattr(request.state, "request_id", None),
    )
