from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings, get_settings
from app.db.models import Base, Message, MessageRole
from app.db.session import get_db_session
from app.main import app
from app.services import conversation as conversation_service
from app.services.conversation import TITLE_MAX_LENGTH, preview_title


@pytest.fixture
async def client(tmp_path):
    get_settings.cache_clear()
    test_settings = Settings(
        jwt_secret="",
        api_keys="",
        auth_enabled=False,
        trust_kong_headers=False,
        rate_limit_enabled=False,
    )
    db_path = tmp_path / "test.db"
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
    with patch("app.api.deps.get_settings", return_value=test_settings):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac, session_factory

    app.dependency_overrides.clear()
    get_settings.cache_clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_health(client) -> None:
    http, _ = client
    response = await http.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"


@pytest.mark.asyncio
async def test_create_conversation_endpoint_removed(client) -> None:
    http, _ = client
    response = await http.post(
        "/api/v1/conversations",
        json={"title": "劳动纠纷咨询"},
    )
    assert response.status_code == 405


@pytest.mark.asyncio
async def test_list_conversations_and_messages(client) -> None:
    http, session_factory = client
    async with session_factory() as session:
        conversation = await conversation_service.create_conversation(
            session,
            title="劳动纠纷咨询",
            user_external_id="user-001",
        )
        session.add(
            Message(
                conversation_id=conversation.id,
                role=MessageRole.USER.value,
                content="未签劳动合同被辞退怎么办？",
            )
        )
        session.add(
            Message(
                conversation_id=conversation.id,
                role=MessageRole.ASSISTANT.value,
                content="建议先确认用工事实并协商补偿。",
            )
        )
        await conversation_service.sync_conversation_preview(
            session,
            conversation,
            title="未签劳动合同被辞退怎么办？",
            content="建议先确认用工事实并协商补偿。",
        )
        conversation_id = conversation.id
        await session.commit()

    list_resp = await http.get(
        "/api/v1/conversations",
        params={"user_external_id": "user-001", "current": 1, "size": 10},
    )
    assert list_resp.status_code == 200
    page = list_resp.json()["data"]
    rows = page["records"]
    assert page["total"] == 1
    assert page["current"] == 1
    assert page["size"] == 10
    assert page["pages"] == 1
    assert len(rows) == 1
    assert rows[0]["id"] == conversation_id
    assert rows[0]["title"] == "未签劳动合同被辞退怎么办？"
    assert rows[0]["content"] == "建议先确认用工事实并协商补偿。"
    assert "user_id" not in rows[0]

    msg_resp = await http.get(f"/api/v1/conversations/{conversation_id}/messages")
    assert msg_resp.status_code == 200
    messages = msg_resp.json()["data"]
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_list_conversations_pages_do_not_overlap(client) -> None:
    http, session_factory = client
    async with session_factory() as session:
        ids: list[str] = []
        for index in range(15):
            conversation = await conversation_service.create_conversation(
                session,
                title=f"会话 {index}",
                user_external_id="user-page",
            )
            ids.append(conversation.id)
        await session.commit()

    first = await http.get(
        "/api/v1/conversations",
        params={"user_external_id": "user-page", "current": 1, "size": 10},
    )
    second = await http.get(
        "/api/v1/conversations",
        params={"user_external_id": "user-page", "current": 2, "size": 10},
    )
    assert first.status_code == 200
    assert second.status_code == 200
    page1 = first.json()["data"]
    page2 = second.json()["data"]
    assert page1["total"] == 15
    assert page1["pages"] == 2
    assert len(page1["records"]) == 10
    assert len(page2["records"]) == 5
    ids1 = {item["id"] for item in page1["records"]}
    ids2 = {item["id"] for item in page2["records"]}
    assert ids1.isdisjoint(ids2)
    assert ids1 | ids2 == set(ids)

    empty = await http.get(
        "/api/v1/conversations",
        params={"user_external_id": "user-page", "current": 3, "size": 10},
    )
    assert empty.json()["data"]["records"] == []
    assert empty.json()["data"]["pages"] == 2


@pytest.mark.asyncio
async def test_messages_not_found(client) -> None:
    http, _ = client
    response = await http.get("/api/v1/conversations/missing-id/messages")
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "conversation_not_found"


def test_preview_title_truncates() -> None:
    assert preview_title("  劳动纠纷  ") == "劳动纠纷"
    long_title = "问" * (TITLE_MAX_LENGTH + 10)
    assert preview_title(long_title) == "问" * TITLE_MAX_LENGTH
