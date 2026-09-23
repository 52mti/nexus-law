"""Async summary and title writers used by Celery tasks."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

from langchain_core.messages import HumanMessage
from loguru import logger
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.memory import pending_overflow
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db.models import Conversation, Message, MessageRole
from app.services.conversation import preview_title
from app.services.llm import get_llm_client

CompleteText = Callable[[str], Awaitable[str]]
_TITLE_LIMIT = 30
_SNIPPET_LIMIT = 2000


def normalize_generated_title(raw: str) -> str:
    text = raw.strip()
    if not text:
        return ""
    line = text.splitlines()[0].strip()
    for prefix in ("标题：", "标题:", "Title:", "title:"):
        if line.startswith(prefix):
            line = line[len(prefix) :].strip()
    line = line.strip("\"'“”‘’「」")
    line = " ".join(line.split())
    if len(line) > _TITLE_LIMIT:
        line = line[:_TITLE_LIMIT].rstrip()
    return preview_title(line) if line else ""


def _snippet(content: str) -> str:
    text = content.strip()
    if len(text) <= _SNIPPET_LIMIT:
        return text
    return text[:_SNIPPET_LIMIT].rstrip()


def _role_label(role: str) -> str:
    if role == MessageRole.USER.value:
        return "用户"
    if role == MessageRole.ASSISTANT.value:
        return "助手"
    return role


async def complete_chat_text(prompt: str) -> str:
    model = get_llm_client().build_chat_model(streaming=False, temperature=0.2)
    result = await model.ainvoke([HumanMessage(content=prompt)])
    content = result.content
    if isinstance(content, str):
        return content
    return str(content)


async def _load_messages(session: AsyncSession, conversation_id: str) -> list[Message]:
    result = await session.execute(
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.is_deleted.is_(False),
        )
        .order_by(Message.created_at.asc(), Message.id.asc())
    )
    return list(result.scalars().all())


async def refresh_memory_summary(
    session: AsyncSession,
    conversation_id: str,
    *,
    complete: CompleteText | None = None,
    max_tokens: int | None = None,
) -> None:
    conversation = await session.get(Conversation, conversation_id)
    if conversation is None or conversation.is_deleted:
        return
    rows = await _load_messages(session, conversation_id)
    budget = max_tokens if max_tokens is not None else get_settings().agent_memory_max_tokens
    pending = pending_overflow(
        rows,
        max_tokens=budget,
        summary_until_message_id=conversation.summary_until_message_id,
    )
    if not pending:
        return

    dialogue = "\n".join(
        f"{_role_label(item.role)}：{_snippet(item.content)}" for item in pending
    )
    existing = (conversation.memory_summary or "").strip() or "无"
    prompt = (
        "你是法律咨询会话的记忆整理助手。请把已有长期记忆和新增对话压缩成一段简明中文摘要，"
        "保留当事人、争议焦点、已给出的结论和待办。不要编造。控制在 400 字以内。\n\n"
        f"已有长期记忆：\n{existing}\n\n"
        f"新增对话：\n{dialogue}"
    )
    writer = complete or complete_chat_text
    try:
        summary = (await writer(prompt)).strip()
    except AppError as exc:
        if exc.code == "llm_not_configured":
            logger.warning("memory summary skipped: llm not configured")
            return
        raise
    if not summary:
        return
    conversation.memory_summary = summary
    conversation.summary_until_message_id = pending[-1].id
    await session.flush()


async def write_generated_title(
    session: AsyncSession,
    conversation_id: str,
    *,
    complete: CompleteText | None = None,
) -> None:
    conversation = await session.get(Conversation, conversation_id)
    if conversation is None or conversation.is_deleted or conversation.title_locked:
        return
    rows = await _load_messages(session, conversation_id)
    user_text = next((item.content for item in rows if item.role == MessageRole.USER.value), "")
    assistant_text = next(
        (item.content for item in rows if item.role == MessageRole.ASSISTANT.value),
        "",
    )
    if not user_text.strip() or not assistant_text.strip():
        return
    prompt = (
        "请根据下面的法律咨询首轮对话，生成一个不超过 30 个字的中文会话标题。"
        "只输出标题本身，不要引号或解释。\n\n"
        f"用户：{_snippet(user_text)}\n"
        f"助手：{_snippet(assistant_text)}"
    )
    writer = complete or complete_chat_text
    try:
        raw = await writer(prompt)
    except AppError as exc:
        if exc.code == "llm_not_configured":
            logger.warning("conversation title skipped: llm not configured")
            return
        raise
    title = normalize_generated_title(raw)
    if not title:
        return
    await session.execute(
        update(Conversation)
        .where(
            Conversation.id == conversation_id,
            Conversation.title_locked.is_(False),
            Conversation.is_deleted.is_(False),
        )
        .values(title=title, updated_at=datetime.now(UTC))
    )
    await session.flush()
