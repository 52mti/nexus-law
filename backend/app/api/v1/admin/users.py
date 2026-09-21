from fastapi import APIRouter, Depends, Query

from app.api.v1.admin.deps import AdminContext, require_permission
from app.core.biz import ok
from app.schemas.admin import (
    UserPointsAdjustRequest,
    UserRolesAssignRequest,
    UserStatusUpdateRequest,
)
from app.services.admin import rbac as rbac_service
from app.services.admin.common import page_args

router = APIRouter()


@router.get("/user/list")
async def user_list(
    keyword: str | None = Query(default=None),
    status: str | None = Query(default=None),
    role_code: str | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AdminContext = Depends(require_permission("user:manage")),
) -> dict:
    current, size = page_args(current, size)
    data = await rbac_service.list_users(
        ctx.session,
        keyword=keyword,
        status=status,
        role_code=role_code,
        current=current,
        size=size,
    )
    return ok(data)


@router.get("/user/detail")
async def user_detail(
    id: str = Query(min_length=1),
    ctx: AdminContext = Depends(require_permission("user:manage")),
) -> dict:
    data = await rbac_service.get_user_detail(ctx.session, id)
    return ok(data)


@router.post("/user/status/update")
async def user_status_update(
    body: UserStatusUpdateRequest,
    ctx: AdminContext = Depends(require_permission("user:manage")),
) -> dict:
    data = await rbac_service.update_user_status(
        ctx.session,
        admin_id=ctx.user.id,
        user_id=body.id,
        status=body.status,
    )
    return ok(data)


@router.post("/user/roles/assign")
async def user_roles_assign(
    body: UserRolesAssignRequest,
    ctx: AdminContext = Depends(require_permission("user:manage")),
) -> dict:
    data = await rbac_service.assign_user_roles(
        ctx.session,
        admin_id=ctx.user.id,
        user_id=body.id,
        role_codes=body.role_codes,
    )
    return ok(data)


@router.post("/user/points/adjust")
async def user_points_adjust(
    body: UserPointsAdjustRequest,
    ctx: AdminContext = Depends(require_permission("user:manage")),
) -> dict:
    data = await rbac_service.adjust_user_points(
        ctx.session,
        admin_id=ctx.user.id,
        user_id=body.id,
        change=body.change,
        remark=body.remark,
    )
    return ok(data)
