from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_principal
from app.api.v1.users import AccountContext, require_account
from app.core.biz import ok
from app.core.security import Principal
from app.db.session import get_db_session
from app.schemas.conversation import (
    ConversationDeleteRequest,
    ConversationListResponse,
    ConversationPage,
    ConversationRead,
    MessageListResponse,
    MessageRead,
)
from app.services import conversation as conversation_service

router = APIRouter(prefix="/conversations", tags=["conversations"])
action_router = APIRouter(tags=["conversation"])


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    request: Request,
    user_external_id: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    current: int = Query(default=1, ge=1, description="1-based page number"),
    size: int = Query(default=50, ge=1, le=200, description="page size"),
    _principal: Principal = Depends(require_principal),
    session: AsyncSession = Depends(get_db_session),
) -> ConversationListResponse:
    conversations, total = await conversation_service.list_conversations(
        session,
        user_external_id=user_external_id,
        user_id=user_id,
        limit=size,
        offset=(current - 1) * size,
    )
    pages = (total + size - 1) // size if size else 0
    return ConversationListResponse(
        data=ConversationPage(
            records=[ConversationRead.model_validate(item) for item in conversations],
            total=total,
            current=current,
            size=size,
            pages=pages,
        ),
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


@action_router.post("/conversation/delete")
async def delete_conversation(
    body: ConversationDeleteRequest,
    ctx: AccountContext = Depends(require_account),
) -> dict:
    data = await conversation_service.delete_conversation(
        ctx.session,
        conversation_id=body.conversation_id,
        user_id=ctx.user.id,
    )
    return ok(data, "会话已删除")
