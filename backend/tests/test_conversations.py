import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.models import Base
from app.db.session import get_db_session
from app.main import app


@pytest.fixture
async def client(tmp_path):
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
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_health(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"


@pytest.mark.asyncio
async def test_create_conversation_with_placeholder_messages(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/conversations",
        json={
            "title": "劳动纠纷咨询",
            "user_external_id": "user-001",
            "initial_message": "未签劳动合同被辞退怎么办？",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    conversation = body["data"]["conversation"]
    messages = body["data"]["messages"]
    assert conversation["title"] == "劳动纠纷咨询"
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"
    assert "Stage 3" in messages[1]["content"]

    list_resp = await client.get(
        "/api/v1/conversations",
        params={"user_external_id": "user-001"},
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1

    msg_resp = await client.get(f"/api/v1/conversations/{conversation['id']}/messages")
    assert msg_resp.status_code == 200
    assert len(msg_resp.json()["data"]) == 2


@pytest.mark.asyncio
async def test_messages_not_found(client: AsyncClient) -> None:
    response = await client.get("/api/v1/conversations/missing-id/messages")
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "conversation_not_found"
