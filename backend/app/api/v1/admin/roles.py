from fastapi import APIRouter, Depends, Query

from app.api.v1.admin.deps import AdminContext, require_permission
from app.core.biz import ok
from app.schemas.admin import (
    IdRequest,
    RoleCreateRequest,
    RolePermissionsBindRequest,
    RoleUpdateRequest,
)
from app.services.admin import rbac as rbac_service

router = APIRouter()


@router.get("/role/list")
async def role_list(ctx: AdminContext = Depends(require_permission("user:manage"))) -> dict:
    data = await rbac_service.list_roles(ctx.session)
    return ok(data)


@router.get("/role/detail")
async def role_detail(
    id: str = Query(min_length=1),
    ctx: AdminContext = Depends(require_permission("user:manage")),
) -> dict:
    data = await rbac_service.get_role_detail(ctx.session, id)
    return ok(data)


@router.post("/role/create")
async def role_create(
    body: RoleCreateRequest,
    ctx: AdminContext = Depends(require_permission("user:manage")),
) -> dict:
    data = await rbac_service.create_role(
        ctx.session,
        admin_id=ctx.user.id,
        code=body.code,
        name=body.name,
        description=body.description,
    )
    return ok(data)


@router.post("/role/update")
async def role_update(
    body: RoleUpdateRequest,
    ctx: AdminContext = Depends(require_permission("user:manage")),
) -> dict:
    data = await rbac_service.update_role(
        ctx.session,
        admin_id=ctx.user.id,
        role_id=body.id,
        name=body.name,
        description=body.description,
    )
    return ok(data)


@router.post("/role/delete")
async def role_delete(
    body: IdRequest,
    ctx: AdminContext = Depends(require_permission("user:manage")),
) -> dict:
    data = await rbac_service.delete_role(
        ctx.session,
        admin_id=ctx.user.id,
        role_id=body.id,
    )
    return ok(data, "角色已删除")


@router.get("/permission/list")
async def permission_list(
    ctx: AdminContext = Depends(require_permission("user:manage")),
) -> dict:
    data = await rbac_service.list_permissions(ctx.session)
    return ok(data)


@router.post("/role/permissions/bind")
async def role_permissions_bind(
    body: RolePermissionsBindRequest,
    ctx: AdminContext = Depends(require_permission("user:manage")),
) -> dict:
    data = await rbac_service.bind_role_permissions(
        ctx.session,
        admin_id=ctx.user.id,
        role_id=body.id,
        permission_codes=body.permission_codes,
    )
    return ok(data)
