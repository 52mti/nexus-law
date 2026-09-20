from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.users import AccountContext, require_account
from app.core.biz import ok
from app.core.config import get_settings
from app.db.session import get_db_session
from app.schemas.commerce import OrderCreateRequest, PaymentCallbackRequest
from app.services import commerce as commerce_service

router = APIRouter(tags=["commerce"])


def _page_args(current: int, size: int) -> tuple[int, int]:
    return current, min(size, 100)


@router.get("/points/ledger")
async def points_ledger(
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AccountContext = Depends(require_account),
) -> dict:
    current, size = _page_args(current, size)
    data = await commerce_service.list_ledgers(
        ctx.session,
        user_id=ctx.user.id,
        current=current,
        size=size,
    )
    return ok(data)


@router.get("/plan/list")
async def plan_list(
    type: str | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AccountContext = Depends(require_account),
) -> dict:
    current, size = _page_args(current, size)
    data = await commerce_service.list_plans(
        ctx.session,
        plan_type=type,
        current=current,
        size=size,
    )
    return ok(data)


@router.post("/order/create")
async def order_create(
    body: OrderCreateRequest,
    ctx: AccountContext = Depends(require_account),
) -> dict:
    data = await commerce_service.create_order(
        ctx.session,
        user_id=ctx.user.id,
        product_type=body.product_type,
        product_id=body.product_id,
        channel=body.channel,
    )
    return ok(data)


@router.get("/order/list")
async def order_list(
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    ctx: AccountContext = Depends(require_account),
) -> dict:
    current, size = _page_args(current, size)
    data = await commerce_service.list_orders(
        ctx.session,
        user_id=ctx.user.id,
        current=current,
        size=size,
        status=status,
    )
    return ok(data)


@router.get("/order/detail")
async def order_detail(
    id: str = Query(min_length=1),
    ctx: AccountContext = Depends(require_account),
) -> dict:
    data = await commerce_service.get_order_detail(
        ctx.session,
        order_id=id,
        user_id=ctx.user.id,
    )
    return ok(data)


@router.post("/payment/callback")
async def payment_callback(
    body: PaymentCallbackRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    data = await commerce_service.handle_payment_callback(
        session,
        order_id=body.order_id,
        channel=body.channel,
        amount=body.amount,
        sign=body.sign,
        settings=get_settings(),
    )
    return ok(data, "支付已处理")


@router.get("/subscription/current")
async def subscription_current(ctx: AccountContext = Depends(require_account)) -> dict:
    data = await commerce_service.get_current_subscription(ctx.session, ctx.user.id)
    return ok(data)
