import pytest
from httpx import AsyncClient

from app.core.biz import BizCode
from tests.admin_helpers import auth_header, make_admin, register_user


@pytest.mark.asyncio
async def test_admin_login_rejects_normal_user(admin_env) -> None:
    client: AsyncClient = admin_env["client"]
    await register_user(client, "13800138000", "普通")
    resp = await client.post(
        "/api/v1/admin/auth/login",
        json={"login_type": "password", "phone": "13800138000", "password": "Passw0rd!"},
    )
    assert resp.status_code == 200
    assert resp.json()["code"] == BizCode.FORBIDDEN


@pytest.mark.asyncio
async def test_admin_login_and_profile(admin_env) -> None:
    client: AsyncClient = admin_env["client"]
    data = await make_admin(admin_env)
    assert "super_admin" in data["user"]["role_codes"]
    assert "user:manage" in data["permission_codes"]
    profile = await client.get(
        "/api/v1/admin/auth/profile",
        headers=auth_header(data["access_token"]),
    )
    assert profile.json()["code"] == 0
    assert profile.json()["data"]["permission_codes"]


@pytest.mark.asyncio
async def test_admin_profile_requires_token(admin_env) -> None:
    client: AsyncClient = admin_env["client"]
    resp = await client.get("/api/v1/admin/auth/profile")
    assert resp.status_code == 200
    assert resp.json()["code"] == BizCode.UNAUTHORIZED


@pytest.mark.asyncio
async def test_c_end_token_without_admin_role_forbidden(admin_env) -> None:
    client: AsyncClient = admin_env["client"]
    data = await register_user(client, "13800138001")
    resp = await client.get(
        "/api/v1/admin/auth/profile",
        headers=auth_header(data["access_token"]),
    )
    assert resp.json()["code"] == BizCode.FORBIDDEN


@pytest.mark.asyncio
async def test_permission_point_forbidden(admin_env) -> None:
    from sqlalchemy import select

    from app.db.models import Role, RolePermission

    client: AsyncClient = admin_env["client"]
    data = await make_admin(admin_env, phone="13800000002", role_codes=["admin"])
    async with admin_env["session_factory"]() as session:
        admin_role = (
            await session.execute(select(Role).where(Role.code == "admin"))
        ).scalar_one()
        binds = list(
            (
                await session.execute(
                    select(RolePermission).where(RolePermission.role_id == admin_role.id)
                )
            )
            .scalars()
            .all()
        )
        for bind in binds:
            bind.is_deleted = True
        await session.commit()
    resp = await client.get(
        "/api/v1/admin/user/list",
        headers=auth_header(data["access_token"]),
    )
    assert resp.json()["code"] == BizCode.FORBIDDEN
