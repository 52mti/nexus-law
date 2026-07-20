import asyncio
import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.models import Base
from app.db.session import get_db_session
from app.main import app
from app.services.agent import AgentService, AgentStreamEvent
from app.utils.sse import format_sse


def test_format_sse() -> None:
    frame = format_sse("token", {"content": "hi"})
    assert frame.startswith("event: token\n")
    assert "data: " in frame
    payload = json.loads(frame.split("data: ", 1)[1].strip())
    assert payload["event"] == "token"
    assert payload["data"]["content"] == "hi"


@pytest.fixture
async def client(tmp_path):
    db_path = tmp_path / "stream.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db_session():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db_session] = override_get_db_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_agents_run_stream_endpoint(client: AsyncClient) -> None:
    from app.services.agent import get_agent_service

    mock_service = MagicMock()

    async def fake_stream(*_args, **_kwargs):
        yield AgentStreamEvent(
            event="token",
            data={"conversation_id": "c1", "content": "Hello"},
        )
        yield AgentStreamEvent(
            event="tool_start",
            data={"conversation_id": "c1", "name": "calculator", "args": {"expression": "1+1"}},
        )
        yield AgentStreamEvent(
            event="tool_end",
            data={"conversation_id": "c1", "name": "calculator", "result": "2"},
        )
        yield AgentStreamEvent(
            event="final",
            data={
                "conversation_id": "c1",
                "answer": "Hello 2",
                "model": "gpt-4o-mini",
                "latency_ms": 1.0,
                "iterations": 2,
                "tool_trace": None,
            },
        )

    mock_service.stream = fake_stream
    app.dependency_overrides[get_agent_service] = lambda: mock_service

    async with client.stream(
        "POST",
        "/api/v1/agents/run/stream",
        json={"input": "hi", "debug": True},
    ) as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        body = ""
        async for chunk in response.aiter_text():
            body += chunk

    assert "event: token" in body
    assert "event: tool_start" in body
    assert "event: tool_end" in body
    assert "event: final" in body


@pytest.mark.asyncio
async def test_agent_service_stream_cancel(tmp_path) -> None:
    db_path = tmp_path / "cancel.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def fake_astream_events(*_args, **_kwargs):
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": MagicMock(content="A")},
            "metadata": {"langgraph_node": "agent"},
            "name": "ChatOpenAI",
        }
        await asyncio.sleep(0)
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": MagicMock(content="B")},
            "metadata": {"langgraph_node": "agent"},
            "name": "ChatOpenAI",
        }

    class FakeStream:
        def __init__(self):
            self._agen = fake_astream_events()
            self.closed = False

        def __aiter__(self):
            return self

        async def __anext__(self):
            return await self._agen.__anext__()

        async def aclose(self):
            self.closed = True

    fake_stream = FakeStream()
    graph = MagicMock()
    graph.astream_events = MagicMock(return_value=fake_stream)

    service = AgentService(graph=graph)
    cancel_event = asyncio.Event()
    events: list[str] = []

    async with session_factory() as session:
        async for item in service.stream(
            session,
            user_input="stream please",
            user_external_id="stream-user",
            cancel_event=cancel_event,
        ):
            events.append(item.event)
            cancel_event.set()
        await session.commit()

    assert "token" in events
    assert "final" not in events
    assert fake_stream.closed is True
    await engine.dispose()


@pytest.mark.asyncio
async def test_agent_service_stream_happy_path(tmp_path) -> None:
    db_path = tmp_path / "happy.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def fake_astream_events(*_args, **_kwargs):
        yield {
            "event": "on_tool_start",
            "name": "get_current_time",
            "data": {"input": {}},
            "metadata": {"langgraph_node": "tools"},
        }
        yield {
            "event": "on_tool_end",
            "name": "get_current_time",
            "data": {"output": ToolMessage(content="2026-07-21T00:00:00+00:00", tool_call_id="t1")},
            "metadata": {"langgraph_node": "tools"},
        }
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": MagicMock(content="Now ")},
            "metadata": {"langgraph_node": "agent"},
        }
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": MagicMock(content="UTC.")},
            "metadata": {"langgraph_node": "agent"},
        }
        yield {
            "event": "on_chain_end",
            "name": "LangGraph",
            "data": {
                "output": {
                    "messages": [
                        HumanMessage(content="time?"),
                        AIMessage(
                            content="",
                            tool_calls=[
                                {
                                    "name": "get_current_time",
                                    "args": {},
                                    "id": "t1",
                                    "type": "tool_call",
                                }
                            ],
                        ),
                        ToolMessage(content="2026-07-21T00:00:00+00:00", tool_call_id="t1"),
                        AIMessage(content="Now UTC."),
                    ],
                    "iteration": 2,
                }
            },
            "metadata": {},
        }

    class FakeStream:
        def __init__(self):
            self._agen = fake_astream_events()

        def __aiter__(self):
            return self

        async def __anext__(self):
            return await self._agen.__anext__()

        async def aclose(self):
            return None

    graph = MagicMock()
    graph.astream_events = MagicMock(return_value=FakeStream())
    service = AgentService(graph=graph)

    events = []
    async with session_factory() as session:
        async for item in service.stream(
            session,
            user_input="What time is it?",
            user_external_id="happy-user",
            debug=True,
        ):
            events.append(item)
        await session.commit()

    names = [e.event for e in events]
    assert names == ["tool_start", "tool_end", "token", "token", "final"]
    assert events[-1].data["answer"] == "Now UTC."
    await engine.dispose()
