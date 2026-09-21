from fastapi import APIRouter, Depends, Query

from app.api.v1.admin.deps import AdminContext, require_permission
from app.core.biz import ok
from app.services.admin import audit as audit_service
from app.services.admin.common import page_args, parse_dt

router = APIRouter()


@router.get("/audit/list")
async def audit_list(
    admin_id: str | None = Query(default=None),
    action: str | None = Query(default=None),
    target_type: str | None = Query(default=None),
    target_id: str | None = Query(default=None),
    start_at: str | None = Query(default=None),
    end_at: str | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AdminContext = Depends(require_permission("audit:view")),
) -> dict:
    current, size = page_args(current, size)
    data = await audit_service.list_audits(
        ctx.session,
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        start_at=parse_dt(start_at),
        end_at=parse_dt(end_at),
        current=current,
        size=size,
    )
    return ok(data)


@router.get("/audit/detail")
async def audit_detail(
    id: str = Query(min_length=1),
    ctx: AdminContext = Depends(require_permission("audit:view")),
) -> dict:
    data = await audit_service.get_audit_detail(ctx.session, id)
    return ok(data)
