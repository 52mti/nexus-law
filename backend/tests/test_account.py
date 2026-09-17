from datetime import UTC, datetime
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.biz import BizCode
from app.core.config import Settings, get_settings
from app.db.models import Base
from app.db.session import get_db_session
from app.main import app
from app.services.cos_storage import CosUploadResult


@pytest.fixture
async def client(tmp_path):
    get_settings.cache_clear()
    settings = Settings(
        jwt_secret="test-jwt-secret-account-module-ok",
        debug=True,
        auth_enabled=False,
        rate_limit_enabled=False,
        cos_enabled=True,
        cos_secret_id="sid",
        cos_secret_key="skey",
        cos_region="ap-guangzhou",
        cos_bucket="demo-1250000000",
        cos_key_prefix="documents/",
        cos_avatar_prefix="avatars/",
    )
    db_path = tmp_path / "account.db"
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
        patch("app.services.account.get_settings", return_value=settings),
        patch("app.api.v1.users.get_settings", return_value=settings),
        patch("app.core.jwt.get_settings", return_value=settings),
        patch("app.services.cos_storage.get_settings", return_value=settings),
    ]
    for item in patches:
        item.start()
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    finally:
        for item in patches:
            item.stop()
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        await engine.dispose()


async def _register(client: AsyncClient, phone: str = "13800138000") -> dict:
    code_resp = await client.post(
        "/api/v1/auth/send_code",
        json={"scene": "register", "phone": phone},
    )
    assert code_resp.status_code == 200
    assert code_resp.json()["code"] == 0
    sms_code = code_resp.json()["data"]["code"]
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "phone": phone,
            "code": sms_code,
            "password": "Passw0rd!",
            "nickname": "测试用户",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    return body["data"]


@pytest.mark.asyncio
async def test_register_login_profile(client: AsyncClient) -> None:
    data = await _register(client)
    token = data["access_token"]
    assert data["user"]["phone"] == "13800138000"
    assert "user" in data["user"]["role_codes"]

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"login_type": "password", "phone": "13800138000", "password": "Passw0rd!"},
    )
    assert login_resp.json()["code"] == 0

    profile = await client.get(
        "/api/v1/user/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile.json()["code"] == 0
    assert profile.json()["data"]["nickname"] == "测试用户"


@pytest.mark.asyncio
async def test_duplicate_register(client: AsyncClient) -> None:
    await _register(client)
    again = await client.post(
        "/api/v1/auth/send_code",
        json={"scene": "register", "phone": "13800138000"},
    )
    assert again.json()["code"] == BizCode.PHONE_REGISTERED


@pytest.mark.asyncio
async def test_profile_requires_login(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/user/profile")
    assert resp.status_code == 200
    assert resp.json()["code"] == BizCode.UNAUTHORIZED


@pytest.mark.asyncio
async def test_reset_and_change_password(client: AsyncClient) -> None:
    data = await _register(client, phone="13900139000")
    token = data["access_token"]
    code_resp = await client.post(
        "/api/v1/auth/send_code",
        json={"scene": "reset_password", "phone": "13900139000"},
    )
    reset = await client.post(
        "/api/v1/auth/reset_password",
        json={
            "phone": "13900139000",
            "code": code_resp.json()["data"]["code"],
            "new_password": "NewPass12",
        },
    )
    assert reset.json()["code"] == 0

    old_login = await client.post(
        "/api/v1/auth/login",
        json={"login_type": "password", "phone": "13900139000", "password": "Passw0rd!"},
    )
    assert old_login.json()["code"] == BizCode.PASSWORD_WRONG

    new_login = await client.post(
        "/api/v1/auth/login",
        json={"login_type": "password", "phone": "13900139000", "password": "NewPass12"},
    )
    assert new_login.json()["code"] == 0

    changed = await client.post(
        "/api/v1/user/password/update",
        headers={"Authorization": f"Bearer {token}"},
        json={"old_password": "NewPass12", "new_password": "ThirdPass1"},
    )
    assert changed.json()["code"] == 0


@pytest.mark.asyncio
async def test_avatar_upload_uses_avatars_prefix(client: AsyncClient) -> None:
    data = await _register(client, phone="13700137000")
    token = data["access_token"]
    captured: dict[str, str] = {}

    def fake_upload(**kwargs):
        captured["key"] = kwargs["object_key"]
        return CosUploadResult(
            bucket="demo-1250000000",
            region="ap-guangzhou",
            key=kwargs["object_key"],
            url=f"https://demo-1250000000.cos.ap-guangzhou.myqcloud.com/{kwargs['object_key']}",
            etag="abc",
            uploaded_at=datetime.now(UTC),
        )

    with (
        patch("app.services.cos_storage.upload_bytes", side_effect=fake_upload),
        patch("app.services.cos_storage.delete_object"),
    ):
        resp = await client.post(
            "/api/v1/user/avatar/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("me.png", b"fakepngbytes", "image/png")},
        )
    body = resp.json()
    assert body["code"] == 0
    assert captured["key"].startswith("avatars/")
    assert "documents/" not in captured["key"]
    assert body["data"]["avatar_url"].endswith(captured["key"])
