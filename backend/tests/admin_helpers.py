from __future__ import annotations

from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings, get_settings
from app.db.models import Agent, Base, Permission, Role, RolePermission, UserRole
from app.db.session import get_db_session
from app.main import app

JWT_SECRET = "test-jwt-secret-admin-module-ok"

PERMISSIONS: list[tuple[str, str, str]] = [
    ("chat:use", "发起智能对话", "api"),
    ("chat:history", "查看历史对话", "api"),
    ("kb:retrieve", "检索知识库", "api"),
    ("kb:manage", "管理知识库", "api"),
    ("prompt:manage", "管理提示词", "api"),
    ("agent:manage", "管理 Agent", "api"),
    ("user:manage", "管理用户与角色", "api"),
    ("order:manage", "管理订单", "api"),
    ("billing:view", "查看消费记录", "api"),
    ("plan:manage", "配置会员套餐", "api"),
    ("points:recharge", "积分充值", "api"),
    ("audit:view", "查看操作日志", "api"),
]

ROLES = [
    ("super_admin", "超级管理员"),
    ("admin", "运营管理员"),
    ("lawyer", "专业律师"),
    ("user", "普通用户"),
]

ADMIN_PERM_CODES = {
    "user:manage",
    "order:manage",
    "billing:view",
    "plan:manage",
    "prompt:manage",
    "kb:manage",
    "agent:manage",
    "chat:history",
    "audit:view",
}
CLIENT_PERM_CODES = {"chat:use", "chat:history", "kb:retrieve", "points:recharge"}


async def seed_rbac(session) -> dict[str, Role]:
    roles: dict[str, Role] = {}
    for code, name in ROLES:
        role = Role(code=code, name=name, description=name)
        session.add(role)
        roles[code] = role
    perms: dict[str, Permission] = {}
    for code, name, perm_type in PERMISSIONS:
        item = Permission(code=code, name=name, type=perm_type)
        session.add(item)
        perms[code] = item
    await session.flush()
    mapping = {
        "super_admin": set(perms),
        "admin": ADMIN_PERM_CODES,
        "lawyer": CLIENT_PERM_CODES,
        "user": CLIENT_PERM_CODES,
    }
    for role_code, codes in mapping.items():
        for code in codes:
            session.add(
                RolePermission(
                    role_id=roles[role_code].id,
                    permission_id=perms[code].id,
                )
            )
    await session.flush()
    return roles


async def seed_default_agent(session) -> Agent:
    agent = Agent(
        name="法律问答",
        code="legal_qa",
        description="默认法律问答 Agent",
        tool_whitelist=["search_documents"],
        dataset_ids=[],
        is_active=True,
    )
    session.add(agent)
    await session.flush()
    return agent


async def register_user(client: AsyncClient, phone: str, nickname: str = "用户") -> dict:
    code_resp = await client.post(
        "/api/v1/auth/send_code",
        json={"scene": "register", "phone": phone},
    )
    sms_code = code_resp.json()["data"]["code"]
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "phone": phone,
            "code": sms_code,
            "password": "Passw0rd!",
            "nickname": nickname,
        },
    )
    body = resp.json()
    assert body["code"] == 0, body
    return body["data"]


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def promote(
    session_factory,
    user_id: str,
    role_ids: dict[str, str],
    codes: list[str],
) -> None:
    async with session_factory() as session:
        current = list(
            (
                await session.execute(select(UserRole).where(UserRole.user_id == user_id))
            ).scalars().all()
        )
        for item in current:
            item.is_deleted = True
        for code in codes:
            session.add(UserRole(user_id=user_id, role_id=role_ids[code]))
        await session.commit()


@pytest.fixture
async def admin_env(tmp_path):
    get_settings.cache_clear()
    settings = Settings(
        jwt_secret=JWT_SECRET,
        debug=True,
        auth_enabled=False,
        rate_limit_enabled=False,
        payment_callback_secret="test-pay-secret",
    )
    db_path = tmp_path / "admin.db"
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
        patch("app.api.deps.get_settings", return_value=settings),
        patch("app.core.jwt.get_settings", return_value=settings),
        patch("app.services.account.get_settings", return_value=settings),
        patch("app.services.admin.auth.get_settings", return_value=settings),
        patch("app.services.commerce.get_settings", return_value=settings),
    ]
    for item in patches:
        item.start()

    async with session_factory() as session:
        roles = await seed_rbac(session)
        agent = await seed_default_agent(session)
        await session.commit()
        role_ids = {code: role.id for code, role in roles.items()}
        agent_id = agent.id

    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield {
                "client": client,
                "session_factory": session_factory,
                "role_ids": role_ids,
                "agent_id": agent_id,
                "settings": settings,
            }
    finally:
        for item in patches:
            item.stop()
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        await engine.dispose()


async def make_admin(
    env: dict,
    *,
    phone: str = "13800000001",
    nickname: str = "超管",
    role_codes: list[str] | None = None,
) -> dict:
    client: AsyncClient = env["client"]
    data = await register_user(client, phone, nickname)
    await promote(
        env["session_factory"],
        data["user"]["id"],
        env["role_ids"],
        role_codes or ["super_admin"],
    )
    login = await client.post(
        "/api/v1/admin/auth/login",
        json={"login_type": "password", "phone": phone, "password": "Passw0rd!"},
    )
    body = login.json()
    assert body["code"] == 0, body
    return body["data"]
