from fastapi import APIRouter, Depends, Query

from app.api.deps import AccountContext, require_account
from app.core.biz import ok
from app.schemas.conversation import (
    ConversationDeleteRequest,
    ConversationRead,
    ConversationTitleUpdateRequest,
    MessageRead,
)
from app.services import conversation as conversation_service

router = APIRouter(prefix="/conversations", tags=["conversations"])
action_router = APIRouter(tags=["conversation"])


@router.get("")
async def list_conversations(
    current: int = Query(default=1, ge=1, description="1-based page number"),
    size: int = Query(default=50, ge=1, le=200, description="page size"),
    ctx: AccountContext = Depends(require_account),
) -> dict:
    conversations, total = await conversation_service.list_conversations(
        ctx.session,
        user_id=ctx.user.id,
        limit=size,
        offset=(current - 1) * size,
    )
    pages = (total + size - 1) // size if size else 0
    return ok(
        {
            "records": [
                ConversationRead.model_validate(item).model_dump(mode="json")
                for item in conversations
            ],
            "total": total,
            "current": current,
            "size": size,
            "pages": pages,
        }
    )


@router.get("/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    ctx: AccountContext = Depends(require_account),
) -> dict:
    messages = await conversation_service.get_conversation_messages(
        ctx.session,
        conversation_id,
        user_id=ctx.user.id,
    )
    return ok([MessageRead.model_validate(item).model_dump(mode="json") for item in messages])


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


@action_router.post("/conversation/title/update")
async def update_conversation_title(
    body: ConversationTitleUpdateRequest,
    ctx: AccountContext = Depends(require_account),
) -> dict:
    conversation = await conversation_service.update_conversation_title(
        ctx.session,
        conversation_id=body.conversation_id,
        user_id=ctx.user.id,
        title=body.title,
    )
    payload = ConversationRead.model_validate(conversation).model_dump(mode="json")
    return ok(payload, "会话标题已更新")
