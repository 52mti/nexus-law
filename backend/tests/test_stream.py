import asyncio
import json
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings, get_settings
from app.core.jwt import create_access_token
from app.db.models import Base, User
from app.db.session import get_db_session
from app.main import app
from app.services.agent import AgentService, AgentStreamEvent, _stream_token_text
from app.utils.sse import format_sse

STREAM_JWT_SECRET = "test-jwt-secret-stream-ok"


def _token(user_id: str) -> str:
    return create_access_token(
        user_id,
        "normal",
        settings=Settings(
            jwt_secret=STREAM_JWT_SECRET,
            api_keys="",
            auth_enabled=True,
            rate_limit_enabled=False,
        ),
    )


def test_format_sse() -> None:
    token_frame = format_sse("token", "hi")
    assert token_frame.startswith("event: token\n")
    token_payload = json.loads(token_frame.split("data: ", 1)[1].strip())
    assert token_payload == {"event": "token", "data": "hi"}

    meta_frame = format_sse(
        "conversation_meta",
        {"conversation_id": "c1", "request_id": "r1", "model": "gpt-4o-mini"},
    )
    meta_payload = json.loads(meta_frame.split("data: ", 1)[1].strip())
    assert meta_payload["event"] == "conversation_meta"
    assert meta_payload["data"]["conversation_id"] == "c1"
    assert meta_payload["data"]["request_id"] == "r1"


@pytest.fixture
async def client(tmp_path):
    get_settings.cache_clear()
    test_settings = Settings(
        jwt_secret=STREAM_JWT_SECRET,
        api_keys="",
        auth_enabled=True,
        trust_kong_headers=False,
        rate_limit_enabled=False,
    )
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
    patches = [
        patch("app.api.deps.get_settings", return_value=test_settings),
        patch("app.core.jwt.get_settings", return_value=test_settings),
        patch("app.services.account.get_settings", return_value=test_settings),
    ]
    for item in patches:
        item.start()
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac, session_factory
    finally:
        for item in patches:
            item.stop()
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        await engine.dispose()


@pytest.mark.asyncio
async def test_agents_run_stream_endpoint(client) -> None:
    from app.services.agent import get_agent_service

    http, session_factory = client
    async with session_factory() as session:
        user = User(nickname="streamer")
        session.add(user)
        await session.commit()
        user_id = user.id

    mock_service = MagicMock()

    async def fake_stream(*_args, **_kwargs):
        yield AgentStreamEvent(
            event="conversation_meta",
            data={"conversation_id": "c1", "title": "hi", "model": "gpt-4o-mini"},
        )
        yield AgentStreamEvent(event="token", data="Hello")
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

    async with http.stream(
        "POST",
        "/api/v1/agents/run/stream",
        json={"input": "hi", "debug": True},
        headers={"Authorization": f"Bearer {_token(user_id)}"},
    ) as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        body = ""
        async for chunk in response.aiter_text():
            body += chunk

    assert "event: conversation_meta" in body
    assert "event: token" in body
    assert "event: tool_start" in body
    assert "event: tool_end" in body
    assert "event: final" in body

    frames = [
        json.loads(part.split("data: ", 1)[1].strip())
        for part in body.strip().split("\n\n")
        if "data: " in part
    ]
    assert frames[0]["event"] == "conversation_meta"
    assert frames[0]["data"]["conversation_id"] == "c1"
    assert "request_id" in frames[0]["data"]
    token_frame = next(item for item in frames if item["event"] == "token")
    assert token_frame["data"] == "Hello"


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
        user = User(nickname="stream-user")
        session.add(user)
        await session.flush()
        async for item in service.stream(
            session,
            user_input="stream please",
            user_id=user.id,
            cancel_event=cancel_event,
        ):
            events.append(item.event)
            if item.event == "token":
                cancel_event.set()
        await session.commit()

    assert events[0] == "conversation_meta"
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
        user = User(nickname="happy-user")
        session.add(user)
        await session.flush()
        async for item in service.stream(
            session,
            user_input="What time is it?",
            user_id=user.id,
            debug=True,
        ):
            events.append(item)
        await session.commit()

    names = [e.event for e in events]
    assert names == ["conversation_meta", "tool_start", "tool_end", "token", "token", "final"]
    assert events[0].data["conversation_id"]
    assert events[-3].data == "Now "
    assert events[-2].data == "UTC."
    assert events[-1].data["answer"] == "Now UTC."
    await engine.dispose()


def test_stream_token_text_supports_content_blocks() -> None:
    class Chunk:
        def __init__(self, content: object, text: str | None = None) -> None:
            self.content = content
            self.text = text

    assert _stream_token_text(Chunk("hello", text="hello")) == "hello"
    assert _stream_token_text(Chunk([{"type": "text", "text": "合同"}])) == "合同"
    assert _stream_token_text(Chunk([{"type": "tool_call_chunk", "args": "{}"}])) == ""
    assert _stream_token_text(None) == ""
