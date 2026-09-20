from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.biz import BizCode
from app.core.config import Settings, get_settings
from app.core.jwt import create_access_token
from app.db.models import Base, Conversation, Message, MessageRole, User
from app.db.session import get_db_session
from app.main import app
from app.services import conversation as conversation_service
from app.services.conversation import TITLE_MAX_LENGTH, preview_title

CONVERSATION_JWT_SECRET = "test-jwt-secret-conversations-ok"


@pytest.fixture
async def client(tmp_path):
    get_settings.cache_clear()
    test_settings = Settings(
        jwt_secret=CONVERSATION_JWT_SECRET,
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
    patches = [
        patch("app.api.deps.get_settings", return_value=test_settings),
        patch("app.api.v1.users.get_settings", return_value=test_settings),
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
        user = User(nickname="owner", external_id="user-001")
        session.add(user)
        await session.flush()
        conversation = await conversation_service.create_conversation(
            session,
            title="劳动纠纷咨询",
            user_id=user.id,
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
        user_id = user.id
        await session.commit()

    headers = {"Authorization": f"Bearer {_issue_token(user_id)}"}
    list_resp = await http.get(
        "/api/v1/conversations",
        params={"current": 1, "size": 10},
        headers=headers,
    )
    assert list_resp.status_code == 200
    body = list_resp.json()
    assert body["code"] == 0
    page = body["data"]
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

    msg_resp = await http.get(
        f"/api/v1/conversations/{conversation_id}/messages",
        headers=headers,
    )
    assert msg_resp.status_code == 200
    messages = msg_resp.json()["data"]
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_list_conversations_pages_do_not_overlap(client) -> None:
    http, session_factory = client
    async with session_factory() as session:
        user = User(nickname="pager")
        session.add(user)
        await session.flush()
        ids: list[str] = []
        for index in range(15):
            conversation = await conversation_service.create_conversation(
                session,
                title=f"会话 {index}",
                user_id=user.id,
            )
            ids.append(conversation.id)
        user_id = user.id
        await session.commit()

    headers = {"Authorization": f"Bearer {_issue_token(user_id)}"}
    first = await http.get(
        "/api/v1/conversations",
        params={"current": 1, "size": 10},
        headers=headers,
    )
    second = await http.get(
        "/api/v1/conversations",
        params={"current": 2, "size": 10},
        headers=headers,
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
        params={"current": 3, "size": 10},
        headers=headers,
    )
    assert empty.json()["data"]["records"] == []
    assert empty.json()["data"]["pages"] == 2


@pytest.mark.asyncio
async def test_messages_not_found(client) -> None:
    http, session_factory = client
    async with session_factory() as session:
        user = User(nickname="viewer")
        session.add(user)
        await session.commit()
        user_id = user.id

    missing = await http.get(
        "/api/v1/conversations/missing-id/messages",
        headers={"Authorization": f"Bearer {_issue_token(user_id)}"},
    )
    assert missing.status_code == 200
    body = missing.json()
    assert body["code"] == BizCode.CONVERSATION_NOT_FOUND

    unauth = await http.get("/api/v1/conversations/missing-id/messages")
    assert unauth.status_code == 200
    assert unauth.json()["code"] == BizCode.UNAUTHORIZED


def _issue_token(user_id: str) -> str:
    return create_access_token(
        user_id,
        "normal",
        settings=Settings(
            jwt_secret=CONVERSATION_JWT_SECRET,
            api_keys="",
            auth_enabled=False,
            trust_kong_headers=False,
            rate_limit_enabled=False,
        ),
    )


@pytest.mark.asyncio
async def test_delete_conversation_logical(client) -> None:
    http, session_factory = client
    async with session_factory() as session:
        user = User(nickname="owner")
        session.add(user)
        await session.flush()
        conversation = Conversation(user_id=user.id, title="可删除会话")
        session.add(conversation)
        await session.flush()
        session.add(
            Message(
                conversation_id=conversation.id,
                role=MessageRole.USER.value,
                content="你好",
            )
        )
        user_id = user.id
        conversation_id = conversation.id
        await session.commit()

    token = _issue_token(user_id)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await http.post(
        "/api/v1/conversation/delete",
        json={"conversation_id": conversation_id},
        headers=headers,
    )
    body = resp.json()
    assert resp.status_code == 200
    assert body["code"] == 0
    assert body["data"]["id"] == conversation_id

    list_resp = await http.get(
        "/api/v1/conversations",
        params={"current": 1, "size": 10},
        headers=headers,
    )
    assert list_resp.json()["data"]["records"] == []

    async with session_factory() as session:
        stored = await session.get(Conversation, conversation_id)
        assert stored is not None
        assert stored.is_deleted is True
        result = await session.execute(
            select(Message).where(Message.conversation_id == conversation_id)
        )
        rows = list(result.scalars().all())
        assert rows
        assert all(item.is_deleted for item in rows)

    again = await http.post(
        "/api/v1/conversation/delete",
        json={"conversation_id": conversation_id},
        headers=headers,
    )
    assert again.json()["code"] == BizCode.CONVERSATION_NOT_FOUND


@pytest.mark.asyncio
async def test_delete_conversation_rejects_other_user(client) -> None:
    http, session_factory = client
    async with session_factory() as session:
        owner = User(nickname="owner")
        other = User(nickname="other")
        session.add_all([owner, other])
        await session.flush()
        conversation = Conversation(user_id=owner.id, title="别人的会话")
        session.add(conversation)
        await session.commit()
        owner_id = owner.id
        other_id = other.id
        conversation_id = conversation.id

    forbidden = await http.post(
        "/api/v1/conversation/delete",
        json={"conversation_id": conversation_id},
        headers={"Authorization": f"Bearer {_issue_token(other_id)}"},
    )
    assert forbidden.json()["code"] == BizCode.FORBIDDEN

    unauth = await http.post(
        "/api/v1/conversation/delete",
        json={"conversation_id": conversation_id},
    )
    assert unauth.status_code == 200
    assert unauth.json()["code"] == BizCode.UNAUTHORIZED

    missing = await http.post(
        "/api/v1/conversation/delete",
        json={"conversation_id": "missing-id-not-found-000000000001"},
        headers={"Authorization": f"Bearer {_issue_token(owner_id)}"},
    )
    assert missing.json()["code"] == BizCode.CONVERSATION_NOT_FOUND


def test_preview_title_truncates() -> None:
    assert preview_title("  劳动纠纷  ") == "劳动纠纷"
    long_title = "问" * (TITLE_MAX_LENGTH + 10)
    assert preview_title(long_title) == "问" * TITLE_MAX_LENGTH
