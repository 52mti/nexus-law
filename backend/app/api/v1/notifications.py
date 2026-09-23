from fastapi import APIRouter, Depends, Query

from app.api.deps import AccountContext, require_account
from app.core.biz import ok
from app.schemas.notification import NotificationReadRequest
from app.services import notification as notification_service

router = APIRouter(tags=["notification"])


@router.get("/notification/list")
async def notification_list(
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AccountContext = Depends(require_account),
) -> dict:
    data = await notification_service.list_notifications(
        ctx.session,
        user_id=ctx.user.id,
        current=current,
        size=min(size, 100),
    )
    return ok(data)


@router.post("/notification/read")
async def notification_read(
    body: NotificationReadRequest,
    ctx: AccountContext = Depends(require_account),
) -> dict:
    data = await notification_service.mark_notifications_read(
        ctx.session,
        user_id=ctx.user.id,
        id_list=body.id_list or None,
    )
    return ok(data)
