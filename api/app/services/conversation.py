from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AppError
from app.db.models import Conversation, Message, MessageRole, User

PLACEHOLDER_ASSISTANT_REPLY = (
    "（占位回复）已收到你的问题。真实大模型回复将在 Stage 3 接入。"
)


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
    initial_message: str | None = None,
) -> tuple[Conversation, list[Message]]:
    user = await get_or_create_user(
        session,
        external_id=user_external_id,
        email=email,
    )
    conversation = Conversation(user_id=user.id, title=title)
    session.add(conversation)
    await session.flush()

    messages: list[Message] = []
    if initial_message:
        user_msg = Message(
            conversation_id=conversation.id,
            role=MessageRole.USER.value,
            content=initial_message,
        )
        assistant_msg = Message(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT.value,
            content=PLACEHOLDER_ASSISTANT_REPLY,
        )
        session.add_all([user_msg, assistant_msg])
        await session.flush()
        messages = [user_msg, assistant_msg]

    return conversation, messages


async def list_conversations(
    session: AsyncSession,
    *,
    user_external_id: str | None = None,
    user_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Conversation]:
    stmt = select(Conversation).order_by(Conversation.created_at.desc())

    if user_id:
        stmt = stmt.where(Conversation.user_id == user_id)
    elif user_external_id:
        user_result = await session.execute(
            select(User).where(User.external_id == user_external_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return []
        stmt = stmt.where(Conversation.user_id == user.id)

    stmt = stmt.offset(offset).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_conversation_messages(
    session: AsyncSession,
    conversation_id: str,
) -> list[Message]:
    result = await session.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.messages))
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise AppError(
            "Conversation not found",
            code="conversation_not_found",
            status_code=404,
        )
    return list(conversation.messages)
