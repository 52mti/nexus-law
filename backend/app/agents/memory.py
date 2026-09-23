"""Short-term token buffer and long-term summary prompt assembly."""

from __future__ import annotations

from collections.abc import Sequence

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.messages.utils import trim_messages

from app.db.models import MessageRole

MEMORY_SUMMARY_HEADER = "长期记忆（此前对话摘要）："


def with_memory_summary(system_prompt: str, summary: str | None) -> str:
    text = (summary or "").strip()
    if not text:
        return system_prompt
    return f"{system_prompt.rstrip()}\n\n{MEMORY_SUMMARY_HEADER}\n{text}"


def history_to_messages(rows: Sequence) -> list[BaseMessage]:
    messages: list[BaseMessage] = []
    for item in rows:
        if getattr(item, "is_deleted", False):
            continue
        role = getattr(item, "role", None)
        content = getattr(item, "content", "") or ""
        extra = {"message_id": getattr(item, "id", None)}
        if role in {MessageRole.USER.value, MessageRole.USER}:
            messages.append(HumanMessage(content=content, additional_kwargs=extra))
        elif role in {MessageRole.ASSISTANT.value, MessageRole.ASSISTANT}:
            messages.append(AIMessage(content=content, additional_kwargs=extra))
    return messages


def trim_history(messages: Sequence[BaseMessage], *, max_tokens: int) -> list[BaseMessage]:
    """Keep the newest messages that fit the token budget (token buffer)."""
    items = list(messages)
    if not items or max_tokens <= 0:
        return []
    return list(
        trim_messages(
            items,
            strategy="last",
            token_counter="approximate",
            max_tokens=max_tokens,
            start_on="human",
            include_system=False,
        )
    )


def pending_overflow(
    rows: Sequence,
    *,
    max_tokens: int,
    summary_until_message_id: str | None,
) -> list:
    """Messages that slid out of the token window and are not in the summary yet."""
    lc_messages = history_to_messages(rows)
    if not lc_messages:
        return []
    kept_ids = {
        message.additional_kwargs.get("message_id")
        for message in trim_history(lc_messages, max_tokens=max_tokens)
    }
    overflow = [
        item
        for item in rows
        if not getattr(item, "is_deleted", False)
        and getattr(item, "role", None) in {MessageRole.USER.value, MessageRole.ASSISTANT.value}
        and getattr(item, "id", None) not in kept_ids
    ]
    if not summary_until_message_id:
        return overflow
    for index, item in enumerate(overflow):
        if item.id == summary_until_message_id:
            return overflow[index + 1 :]
    if any(getattr(item, "id", None) == summary_until_message_id for item in rows):
        return []
    return overflow
