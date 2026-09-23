from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.biz import BizCode, BizError
from app.db.models import Conversation, Message, User

TITLE_MAX_LENGTH = 255


def preview_title(text: str) -> str:
    normalized = text.strip()
    if len(normalized) <= TITLE_MAX_LENGTH:
        return normalized
    return normalized[:TITLE_MAX_LENGTH]


async def get_active_user(session: AsyncSession, user_id: str) -> User:
    result = await session.execute(
        select(User).where(User.id == user_id, User.is_deleted.is_(False))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise BizError(BizCode.USER_NOT_FOUND, "用户不存在")
    return user


async def create_conversation(
    session: AsyncSession,
    *,
    user_id: str,
    title: str | None = None,
    agent_id: str | None = None,
) -> Conversation:
    await get_active_user(session, user_id)
    conversation = Conversation(
        user_id=user_id,
        title=preview_title(title) if title else None,
        agent_id=agent_id,
    )
    session.add(conversation)
    await session.flush()
    return conversation


async def sync_conversation_preview(
    session: AsyncSession,
    conversation: Conversation,
    *,
    title: str | None = None,
    content: str | None = None,
) -> None:
    if title is not None:
        conversation.title = preview_title(title)
    if content is not None:
        conversation.content = content
    await session.flush()


async def list_conversations(
    session: AsyncSession,
    *,
    user_id: str,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Conversation], int]:
    filters = [
        Conversation.is_deleted.is_(False),
        Conversation.user_id == user_id,
    ]
    total = int(
        (
            await session.execute(
                select(func.count()).select_from(Conversation).where(*filters)
            )
        ).scalar_one()
    )
    stmt = (
        select(Conversation)
        .where(*filters)
        .order_by(Conversation.created_at.desc(), Conversation.id.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all()), total


async def get_conversation(
    session: AsyncSession,
    conversation_id: str,
    *,
    user_id: str | None = None,
    with_messages: bool = False,
) -> Conversation:
    stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.is_deleted.is_(False),
    )
    if with_messages:
        stmt = stmt.options(selectinload(Conversation.messages))
    result = await session.execute(stmt)
    conversation = result.scalar_one_or_none()
    if not conversation or (user_id and conversation.user_id != user_id):
        raise BizError(BizCode.CONVERSATION_NOT_FOUND, "会话不存在")
    return conversation


async def get_conversation_messages(
    session: AsyncSession,
    conversation_id: str,
    *,
    user_id: str | None = None,
) -> list[Message]:
    conversation = await get_conversation(
        session,
        conversation_id,
        user_id=user_id,
        with_messages=True,
    )
    return list(conversation.messages)


async def delete_conversation(
    session: AsyncSession,
    *,
    conversation_id: str,
    user_id: str,
) -> dict[str, str]:
    conv_id = (conversation_id or "").strip()
    if not conv_id:
        raise BizError(BizCode.INVALID_PARAMS, "请指定会话")

    result = await session.execute(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.is_deleted.is_(False),
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise BizError(BizCode.CONVERSATION_NOT_FOUND, "会话不存在或已删除")
    if conversation.user_id != user_id:
        raise BizError(BizCode.FORBIDDEN, "无权删除该会话")

    now = datetime.now(UTC)
    conversation.is_deleted = True
    await session.execute(
        update(Message)
        .where(
            Message.conversation_id == conversation.id,
            Message.is_deleted.is_(False),
        )
        .values(is_deleted=True, updated_at=now)
    )
    await session.flush()
    return {"id": conversation.id}


async def update_conversation_title(
    session: AsyncSession,
    *,
    conversation_id: str,
    user_id: str,
    title: str,
) -> Conversation:
    normalized = preview_title(title)
    if not normalized:
        raise BizError(BizCode.INVALID_PARAMS, "请填写会话标题")

    conv_id = (conversation_id or "").strip()
    if not conv_id:
        raise BizError(BizCode.INVALID_PARAMS, "请指定会话")

    result = await session.execute(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.is_deleted.is_(False),
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise BizError(BizCode.CONVERSATION_NOT_FOUND, "会话不存在或已删除")
    if conversation.user_id != user_id:
        raise BizError(BizCode.FORBIDDEN, "无权修改该会话")

    conversation.title = normalized
    conversation.title_locked = True
    await session.flush()
    return conversation
