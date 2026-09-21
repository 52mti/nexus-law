from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.biz import BizCode
from app.db.models import Order, OrderStatus, Plan, PointLedger, ProductType
from tests.admin_helpers import auth_header, make_admin, register_user


@pytest.mark.asyncio
async def test_plan_order_fulfill_and_ledger(admin_env) -> None:
    client: AsyncClient = admin_env["client"]
    admin = await make_admin(admin_env)
    headers = auth_header(admin["access_token"])
    member = await register_user(client, "13700137000", "买家")

    created = await client.post(
        "/api/v1/admin/plan/create",
        headers=headers,
        json={
            "name": "100积分",
            "type": "points",
            "price": "9.90",
            "benefits": {"points": 100},
            "is_active": True,
        },
    )
    assert created.json()["code"] == 0
    plan_id = created.json()["data"]["id"]

    listed = await client.get("/api/v1/admin/plan/list", headers=headers)
    assert listed.json()["data"]["total"] >= 1

    async with admin_env["session_factory"]() as session:
        order = Order(
            user_id=member["user"]["id"],
            product_type=ProductType.POINTS.value,
            product_id=plan_id,
            amount=Decimal("9.90"),
            status=OrderStatus.PENDING.value,
            channel="mock",
        )
        session.add(order)
        await session.commit()
        order_id = order.id

    ops = await make_admin(admin_env, phone="13800000008", nickname="运营", role_codes=["admin"])
    forbidden = await client.post(
        "/api/v1/admin/order/fulfill",
        headers=auth_header(ops["access_token"]),
        json={"id": order_id},
    )
    assert forbidden.json()["code"] == BizCode.FORBIDDEN

    fulfilled = await client.post(
        "/api/v1/admin/order/fulfill",
        headers=headers,
        json={"id": order_id},
    )
    assert fulfilled.json()["code"] == 0
    assert fulfilled.json()["data"]["status"] == OrderStatus.FULFILLED.value

    again = await client.post(
        "/api/v1/admin/order/fulfill",
        headers=headers,
        json={"id": order_id},
    )
    assert again.json()["code"] == 0
    assert again.json()["data"]["idempotent"] is True

    orders = await client.get(
        "/api/v1/admin/order/list",
        headers=headers,
        params={"user_id": member["user"]["id"]},
    )
    assert orders.json()["code"] == 0
    assert orders.json()["data"]["total"] == 1

    ledger = await client.get(
        "/api/v1/admin/billing/ledger",
        headers=headers,
        params={"user_id": member["user"]["id"]},
    )
    assert ledger.json()["code"] == 0
    assert ledger.json()["data"]["total"] >= 1

    async with admin_env["session_factory"]() as session:
        user_points = (
            await session.execute(select(Plan).where(Plan.id == plan_id))
        ).scalar_one()
        assert user_points is not None
        ledgers = list(
            (
                await session.execute(
                    select(PointLedger).where(PointLedger.user_id == member["user"]["id"])
                )
            )
            .scalars()
            .all()
        )
        assert sum(item.change for item in ledgers) == 100
