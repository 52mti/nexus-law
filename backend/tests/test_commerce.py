from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.biz import BizCode
from app.core.config import Settings, get_settings
from app.db.models import Base, Plan, ProductType
from app.db.session import get_db_session
from app.main import app
from app.services.commerce import callback_sign

JWT_SECRET = "test-jwt-secret-commerce-module-ok"
PAY_SECRET = "test-payment-callback-secret"


@pytest.fixture
async def client(tmp_path):
    get_settings.cache_clear()
    settings = Settings(
        jwt_secret=JWT_SECRET,
        debug=True,
        auth_enabled=False,
        rate_limit_enabled=False,
        payment_callback_secret=PAY_SECRET,
    )
    db_path = tmp_path / "commerce.db"
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
        patch("app.services.commerce.get_settings", return_value=settings),
        patch("app.api.deps.get_settings", return_value=settings),
        patch("app.api.v1.commerce.get_settings", return_value=settings),
        patch("app.core.jwt.get_settings", return_value=settings),
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


async def _register(client: AsyncClient, phone: str = "13800138888") -> dict:
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
            "nickname": "买家",
        },
    )
    assert resp.json()["code"] == 0
    return resp.json()["data"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _add_plan(session_factory, **kwargs) -> Plan:
    defaults = {
        "name": "100积分",
        "type": ProductType.POINTS.value,
        "price": Decimal("9.90"),
        "period": None,
        "benefits_json": {"points": 100, "hint": "入门档"},
        "is_active": True,
    }
    defaults.update(kwargs)
    async with session_factory() as session:
        plan = Plan(**defaults)
        session.add(plan)
        await session.commit()
        await session.refresh(plan)
        return plan


@pytest.mark.asyncio
async def test_plan_list_and_points_order(client) -> None:
    http, session_factory = client
    await _add_plan(session_factory)
    auth = await _register(http)
    headers = _auth(auth["access_token"])

    plans = await http.get("/api/v1/plan/list", params={"type": "points"}, headers=headers)
    assert plans.json()["code"] == 0
    records = plans.json()["data"]["records"]
    assert len(records) == 1
    plan_id = records[0]["id"]

    created = await http.post(
        "/api/v1/order/create",
        json={"product_type": "points", "product_id": plan_id, "channel": "mock"},
        headers=headers,
    )
    body = created.json()
    assert body["code"] == 0
    order_id = body["data"]["order"]["id"]
    amount = body["data"]["order"]["amount"]
    sign = callback_sign(PAY_SECRET, order_id=order_id, channel="mock", amount=amount)

    paid = await http.post(
        "/api/v1/payment/callback",
        json={"order_id": order_id, "channel": "mock", "amount": amount, "sign": sign},
    )
    assert paid.json()["code"] == 0
    assert paid.json()["data"]["order"]["status"] == "fulfilled"
    assert paid.json()["data"]["idempotent"] is False

    again = await http.post(
        "/api/v1/payment/callback",
        json={"order_id": order_id, "channel": "mock", "amount": amount, "sign": sign},
    )
    assert again.json()["code"] == 0
    assert again.json()["data"]["idempotent"] is True

    ledger = await http.get("/api/v1/points/ledger", headers=headers)
    data = ledger.json()["data"]
    assert data["summary"]["points"] == 100
    assert data["summary"]["recharge"] == 100
    assert data["records"][0]["type"] == "recharge"
    assert data["records"][0]["change"] == 100

    profile = await http.get("/api/v1/user/profile", headers=headers)
    assert profile.json()["data"]["points"] == 100


@pytest.mark.asyncio
async def test_membership_order_and_renew(client) -> None:
    http, session_factory = client
    plan = await _add_plan(
        session_factory,
        name="月度会员",
        type="membership",
        price=Decimal("66.00"),
        period="month",
        benefits_json={
            "exclusive_group": "membership",
            "gift_points": 1000,
            "features": ["每日赠送积分"],
            "code": "MONTH",
        },
    )
    auth = await _register(http, phone="13900139001")
    headers = _auth(auth["access_token"])

    created = await http.post(
        "/api/v1/order/create",
        json={"product_type": "plan", "product_id": plan.id},
        headers=headers,
    )
    order = created.json()["data"]["order"]
    sign = callback_sign(PAY_SECRET, order_id=order["id"], channel="mock", amount=order["amount"])
    paid = await http.post(
        "/api/v1/payment/callback",
        json={"order_id": order["id"], "channel": "mock", "amount": order["amount"], "sign": sign},
    )
    assert paid.json()["code"] == 0

    current = await http.get("/api/v1/subscription/current", headers=headers)
    sub = current.json()["data"]
    assert sub["status"] == "active"
    assert sub["plan"]["name"] == "月度会员"
    first_expire = datetime.fromisoformat(sub["expire_at"])

    created2 = await http.post(
        "/api/v1/order/create",
        json={"product_type": "plan", "product_id": plan.id},
        headers=headers,
    )
    order2 = created2.json()["data"]["order"]
    sign2 = callback_sign(
        PAY_SECRET,
        order_id=order2["id"],
        channel="mock",
        amount=order2["amount"],
    )
    await http.post(
        "/api/v1/payment/callback",
        json={
            "order_id": order2["id"],
            "channel": "mock",
            "amount": order2["amount"],
            "sign": sign2,
        },
    )
    current2 = await http.get("/api/v1/subscription/current", headers=headers)
    second_expire = datetime.fromisoformat(current2.json()["data"]["expire_at"])
    assert second_expire >= first_expire + timedelta(days=29)

    ledger = await http.get("/api/v1/points/ledger", headers=headers)
    assert ledger.json()["data"]["summary"]["gift"] == 2000


@pytest.mark.asyncio
async def test_order_list_detail_and_authz(client) -> None:
    http, session_factory = client
    plan = await _add_plan(session_factory)
    buyer = await _register(http, phone="13700137001")
    other = await _register(http, phone="13700137002")
    created = await http.post(
        "/api/v1/order/create",
        json={"product_type": "points", "product_id": plan.id},
        headers=_auth(buyer["access_token"]),
    )
    order_id = created.json()["data"]["order"]["id"]

    listed = await http.get("/api/v1/order/list", headers=_auth(buyer["access_token"]))
    assert listed.json()["data"]["total"] == 1
    assert listed.json()["data"]["records"][0]["id"] == order_id

    detail = await http.get(
        "/api/v1/order/detail",
        params={"id": order_id},
        headers=_auth(buyer["access_token"]),
    )
    assert detail.json()["code"] == 0
    assert detail.json()["data"]["id"] == order_id

    forbidden = await http.get(
        "/api/v1/order/detail",
        params={"id": order_id},
        headers=_auth(other["access_token"]),
    )
    assert forbidden.json()["code"] == BizCode.ORDER_NOT_FOUND

    bad_sign = await http.post(
        "/api/v1/payment/callback",
        json={"order_id": order_id, "channel": "mock", "amount": "9.90", "sign": "deadbeef"},
    )
    assert bad_sign.json()["code"] == BizCode.PAYMENT_INVALID


@pytest.mark.asyncio
async def test_notification_list_covers_payment_feature_rebate_refund(client) -> None:
    from app.db.models import NotificationType
    from app.services.notification import create_notification

    http, session_factory = client
    plan = await _add_plan(session_factory, name="100积分")
    auth = await _register(http, phone="13600136001")
    headers = _auth(auth["access_token"])
    user_id = auth["user"]["id"]

    created = await http.post(
        "/api/v1/order/create",
        json={"product_type": "points", "product_id": plan.id, "channel": "mock"},
        headers=headers,
    )
    order = created.json()["data"]["order"]
    sign = callback_sign(PAY_SECRET, order_id=order["id"], channel="mock", amount=order["amount"])
    paid = await http.post(
        "/api/v1/payment/callback",
        json={"order_id": order["id"], "channel": "mock", "amount": order["amount"], "sign": sign},
    )
    assert paid.json()["code"] == 0

    async with session_factory() as session:
        await create_notification(
            session,
            user_id=None,
            ntype=NotificationType.FEATURE_LAUNCH.value,
            title="法规检索上线",
            content="支持按地域检索法规",
        )
        await create_notification(
            session,
            user_id=user_id,
            ntype=NotificationType.REBATE_SUCCESS.value,
            title="分享返利积分成功",
            content="返利到账",
            biz_id="rebate-1",
            extra={"points": 20},
        )
        await create_notification(
            session,
            user_id=user_id,
            ntype=NotificationType.REFUND_SUCCESS.value,
            title="退款成功",
            content="退款到账",
            biz_id=order["id"],
            extra={"amount": order["amount"]},
        )
        await session.commit()

    listed = await http.get("/api/v1/notification/list", headers=headers)
    body = listed.json()
    assert body["code"] == 0
    assert body["data"]["unread"] == 4
    types = {item["type"] for item in body["data"]["records"]}
    assert types == {
        NotificationType.FEATURE_LAUNCH.value,
        NotificationType.PAYMENT_SUCCESS.value,
        NotificationType.REBATE_SUCCESS.value,
        NotificationType.REFUND_SUCCESS.value,
    }
    payment = next(item for item in body["data"]["records"] if item["type"] == "payment_success")
    assert payment["extra"]["amount"] == order["amount"]
    assert payment["extra"]["plan_name"] == "100积分"
    assert payment["is_read"] is False

    again = await http.post(
        "/api/v1/payment/callback",
        json={"order_id": order["id"], "channel": "mock", "amount": order["amount"], "sign": sign},
    )
    assert again.json()["data"]["idempotent"] is True
    listed_again = await http.get("/api/v1/notification/list", headers=headers)
    payment_rows = [
        item for item in listed_again.json()["data"]["records"] if item["type"] == "payment_success"
    ]
    assert len(payment_rows) == 1

    read_one = await http.post(
        "/api/v1/notification/read",
        json={"id_list": [payment["id"]]},
        headers=headers,
    )
    assert read_one.json()["code"] == 0
    assert read_one.json()["data"]["updated"] == 1

    after = await http.get("/api/v1/notification/list", headers=headers)
    assert after.json()["data"]["unread"] == 3
    marked = next(item for item in after.json()["data"]["records"] if item["id"] == payment["id"])
    assert marked["is_read"] is True

    read_all = await http.post("/api/v1/notification/read", json={"id_list": []}, headers=headers)
    assert read_all.json()["data"]["updated"] == 3
    done = await http.get("/api/v1/notification/list", headers=headers)
    assert done.json()["data"]["unread"] == 0
    assert all(item["is_read"] for item in done.json()["data"]["records"])
