from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AppError
from app.db.models import Conversation, Message, User

TITLE_MAX_LENGTH = 255


def preview_title(text: str) -> str:
    normalized = text.strip()
    if len(normalized) <= TITLE_MAX_LENGTH:
        return normalized
    return normalized[:TITLE_MAX_LENGTH]


async def get_or_create_user(
    session: AsyncSession,
    *,
    external_id: str | None = None,
    email: str | None = None,
) -> User:
    if external_id:
        result = await session.execute(select(User).where(User.external_id == external_id))
        user = result.scalar_one_or_none()
        if user:
            if email and not user.email:
                user.email = email
            return user

    if email:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            if external_id and not user.external_id:
                user.external_id = external_id
            return user

    user = User(external_id=external_id, email=email)
    session.add(user)
    await session.flush()
    return user


async def create_conversation(
    session: AsyncSession,
    *,
    title: str | None = None,
    user_external_id: str | None = None,
    email: str | None = None,
) -> Conversation:
    user = await get_or_create_user(
        session,
        external_id=user_external_id,
        email=email,
    )
    conversation = Conversation(
        user_id=user.id,
        title=preview_title(title) if title else None,
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
    user_external_id: str | None = None,
    user_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Conversation], int]:
    filters = []
    if user_id:
        filters.append(Conversation.user_id == user_id)
    elif user_external_id:
        user_result = await session.execute(
            select(User).where(User.external_id == user_external_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return [], 0
        filters.append(Conversation.user_id == user.id)

    count_stmt = select(func.count()).select_from(Conversation)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = int((await session.execute(count_stmt)).scalar_one())

    stmt = select(Conversation)
    if filters:
        stmt = stmt.where(*filters)
    # Secondary id sort keeps OFFSET pages stable when created_at ties.
    stmt = (
        stmt.order_by(Conversation.created_at.desc(), Conversation.id.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all()), total


async def get_conversation(
    session: AsyncSession,
    conversation_id: str,
    *,
    with_messages: bool = False,
) -> Conversation:
    stmt = select(Conversation).where(Conversation.id == conversation_id)
    if with_messages:
        stmt = stmt.options(selectinload(Conversation.messages))
    result = await session.execute(stmt)
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise AppError(
            "Conversation not found",
            code="conversation_not_found",
            status_code=404,
        )
    return conversation


async def get_conversation_messages(
    session: AsyncSession,
    conversation_id: str,
) -> list[Message]:
    conversation = await get_conversation(session, conversation_id, with_messages=True)
    return list(conversation.messages)
