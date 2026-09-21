from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.biz import BizCode, BizError
from app.db.models import (
    Order,
    OrderStatus,
    Plan,
    PointLedger,
    PointLedgerType,
    ProductType,
    User,
)
from app.services.admin.common import iso, page_meta
from app.services.audit import write_audit
from app.services.commerce import (
    _ledger_dump,
    _order_dump,
    _plan_dump,
    fulfill_order,
    money,
)


def _parse_price(value: str | float | Decimal) -> Decimal:
    try:
        parsed = Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError) as exc:
        raise BizError(BizCode.INVALID_PARAMS, "价格格式不正确") from exc
    if parsed < 0:
        raise BizError(BizCode.INVALID_PARAMS, "价格不能为负数")
    return parsed


def dump_plan_admin(plan: Plan) -> dict[str, Any]:
    data = _plan_dump(plan)
    data["created_at"] = iso(plan.created_at)
    data["updated_at"] = iso(plan.updated_at)
    return data


async def get_plan(session: AsyncSession, plan_id: str) -> Plan:
    result = await session.execute(
        select(Plan).where(Plan.id == plan_id, Plan.is_deleted.is_(False))
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise BizError(BizCode.PLAN_NOT_FOUND, "套餐不存在")
    return plan


async def list_plans(
    session: AsyncSession,
    *,
    plan_type: str | None = None,
    is_active: bool | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [Plan.is_deleted.is_(False)]
    if plan_type:
        filters.append(Plan.type == plan_type)
    if is_active is not None:
        filters.append(Plan.is_active.is_(is_active))
    total = int(
        (await session.execute(select(func.count()).select_from(Plan).where(*filters))).scalar_one()
    )
    rows = list(
        (
            await session.execute(
                select(Plan)
                .where(*filters)
                .order_by(Plan.created_at.desc())
                .offset((current - 1) * size)
                .limit(size)
            )
        )
        .scalars()
        .all()
    )
    return {
        "records": [dump_plan_admin(item) for item in rows],
        **page_meta(total, current, size),
    }


async def create_plan(
    session: AsyncSession,
    *,
    admin_id: str,
    name: str,
    plan_type: str,
    price: str | float | Decimal,
    period: str | None,
    benefits: dict[str, Any] | None,
    is_active: bool = True,
) -> dict[str, Any]:
    name_n = (name or "").strip()
    type_n = (plan_type or "").strip()
    if not name_n or not type_n:
        raise BizError(BizCode.INVALID_PARAMS, "套餐名称和类型不能为空")
    if type_n not in {ProductType.PLAN.value, ProductType.POINTS.value, "membership"}:
        raise BizError(BizCode.INVALID_PARAMS, "套餐类型不正确")
    if type_n == "membership":
        type_n = ProductType.PLAN.value
    plan = Plan(
        name=name_n,
        type=type_n,
        price=_parse_price(price),
        period=period,
        benefits_json=benefits or {},
        is_active=is_active,
    )
    session.add(plan)
    await session.flush()
    await session.refresh(plan)
    await write_audit(
        session,
        admin_id=admin_id,
        action="plan.create",
        target_type="plan",
        target_id=plan.id,
        detail={"name": plan.name, "type": plan.type, "price": money(plan.price)},
    )
    return dump_plan_admin(plan)


async def update_plan(
    session: AsyncSession,
    *,
    admin_id: str,
    plan_id: str,
    name: str | None = None,
    plan_type: str | None = None,
    price: str | float | Decimal | None = None,
    period: str | None = None,
    benefits: dict[str, Any] | None = None,
) -> dict[str, Any]:
    plan = await get_plan(session, plan_id)
    if name is not None:
        name_n = name.strip()
        if not name_n:
            raise BizError(BizCode.INVALID_PARAMS, "套餐名称不能为空")
        plan.name = name_n
    if plan_type is not None:
        type_n = plan_type.strip()
        if type_n == "membership":
            type_n = ProductType.PLAN.value
        if type_n not in {ProductType.PLAN.value, ProductType.POINTS.value}:
            raise BizError(BizCode.INVALID_PARAMS, "套餐类型不正确")
        plan.type = type_n
    if price is not None:
        plan.price = _parse_price(price)
    if period is not None:
        plan.period = period
    if benefits is not None:
        plan.benefits_json = benefits
    await session.flush()
    await session.refresh(plan)
    await write_audit(
        session,
        admin_id=admin_id,
        action="plan.update",
        target_type="plan",
        target_id=plan.id,
        detail={"name": plan.name},
    )
    return dump_plan_admin(plan)


async def update_plan_status(
    session: AsyncSession,
    *,
    admin_id: str,
    plan_id: str,
    is_active: bool,
) -> dict[str, Any]:
    plan = await get_plan(session, plan_id)
    plan.is_active = is_active
    await session.flush()
    await session.refresh(plan)
    await write_audit(
        session,
        admin_id=admin_id,
        action="plan.status.update",
        target_type="plan",
        target_id=plan.id,
        detail={"is_active": is_active},
    )
    return dump_plan_admin(plan)


def _dump_order_admin(
    order: Order,
    user: User | None = None,
    plan: Plan | None = None,
) -> dict[str, Any]:
    data = _order_dump(order)
    data["user_id"] = order.user_id
    if user:
        data["user"] = {
            "id": user.id,
            "nickname": user.nickname,
            "phone": user.phone,
            "email": user.email,
        }
    if plan:
        data["plan"] = dump_plan_admin(plan)
    return data


async def list_orders(
    session: AsyncSession,
    *,
    user_id: str | None = None,
    status: str | None = None,
    product_type: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [Order.is_deleted.is_(False)]
    if user_id:
        filters.append(Order.user_id == user_id)
    if status:
        filters.append(Order.status == status)
    if product_type:
        filters.append(Order.product_type == product_type)
    if start_at:
        filters.append(Order.created_at >= start_at)
    if end_at:
        filters.append(Order.created_at <= end_at)
    total = int(
        (
            await session.execute(select(func.count()).select_from(Order).where(*filters))
        ).scalar_one()
    )
    rows = list(
        (
            await session.execute(
                select(Order)
                .where(*filters)
                .order_by(Order.created_at.desc(), Order.id.desc())
                .offset((current - 1) * size)
                .limit(size)
            )
        )
        .scalars()
        .all()
    )
    user_ids = list({item.user_id for item in rows})
    users: dict[str, User] = {}
    if user_ids:
        user_rows = (
            await session.execute(select(User).where(User.id.in_(user_ids)))
        ).scalars().all()
        users = {item.id: item for item in user_rows}
    return {
        "records": [_dump_order_admin(item, users.get(item.user_id)) for item in rows],
        **page_meta(total, current, size),
    }


async def get_order_detail(session: AsyncSession, order_id: str) -> dict[str, Any]:
    result = await session.execute(
        select(Order).where(Order.id == order_id, Order.is_deleted.is_(False))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise BizError(BizCode.ORDER_NOT_FOUND, "订单不存在")
    user = await session.get(User, order.user_id)
    plan = (
        await session.execute(
            select(Plan).where(Plan.id == order.product_id, Plan.is_deleted.is_(False))
        )
    ).scalar_one_or_none()
    return _dump_order_admin(order, user, plan)


async def fulfill_order_admin(
    session: AsyncSession,
    *,
    admin_id: str,
    order_id: str,
) -> dict[str, Any]:
    result = await session.execute(
        select(Order).where(Order.id == order_id, Order.is_deleted.is_(False)).with_for_update()
    )
    order = result.scalar_one_or_none()
    if not order:
        raise BizError(BizCode.ORDER_NOT_FOUND, "订单不存在")
    idempotent = order.status == OrderStatus.FULFILLED.value
    if order.status == OrderStatus.CANCELLED.value or order.status == OrderStatus.REFUNDED.value:
        raise BizError(BizCode.ORDER_STATUS_INVALID, "订单状态不可补单")
    if order.status == OrderStatus.PENDING.value:
        order.status = OrderStatus.PAID.value
        order.paid_at = datetime.now(UTC)
        order.channel = order.channel or "admin"
        await session.flush()
    await fulfill_order(session, order)
    await write_audit(
        session,
        admin_id=admin_id,
        action="order.fulfill",
        target_type="order",
        target_id=order.id,
        detail={"idempotent": idempotent, "status": order.status},
    )
    return {**await get_order_detail(session, order.id), "idempotent": idempotent}


async def list_ledgers(
    session: AsyncSession,
    *,
    user_id: str | None = None,
    ledger_type: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [PointLedger.is_deleted.is_(False)]
    if user_id:
        filters.append(PointLedger.user_id == user_id)
    if ledger_type:
        filters.append(PointLedger.type == ledger_type)
    if start_at:
        filters.append(PointLedger.created_at >= start_at)
    if end_at:
        filters.append(PointLedger.created_at <= end_at)
    total = int(
        (await session.execute(
            select(func.count()).select_from(PointLedger).where(*filters)
        )).scalar_one()
    )
    rows = list(
        (
            await session.execute(
                select(PointLedger)
                .where(*filters)
                .order_by(PointLedger.created_at.desc(), PointLedger.id.desc())
                .offset((current - 1) * size)
                .limit(size)
            )
        )
        .scalars()
        .all()
    )
    user_ids = list({item.user_id for item in rows})
    users: dict[str, User] = {}
    if user_ids:
        user_rows = list(
            (await session.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
        )
        users = {item.id: item for item in user_rows}
    records = []
    for item in rows:
        data = _ledger_dump(item)
        data["user_id"] = item.user_id
        user = users.get(item.user_id)
        if user:
            data["user"] = {
                "id": user.id,
                "nickname": user.nickname,
                "phone": user.phone,
                "email": user.email,
            }
        records.append(data)
    return {"records": records, **page_meta(total, current, size)}


async def list_consume(
    session: AsyncSession,
    *,
    user_id: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    data = await list_ledgers(
        session,
        user_id=user_id,
        ledger_type=PointLedgerType.CONSUME_CHAT.value,
        start_at=start_at,
        end_at=end_at,
        current=current,
        size=size,
    )
    filters = [
        PointLedger.is_deleted.is_(False),
        PointLedger.type == PointLedgerType.CONSUME_CHAT.value,
    ]
    if user_id:
        filters.append(PointLedger.user_id == user_id)
    if start_at:
        filters.append(PointLedger.created_at >= start_at)
    if end_at:
        filters.append(PointLedger.created_at <= end_at)
    total_change = int(
        (
            await session.execute(
                select(func.coalesce(func.sum(PointLedger.change), 0)).where(*filters)
            )
        ).scalar_one()
    )
    user_count = int(
        (
            await session.execute(
                select(func.count(func.distinct(PointLedger.user_id))).where(*filters)
            )
        ).scalar_one()
    )
    data["summary"] = {
        "total_consumed": abs(total_change),
        "user_count": user_count,
    }
    return data
