from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.agents.graph import extract_tool_trace, final_assistant_text
from app.agents.tools.basic import calculator, get_current_time
from app.db.models import Base
from app.db.session import get_db_session
from app.main import app
from app.services.agent import AgentRunResult, get_agent_service


@pytest.fixture
async def client(tmp_path):
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
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
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


@pytest.mark.asyncio
async def test_agents_run_persists_messages(client: AsyncClient) -> None:
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

    response = await client.post(
        "/api/v1/agents/run",
        json={
            "input": "1+1等于多少？",
            "user_external_id": "agent-user",
            "debug": True,
        },
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
        return_value={
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
        }
    )

    service = AgentService(graph=graph)
    async with session_factory() as session:
        result = await service.run(
            session,
            user_input="What time is it in UTC?",
            user_external_id="u-time",
            debug=True,
        )
        await session.commit()

    assert result.conversation_id
    assert "2026-07-21" in result.answer
    assert result.tool_trace[0]["name"] == "get_current_time"
    assert result.iterations == 2
    await engine.dispose()
