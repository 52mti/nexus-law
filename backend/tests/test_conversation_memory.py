from types import SimpleNamespace

import pytest
from langchain_core.messages import HumanMessage
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.agents.memory import pending_overflow, trim_history, with_memory_summary
from app.db.models import Base, Conversation, Message, MessageRole, User
from app.services.conversation_memory import (
    normalize_generated_title,
    refresh_memory_summary,
    write_generated_title,
)


def _row(message_id: str, role: str, content: str):
    return SimpleNamespace(id=message_id, role=role, content=content, is_deleted=False)


def test_trim_history_keeps_latest_within_budget() -> None:
    messages = [
        HumanMessage(content="a " * 800, additional_kwargs={"message_id": "1"}),
        HumanMessage(content="latest question", additional_kwargs={"message_id": "3"}),
    ]
    kept = trim_history(messages, max_tokens=20)
    assert [item.additional_kwargs["message_id"] for item in kept] == ["3"]


def test_with_memory_summary_appends_header() -> None:
    prompt = with_memory_summary("系统提示", "当事人咨询辞退补偿")
    assert prompt.startswith("系统提示")
    assert "长期记忆（此前对话摘要）：" in prompt
    assert prompt.endswith("当事人咨询辞退补偿")
    assert with_memory_summary("系统提示", "  ") == "系统提示"


def test_pending_overflow_skips_already_summarized() -> None:
    rows = [
        _row("1", "user", "a " * 800),
        _row("2", "assistant", "b " * 800),
        _row("3", "user", "latest question"),
        _row("4", "assistant", "latest answer"),
    ]
    first = pending_overflow(rows, max_tokens=20, summary_until_message_id=None)
    assert [item.id for item in first] == ["1", "2"]
    second = pending_overflow(rows, max_tokens=20, summary_until_message_id="2")
    assert second == []


def test_normalize_generated_title_limits_length() -> None:
    assert normalize_generated_title("  标题：劳动合同解除补偿咨询  ") == "劳动合同解除补偿咨询"
    assert len(normalize_generated_title("问" * 80)) == 30


@pytest.mark.asyncio
async def test_title_and_summary_jobs(tmp_path) -> None:
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'mem.db'}", future=True)
    factory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with factory() as session:
        user = User(nickname="mem")
        session.add(user)
        await session.flush()
        conversation = Conversation(user_id=user.id, title="临时", title_locked=False)
        session.add(conversation)
        await session.flush()
        session.add_all(
            [
                Message(
                    conversation_id=conversation.id,
                    role=MessageRole.USER.value,
                    content="未签劳动合同被辞退怎么办？",
                ),
                Message(
                    conversation_id=conversation.id,
                    role=MessageRole.ASSISTANT.value,
                    content="可以先固定用工事实，再协商经济补偿。",
                ),
            ]
        )
        conversation_id = conversation.id
        await session.commit()

    async def _title(_prompt: str) -> str:
        return "辞退补偿咨询"

    async with factory() as session:
        await write_generated_title(session, conversation_id, complete=_title)
        await session.commit()

    async with factory() as session:
        stored = await session.get(Conversation, conversation_id)
        assert stored is not None
        assert stored.title == "辞退补偿咨询"
        stored.title_locked = True
        await session.commit()

    async def _blocked(_prompt: str) -> str:
        raise AssertionError("locked title should not call the model")

    async with factory() as session:
        await write_generated_title(session, conversation_id, complete=_blocked)
        await session.commit()
        stored = await session.get(Conversation, conversation_id)
        assert stored is not None
        assert stored.title == "辞退补偿咨询"

    long = "背景 " * 800

    async with factory() as session:
        session.add_all(
            [
                Message(
                    conversation_id=conversation_id,
                    role=MessageRole.USER.value,
                    content=long,
                ),
                Message(
                    conversation_id=conversation_id,
                    role=MessageRole.ASSISTANT.value,
                    content=long,
                ),
            ]
        )
        await session.commit()

    async def _summary(_prompt: str) -> str:
        assert "已有长期记忆" in _prompt
        return "已记录辞退补偿争议。"

    async with factory() as session:
        await refresh_memory_summary(session, conversation_id, complete=_summary, max_tokens=20)
        await session.commit()
        stored = await session.get(Conversation, conversation_id)
        assert stored is not None
        assert stored.memory_summary == "已记录辞退补偿争议。"
        assert stored.summary_until_message_id

    await engine.dispose()
