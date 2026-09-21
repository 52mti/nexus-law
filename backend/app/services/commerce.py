from __future__ import annotations

import hashlib
import hmac
from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.biz import BizCode, BizError
from app.core.config import Settings, get_settings
from app.db.models import (
    Order,
    OrderStatus,
    Plan,
    PointLedger,
    PointLedgerType,
    ProductType,
    Subscription,
    SubscriptionStatus,
    User,
)

PERIOD_DAYS = {
    "day": 1,
    "week": 7,
    "month": 30,
    "quarter": 90,
    "year": 365,
}
LEDGER_TITLE = {
    PointLedgerType.RECHARGE.value: "积分充值",
    PointLedgerType.SUBSCRIBE_GIFT.value: "会员赠送",
    PointLedgerType.CONSUME_CHAT.value: "对话消耗",
    PointLedgerType.REFUND.value: "退款",
    PointLedgerType.ADMIN_ADJUST.value: "管理员调整",
}


def _now() -> datetime:
    return datetime.now(UTC)


def money(value: Decimal | int | str) -> str:
    amount = value if isinstance(value, Decimal) else Decimal(str(value))
    return f"{amount.quantize(Decimal('0.01')):.2f}"


def _parse_amount(value: str | None) -> Decimal | None:
    if value is None or not str(value).strip():
        return None
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError) as exc:
        raise BizError(BizCode.INVALID_PARAMS, "金额格式不正确") from exc


def _benefits(plan: Plan) -> dict[str, Any]:
    raw = plan.benefits_json
    return raw if isinstance(raw, dict) else {}


def _exclusive_group(plan: Plan) -> str:
    group = _benefits(plan).get("exclusive_group")
    if isinstance(group, str) and group.strip():
        return group.strip()
    if plan.type == ProductType.POINTS.value:
        return plan.type
    return "membership"


def _period_delta(period: str | None) -> timedelta:
    key = (period or "month").strip().lower()
    days = PERIOD_DAYS.get(key)
    if not days:
        raise BizError(BizCode.INVALID_PARAMS, "套餐周期不正确")
    return timedelta(days=days)


def page_meta(total: int, current: int, size: int) -> dict[str, int]:
    pages = (total + size - 1) // size if size else 0
    return {"total": total, "current": current, "size": size, "pages": pages}


def callback_sign(
    secret: str,
    *,
    order_id: str,
    channel: str,
    amount: str,
) -> str:
    payload = f"{order_id}\n{channel}\n{amount}"
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def _plan_dump(plan: Plan) -> dict[str, Any]:
    benefits = _benefits(plan)
    return {
        "id": plan.id,
        "name": plan.name,
        "type": plan.type,
        "price": money(plan.price),
        "period": plan.period,
        "is_active": plan.is_active,
        "benefits": {
            "code": benefits.get("code"),
            "hint": benefits.get("hint"),
            "features": benefits.get("features") or [],
            "gift_points": int(benefits.get("gift_points") or 0),
            "points": int(benefits.get("points") or 0),
            "discount_rate": benefits.get("discount_rate"),
            "exclusive_group": _exclusive_group(plan),
        },
    }


def _order_dump(order: Order) -> dict[str, Any]:
    return {
        "id": order.id,
        "product_type": order.product_type,
        "product_id": order.product_id,
        "amount": money(order.amount),
        "status": order.status,
        "channel": order.channel,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


def _ledger_dump(item: PointLedger) -> dict[str, Any]:
    return {
        "id": item.id,
        "change": item.change,
        "balance": item.balance,
        "type": item.type,
        "title": LEDGER_TITLE.get(item.type, item.type),
        "biz_id": item.biz_id,
        "remark": item.remark,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def _subscription_dump(sub: Subscription, plan: Plan | None = None) -> dict[str, Any]:
    plan = plan or sub.plan
    return {
        "id": sub.id,
        "plan_id": sub.plan_id,
        "status": sub.status,
        "start_at": sub.start_at.isoformat() if sub.start_at else None,
        "expire_at": sub.expire_at.isoformat() if sub.expire_at else None,
        "plan": _plan_dump(plan) if plan else None,
    }


async def _lock_user(session: AsyncSession, user_id: str) -> User:
    result = await session.execute(
        select(User).where(User.id == user_id, User.is_deleted.is_(False)).with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user:
        raise BizError(BizCode.USER_NOT_FOUND, "用户不存在")
    return user


async def add_points(
    session: AsyncSession,
    user: User,
    *,
    change: int,
    ledger_type: str,
    biz_id: str | None,
    remark: str | None,
) -> int:
    if change == 0:
        return user.points
    next_balance = user.points + change
    if next_balance < 0:
        raise BizError(BizCode.POINTS_INSUFFICIENT, "积分不足")
    user.points = next_balance
    session.add(
        PointLedger(
            user_id=user.id,
            change=change,
            balance=next_balance,
            type=ledger_type,
            biz_id=biz_id,
            remark=remark,
        )
    )
    await session.flush()
    await session.refresh(user)
    return next_balance


async def list_plans(
    session: AsyncSession,
    *,
    plan_type: str | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [Plan.is_deleted.is_(False), Plan.is_active.is_(True)]
    if plan_type:
        filters.append(Plan.type == plan_type)
    count_stmt = select(func.count()).select_from(Plan).where(*filters)
    total = int((await session.execute(count_stmt)).scalar_one())
    stmt = (
        select(Plan)
        .where(*filters)
        .order_by(Plan.price.asc(), Plan.created_at.asc())
        .offset((current - 1) * size)
        .limit(size)
    )
    rows = list((await session.execute(stmt)).scalars().all())
    return {"records": [_plan_dump(item) for item in rows], **page_meta(total, current, size)}


async def list_ledgers(
    session: AsyncSession,
    *,
    user_id: str,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [PointLedger.user_id == user_id, PointLedger.is_deleted.is_(False)]
    total = int(
        (
            await session.execute(
                select(func.count()).select_from(PointLedger).where(*filters)
            )
        ).scalar_one()
    )
    stmt = (
        select(PointLedger)
        .where(*filters)
        .order_by(PointLedger.created_at.desc(), PointLedger.id.desc())
        .offset((current - 1) * size)
        .limit(size)
    )
    rows = list((await session.execute(stmt)).scalars().all())
    recharge = int(
        (
            await session.execute(
                select(func.coalesce(func.sum(PointLedger.change), 0)).where(
                    *filters,
                    PointLedger.type == PointLedgerType.RECHARGE.value,
                    PointLedger.change > 0,
                )
            )
        ).scalar_one()
    )
    gift = int(
        (
            await session.execute(
                select(func.coalesce(func.sum(PointLedger.change), 0)).where(
                    *filters,
                    PointLedger.type == PointLedgerType.SUBSCRIBE_GIFT.value,
                    PointLedger.change > 0,
                )
            )
        ).scalar_one()
    )
    consume = int(
        (
            await session.execute(
                select(func.coalesce(func.sum(PointLedger.change), 0)).where(
                    *filters,
                    PointLedger.change < 0,
                )
            )
        ).scalar_one()
    )
    user = await session.get(User, user_id)
    return {
        "records": [_ledger_dump(item) for item in rows],
        **page_meta(total, current, size),
        "summary": {
            "points": user.points if user else 0,
            "recharge": recharge,
            "gift": gift,
            "consume": abs(consume),
        },
    }


async def get_current_subscription(session: AsyncSession, user_id: str) -> dict[str, Any] | None:
    result = await session.execute(
        select(Subscription)
        .where(
            Subscription.user_id == user_id,
            Subscription.is_deleted.is_(False),
            Subscription.status == SubscriptionStatus.ACTIVE.value,
        )
        .options(selectinload(Subscription.plan))
        .order_by(Subscription.expire_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return None
    expire_at = sub.expire_at
    if expire_at.tzinfo is None:
        expire_at = expire_at.replace(tzinfo=UTC)
    if expire_at < _now():
        sub.status = SubscriptionStatus.EXPIRED.value
        await session.flush()
        return None
    return _subscription_dump(sub)


async def create_order(
    session: AsyncSession,
    *,
    user_id: str,
    product_type: str,
    product_id: str,
    channel: str | None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    if product_type not in {ProductType.PLAN.value, ProductType.POINTS.value}:
        raise BizError(BizCode.INVALID_PARAMS, "商品类型不正确")
    result = await session.execute(
        select(Plan).where(Plan.id == product_id, Plan.is_deleted.is_(False))
    )
    plan = result.scalar_one_or_none()
    if not plan or not plan.is_active:
        raise BizError(BizCode.PLAN_NOT_FOUND, "套餐不存在或已下架")
    if product_type == ProductType.POINTS.value and plan.type != ProductType.POINTS.value:
        raise BizError(BizCode.INVALID_PARAMS, "请选择积分充值档位")
    if product_type == ProductType.PLAN.value and plan.type == ProductType.POINTS.value:
        raise BizError(BizCode.INVALID_PARAMS, "请选择会员套餐")

    pay_channel = (channel or "mock").strip() or "mock"
    order = Order(
        user_id=user_id,
        product_type=product_type,
        product_id=plan.id,
        amount=plan.price,
        status=OrderStatus.PENDING.value,
        channel=pay_channel,
    )
    session.add(order)
    await session.flush()
    amount = money(order.amount)
    pay: dict[str, Any] = {
        "channel": pay_channel,
        "checkout_url": f"nexus-law://pay/{order.id}",
        "amount": amount,
    }
    if settings.debug or not settings.payment_callback_secret.strip():
        pay["sign"] = callback_sign(
            settings.payment_callback_secret or "debug-payment-secret",
            order_id=order.id,
            channel=pay_channel,
            amount=amount,
        )
    return {"order": _order_dump(order), "pay": pay, "plan": _plan_dump(plan)}


async def list_orders(
    session: AsyncSession,
    *,
    user_id: str,
    current: int = 1,
    size: int = 20,
    status: str | None = None,
) -> dict[str, Any]:
    filters = [Order.user_id == user_id, Order.is_deleted.is_(False)]
    if status:
        filters.append(Order.status == status)
    total = int(
        (
            await session.execute(select(func.count()).select_from(Order).where(*filters))
        ).scalar_one()
    )
    stmt = (
        select(Order)
        .where(*filters)
        .order_by(Order.created_at.desc(), Order.id.desc())
        .offset((current - 1) * size)
        .limit(size)
    )
    rows = list((await session.execute(stmt)).scalars().all())
    return {"records": [_order_dump(item) for item in rows], **page_meta(total, current, size)}


async def get_order_detail(
    session: AsyncSession,
    *,
    order_id: str,
    user_id: str,
) -> dict[str, Any]:
    result = await session.execute(
        select(Order).where(
            Order.id == order_id,
            Order.is_deleted.is_(False),
        )
    )
    order = result.scalar_one_or_none()
    if not order or order.user_id != user_id:
        raise BizError(BizCode.ORDER_NOT_FOUND, "订单不存在")
    plan_result = await session.execute(
        select(Plan).where(Plan.id == order.product_id, Plan.is_deleted.is_(False))
    )
    plan = plan_result.scalar_one_or_none()
    data = _order_dump(order)
    data["plan"] = _plan_dump(plan) if plan else None
    return data


async def _activate_subscription(session: AsyncSession, user: User, plan: Plan) -> Subscription:
    group = _exclusive_group(plan)
    result = await session.execute(
        select(Subscription)
        .where(
            Subscription.user_id == user.id,
            Subscription.is_deleted.is_(False),
            Subscription.status == SubscriptionStatus.ACTIVE.value,
        )
        .options(selectinload(Subscription.plan))
    )
    current_subs = list(result.scalars().all())
    delta = _period_delta(plan.period)
    now = _now()
    for sub in current_subs:
        other = sub.plan
        if other and _exclusive_group(other) == group:
            base = sub.expire_at
            if base.tzinfo is None:
                base = base.replace(tzinfo=UTC)
            sub.expire_at = max(base, now) + delta
            sub.plan_id = plan.id
            await session.flush()
            return sub

    sub = Subscription(
        user_id=user.id,
        plan_id=plan.id,
        start_at=now,
        expire_at=now + delta,
        status=SubscriptionStatus.ACTIVE.value,
    )
    session.add(sub)
    await session.flush()
    return sub


async def fulfill_order(session: AsyncSession, order: Order) -> None:
    """Apply points / membership. Safe to call after status is paid. Idempotent via order status."""
    if order.status == OrderStatus.FULFILLED.value:
        return
    plan_result = await session.execute(
        select(Plan).where(Plan.id == order.product_id, Plan.is_deleted.is_(False))
    )
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise BizError(BizCode.PLAN_NOT_FOUND, "套餐不存在")
    user = await _lock_user(session, order.user_id)
    benefits = _benefits(plan)

    if order.product_type == ProductType.POINTS.value:
        points = int(benefits.get("points") or benefits.get("gift_points") or 0)
        if points <= 0:
            raise BizError(BizCode.PRODUCT_UNAVAILABLE, "积分档位未配置额度")
        await add_points(
            session,
            user,
            change=points,
            ledger_type=PointLedgerType.RECHARGE.value,
            biz_id=order.id,
            remark=f"购买积分 {plan.name}",
        )
    else:
        await _activate_subscription(session, user, plan)
        gift = int(benefits.get("gift_points") or 0)
        if gift > 0:
            await add_points(
                session,
                user,
                change=gift,
                ledger_type=PointLedgerType.SUBSCRIBE_GIFT.value,
                biz_id=order.id,
                remark=f"开通会员 {plan.name}",
            )
    order.status = OrderStatus.FULFILLED.value
    await session.flush()


async def handle_payment_callback(
    session: AsyncSession,
    *,
    order_id: str,
    channel: str | None,
    amount: str | None,
    sign: str | None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    result = await session.execute(
        select(Order).where(Order.id == order_id, Order.is_deleted.is_(False)).with_for_update()
    )
    order = result.scalar_one_or_none()
    if not order:
        raise BizError(BizCode.ORDER_NOT_FOUND, "订单不存在")

    if order.status in {OrderStatus.PAID.value, OrderStatus.FULFILLED.value}:
        await fulfill_order(session, order)
        return {"order": _order_dump(order), "idempotent": True}

    if order.status != OrderStatus.PENDING.value:
        raise BizError(BizCode.ORDER_STATUS_INVALID, "订单状态不可支付")

    pay_channel = (channel or order.channel or "mock").strip()
    paid_amount = _parse_amount(amount)
    if paid_amount is not None and money(paid_amount) != money(order.amount):
        raise BizError(BizCode.PAYMENT_INVALID, "支付金额与订单不符")

    secret = settings.payment_callback_secret.strip()
    if secret:
        expected = callback_sign(
            secret,
            order_id=order.id,
            channel=pay_channel,
            amount=money(order.amount),
        )
        if sign:
            if not hmac.compare_digest(sign, expected):
                raise BizError(BizCode.PAYMENT_INVALID, "支付验签失败")
        elif not settings.debug:
            raise BizError(BizCode.PAYMENT_INVALID, "支付验签失败")
    elif not settings.debug:
        raise BizError(BizCode.PAYMENT_INVALID, "支付验签未配置")

    order.channel = pay_channel
    order.paid_at = _now()
    order.status = OrderStatus.PAID.value
    await session.flush()
    await fulfill_order(session, order)
    return {"order": _order_dump(order), "idempotent": False}
