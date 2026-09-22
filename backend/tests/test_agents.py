from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.agents.graph import extract_tool_trace, final_assistant_text
from app.agents.tools.basic import calculator, get_current_time
from app.core.config import Settings, get_settings
from app.core.jwt import create_access_token
from app.db.models import Base, Conversation, User
from app.db.session import get_db_session
from app.main import app
from app.services.agent import AgentRunResult, get_agent_service

AGENT_JWT_SECRET = "test-jwt-secret-agents-ok"


def _token(user_id: str) -> str:
    return create_access_token(
        user_id,
        "normal",
        settings=Settings(
            jwt_secret=AGENT_JWT_SECRET,
            api_keys="",
            auth_enabled=True,
            rate_limit_enabled=False,
        ),
    )


@pytest.fixture
async def client(tmp_path):
    get_settings.cache_clear()
    test_settings = Settings(
        jwt_secret=AGENT_JWT_SECRET,
        api_keys="",
        auth_enabled=True,
        trust_kong_headers=False,
        rate_limit_enabled=False,
    )
    db_path = tmp_path / "agent.db"
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


def test_basic_tools() -> None:
    assert "T" in get_current_time.invoke({})
    assert calculator.invoke({"expression": "15 * 2 + 3"}) == "33"
    assert "Calculator error" in calculator.invoke({"expression": "__import__('os')"})


def test_extract_tool_trace_and_final_text() -> None:
    messages = [
        HumanMessage(content="what time is it?"),
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "get_current_time",
                    "args": {},
                    "id": "call-1",
                    "type": "tool_call",
                }
            ],
        ),
        ToolMessage(content="2026-07-21T00:00:00+00:00", tool_call_id="call-1"),
        AIMessage(content="It is currently 2026-07-21 UTC."),
    ]
    trace = extract_tool_trace(messages)
    assert len(trace) == 1
    assert trace[0]["name"] == "get_current_time"
    assert trace[0]["result"] == "2026-07-21T00:00:00+00:00"
    assert "2026-07-21" in final_assistant_text(messages)


def test_node_trace_records_input_output_latency() -> None:
    from uuid import uuid4

    from app.agents.trace import NodeTraceHandler, compact_node_trace

    handler = NodeTraceHandler()
    run_id = uuid4()
    handler.on_chat_model_start(
        {},
        [[HumanMessage(content="劳动争议怎么处理？")]],
        run_id=run_id,
    )

    class _Gen:
        message = AIMessage(content="请先检索相关法规。")

    class _Resp:
        generations = [[_Gen()]]

    handler.on_chat_model_end(_Resp(), run_id=run_id)
    tool_id = uuid4()
    handler.on_tool_start(
        {"name": "search_documents"},
        '{"query": "labor"}',
        run_id=tool_id,
        inputs={"query": "labor"},
    )
    handler.on_tool_end('{"matches": []}', run_id=tool_id)

    compacted = compact_node_trace(handler.nodes)
    assert compacted[0]["type"] == "agent"
    assert compacted[0]["input"][0]["content"] == "劳动争议怎么处理？"
    assert compacted[0]["output"]["content"] == "请先检索相关法规。"
    assert compacted[0]["latency_ms"] is not None
    assert compacted[1]["type"] == "tool"
    assert compacted[1]["input"] == {"query": "labor"}
    assert compacted[1]["empty_retrieval"] is True
    assert compacted[1]["latency_ms"] is not None


def test_run_timeline_keeps_node_io() -> None:
    from app.services.admin.agent import _run_timeline

    events = _run_timeline(
        [
            {
                "type": "agent",
                "name": "agent",
                "input": [{"role": "human", "content": "hi"}],
                "output": {"role": "ai", "content": "ok"},
                "latency_ms": 11.2,
            },
            {
                "type": "tool",
                "name": "calculator",
                "input": {"expression": "1+1"},
                "output": "2",
                "latency_ms": 3.4,
            },
        ]
    )
    assert [item["type"] for item in events] == ["agent", "tool"]
    assert events[0]["input"][0]["content"] == "hi"
    assert events[1]["output"] == "2"
    assert events[1]["latency_ms"] == 3.4


@pytest.mark.asyncio
async def test_agents_run_persists_messages(client) -> None:
    http, session_factory = client
    async with session_factory() as session:
        user = User(nickname="agent-user")
        session.add(user)
        await session.commit()
        user_id = user.id

    mock_service = AsyncMock()
    mock_service.run.return_value = AgentRunResult(
        conversation_id="conv-1",
        answer="参考答复：请咨询执业律师。",
        model="gpt-4o-mini",
        latency_ms=20.0,
        tool_trace=[
            {
                "tool_call_id": "call-1",
                "name": "calculator",
                "args": {"expression": "1+1"},
                "result": "2",
            }
        ],
        iterations=2,
    )
    app.dependency_overrides[get_agent_service] = lambda: mock_service

    response = await http.post(
        "/api/v1/agents/run",
        json={
            "input": "1+1等于多少？",
            "debug": True,
        },
        headers={"Authorization": f"Bearer {_token(user_id)}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["conversation_id"] == "conv-1"
    assert body["data"]["tool_trace"][0]["name"] == "calculator"
    mock_service.run.assert_awaited_once()


@pytest.mark.asyncio
async def test_agent_service_with_fake_graph(tmp_path) -> None:
    from app.services.agent import AgentService

    db_path = tmp_path / "svc.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    graph = MagicMock()
    graph.ainvoke = AsyncMock(
        side_effect=[
            {
                "messages": [
                    HumanMessage(content="now?"),
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
                    ToolMessage(content="2026-07-21T01:00:00+00:00", tool_call_id="t1"),
                    AIMessage(content="Current UTC time is 2026-07-21T01:00:00+00:00."),
                ],
                "iteration": 2,
                "context": {"max_iterations": 6},
            },
            {
                "messages": [
                    HumanMessage(content="and tomorrow?"),
                    AIMessage(content="Tomorrow is 2026-07-22."),
                ],
                "iteration": 1,
                "context": {"max_iterations": 6},
            },
        ]
    )

    service = AgentService(graph=graph)
    async with session_factory() as session:
        from app.db.models import Agent

        user = User(nickname="u-time")
        session.add(user)
        session.add(
            Agent(
                name="法律问答",
                code="legal_qa",
                graph_code="legal_qa_react",
                is_system=True,
                is_active=True,
                tool_whitelist=["get_current_time"],
                dataset_ids=[],
            )
        )
        await session.flush()
        result = await service.run(
            session,
            user_input="What time is it in UTC?",
            user_id=user.id,
            debug=True,
        )
        follow_up = await service.run(
            session,
            user_input="What about tomorrow?",
            conversation_id=result.conversation_id,
            user_id=user.id,
        )
        user_id = user.id
        await session.commit()

    assert result.conversation_id
    assert "2026-07-21" in result.answer
    assert result.tool_trace[0]["name"] == "get_current_time"
    assert result.iterations == 2
    assert follow_up.conversation_id == result.conversation_id

    async with session_factory() as session:
        stored = await session.get(Conversation, result.conversation_id)
        assert stored is not None
        assert stored.user_id == user_id
        assert stored.agent_id is not None
        assert stored.title == "What about tomorrow?"
        assert stored.content == "Tomorrow is 2026-07-22."
        user_count = int(
            (await session.execute(select(func.count()).select_from(User))).scalar_one()
        )
        assert user_count == 1
        from app.db.models import AgentRun, Message

        runs = list((await session.execute(select(AgentRun))).scalars().all())
        assert len(runs) == 2
        assert runs[0].used_tools is True
        assistant = list(
            (
                await session.execute(
                    select(Message).where(Message.role == "assistant")
                )
            )
            .scalars()
            .all()
        )
        assert assistant
        assert assistant[-1].content == "Tomorrow is 2026-07-22."

    await engine.dispose()
