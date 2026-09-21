import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.biz import BizCode
from app.db.models import PointLedger, Role, UserStatus
from tests.admin_helpers import auth_header, make_admin, register_user


@pytest.mark.asyncio
async def test_user_list_assign_points_and_status(admin_env) -> None:
    client: AsyncClient = admin_env["client"]
    admin = await make_admin(admin_env)
    headers = auth_header(admin["access_token"])
    member = await register_user(client, "13900139000", "会员甲")

    listed = await client.get(
        "/api/v1/admin/user/list",
        headers=headers,
        params={"keyword": "会员"},
    )
    assert listed.json()["code"] == 0
    assert listed.json()["data"]["total"] >= 1

    detail = await client.get(
        "/api/v1/admin/user/detail",
        headers=headers,
        params={"id": member["user"]["id"]},
    )
    assert detail.json()["code"] == 0

    adjusted = await client.post(
        "/api/v1/admin/user/points/adjust",
        headers=headers,
        json={"id": member["user"]["id"], "change": 50, "remark": "补偿"},
    )
    assert adjusted.json()["code"] == 0
    assert adjusted.json()["data"]["points"] == 50

    async with admin_env["session_factory"]() as session:
        ledgers = list(
            (
                await session.execute(
                    select(PointLedger).where(PointLedger.user_id == member["user"]["id"])
                )
            )
            .scalars()
            .all()
        )
        assert len(ledgers) == 1
        assert ledgers[0].change == 50

    negative = await client.post(
        "/api/v1/admin/user/points/adjust",
        headers=headers,
        json={"id": member["user"]["id"], "change": -80},
    )
    assert negative.json()["code"] == BizCode.POINTS_INSUFFICIENT

    disabled = await client.post(
        "/api/v1/admin/user/status/update",
        headers=headers,
        json={"id": member["user"]["id"], "status": "disabled"},
    )
    assert disabled.json()["code"] == 0
    assert disabled.json()["data"]["status"] == UserStatus.DISABLED.value


@pytest.mark.asyncio
async def test_cannot_disable_or_demote_last_super_admin(admin_env) -> None:
    client: AsyncClient = admin_env["client"]
    admin = await make_admin(admin_env)
    headers = auth_header(admin["access_token"])
    user_id = admin["user"]["id"]

    disabled = await client.post(
        "/api/v1/admin/user/status/update",
        headers=headers,
        json={"id": user_id, "status": "disabled"},
    )
    assert disabled.json()["code"] == BizCode.LAST_SUPER_ADMIN

    demoted = await client.post(
        "/api/v1/admin/user/roles/assign",
        headers=headers,
        json={"id": user_id, "role_codes": ["admin"]},
    )
    assert demoted.json()["code"] == BizCode.LAST_SUPER_ADMIN


@pytest.mark.asyncio
async def test_role_crud_and_permission_bind(admin_env) -> None:
    client: AsyncClient = admin_env["client"]
    admin = await make_admin(admin_env)
    headers = auth_header(admin["access_token"])

    created = await client.post(
        "/api/v1/admin/role/create",
        headers=headers,
        json={"code": "ops", "name": "运营", "description": "自定义"},
    )
    assert created.json()["code"] == 0
    role_id = created.json()["data"]["id"]

    bound = await client.post(
        "/api/v1/admin/role/permissions/bind",
        headers=headers,
        json={"id": role_id, "permission_codes": ["user:manage", "billing:view"]},
    )
    assert bound.json()["code"] == 0
    assert set(bound.json()["data"]["permission_codes"]) == {"user:manage", "billing:view"}

    async with admin_env["session_factory"]() as session:
        super_role = (
            await session.execute(select(Role).where(Role.code == "super_admin"))
        ).scalar_one()
        super_id = super_role.id
    deleted = await client.post(
        "/api/v1/admin/role/delete",
        headers=headers,
        json={"id": super_id},
    )
    assert deleted.json()["code"] == BizCode.ROLE_PROTECTED

    removed = await client.post(
        "/api/v1/admin/role/delete",
        headers=headers,
        json={"id": role_id},
    )
    assert removed.json()["code"] == 0
