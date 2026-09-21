from fastapi import APIRouter, Depends, Query

from app.api.v1.admin.deps import AdminContext, require_permission, require_super_admin
from app.core.biz import ok
from app.schemas.admin import (
    IdRequest,
    PlanCreateRequest,
    PlanStatusUpdateRequest,
    PlanUpdateRequest,
)
from app.services.admin import commerce as admin_commerce
from app.services.admin.common import page_args, parse_dt

router = APIRouter()


@router.get("/plan/list")
async def plan_list(
    type: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AdminContext = Depends(require_permission("plan:manage")),
) -> dict:
    current, size = page_args(current, size)
    data = await admin_commerce.list_plans(
        ctx.session,
        plan_type=type,
        is_active=is_active,
        current=current,
        size=size,
    )
    return ok(data)


@router.get("/plan/detail")
async def plan_detail(
    id: str = Query(min_length=1),
    ctx: AdminContext = Depends(require_permission("plan:manage")),
) -> dict:
    plan = await admin_commerce.get_plan(ctx.session, id)
    return ok(admin_commerce.dump_plan_admin(plan))


@router.post("/plan/create")
async def plan_create(
    body: PlanCreateRequest,
    ctx: AdminContext = Depends(require_permission("plan:manage")),
) -> dict:
    data = await admin_commerce.create_plan(
        ctx.session,
        admin_id=ctx.user.id,
        name=body.name,
        plan_type=body.type,
        price=body.price,
        period=body.period,
        benefits=body.benefits,
        is_active=body.is_active,
    )
    return ok(data)


@router.post("/plan/update")
async def plan_update(
    body: PlanUpdateRequest,
    ctx: AdminContext = Depends(require_permission("plan:manage")),
) -> dict:
    data = await admin_commerce.update_plan(
        ctx.session,
        admin_id=ctx.user.id,
        plan_id=body.id,
        name=body.name,
        plan_type=body.type,
        price=body.price,
        period=body.period,
        benefits=body.benefits,
    )
    return ok(data)


@router.post("/plan/status/update")
async def plan_status_update(
    body: PlanStatusUpdateRequest,
    ctx: AdminContext = Depends(require_permission("plan:manage")),
) -> dict:
    data = await admin_commerce.update_plan_status(
        ctx.session,
        admin_id=ctx.user.id,
        plan_id=body.id,
        is_active=body.is_active,
    )
    return ok(data)


@router.get("/order/list")
async def order_list(
    user_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    product_type: str | None = Query(default=None),
    start_at: str | None = Query(default=None),
    end_at: str | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AdminContext = Depends(require_permission("order:manage")),
) -> dict:
    current, size = page_args(current, size)
    data = await admin_commerce.list_orders(
        ctx.session,
        user_id=user_id,
        status=status,
        product_type=product_type,
        start_at=parse_dt(start_at),
        end_at=parse_dt(end_at),
        current=current,
        size=size,
    )
    return ok(data)


@router.get("/order/detail")
async def order_detail(
    id: str = Query(min_length=1),
    ctx: AdminContext = Depends(require_permission("order:manage")),
) -> dict:
    data = await admin_commerce.get_order_detail(ctx.session, id)
    return ok(data)


@router.post("/order/fulfill")
async def order_fulfill(
    body: IdRequest,
    ctx: AdminContext = Depends(require_super_admin),
) -> dict:
    data = await admin_commerce.fulfill_order_admin(
        ctx.session,
        admin_id=ctx.user.id,
        order_id=body.id,
    )
    return ok(data, "补单已处理")


@router.get("/billing/ledger")
async def billing_ledger(
    user_id: str | None = Query(default=None),
    type: str | None = Query(default=None),
    start_at: str | None = Query(default=None),
    end_at: str | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AdminContext = Depends(require_permission("billing:view")),
) -> dict:
    current, size = page_args(current, size)
    data = await admin_commerce.list_ledgers(
        ctx.session,
        user_id=user_id,
        ledger_type=type,
        start_at=parse_dt(start_at),
        end_at=parse_dt(end_at),
        current=current,
        size=size,
    )
    return ok(data)


@router.get("/billing/consume")
async def billing_consume(
    user_id: str | None = Query(default=None),
    start_at: str | None = Query(default=None),
    end_at: str | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AdminContext = Depends(require_permission("billing:view")),
) -> dict:
    current, size = page_args(current, size)
    data = await admin_commerce.list_consume(
        ctx.session,
        user_id=user_id,
        start_at=parse_dt(start_at),
        end_at=parse_dt(end_at),
        current=current,
        size=size,
    )
    return ok(data)
