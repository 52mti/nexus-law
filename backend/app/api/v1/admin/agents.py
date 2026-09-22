from fastapi import APIRouter, Depends, Query

from app.api.v1.admin.deps import AdminContext, require_permission
from app.core.biz import ok
from app.schemas.admin import (
    AgentCreateRequest,
    AgentRolesBindRequest,
    AgentUpdateRequest,
    IdRequest,
)
from app.services.admin import agent as agent_admin
from app.services.admin.common import page_args, parse_dt

router = APIRouter()


@router.get("/agent/list")
async def agent_list(
    keyword: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AdminContext = Depends(require_permission("agent:manage")),
) -> dict:
    current, size = page_args(current, size)
    data = await agent_admin.list_agents(
        ctx.session,
        keyword=keyword,
        is_active=is_active,
        current=current,
        size=size,
    )
    return ok(data)


@router.get("/agent/detail")
async def agent_detail(
    id: str = Query(min_length=1),
    ctx: AdminContext = Depends(require_permission("agent:manage")),
) -> dict:
    data = await agent_admin.get_agent_detail(ctx.session, id)
    return ok(data)


@router.post("/agent/create")
async def agent_create(
    body: AgentCreateRequest,
    ctx: AdminContext = Depends(require_permission("agent:manage")),
) -> dict:
    data = await agent_admin.create_agent(
        ctx.session,
        admin_id=ctx.user.id,
        name=body.name,
        code=body.code,
        description=body.description,
        tool_whitelist=body.tool_whitelist,
        dataset_ids=body.dataset_ids,
        temperature=body.temperature,
        is_active=body.is_active,
        graph_code=body.graph_code,
    )
    return ok(data)


@router.get("/agent/templates")
async def agent_templates(
    ctx: AdminContext = Depends(require_permission("agent:manage")),
) -> dict:
    return ok(agent_admin.list_agent_templates())


@router.get("/agent/run/list")
async def agent_run_list(
    agent_id: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    retrieval_hit: bool | None = Query(default=None),
    error: bool | None = Query(default=None),
    start_at: str | None = Query(default=None),
    end_at: str | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AdminContext = Depends(require_permission("agent:manage")),
) -> dict:
    current, size = page_args(current, size)
    data = await agent_admin.list_agent_runs(
        ctx.session,
        agent_id=agent_id,
        user_id=user_id,
        retrieval_hit=retrieval_hit,
        error=error,
        start_at=parse_dt(start_at),
        end_at=parse_dt(end_at),
        current=current,
        size=size,
    )
    return ok(data)


@router.get("/agent/run/detail")
async def agent_run_detail(
    id: str = Query(min_length=1),
    ctx: AdminContext = Depends(require_permission("agent:manage")),
) -> dict:
    data = await agent_admin.get_agent_run_detail(ctx.session, id)
    return ok(data)


@router.get("/agent/run/stats")
async def agent_run_stats(
    agent_id: str | None = Query(default=None),
    start_at: str | None = Query(default=None),
    end_at: str | None = Query(default=None),
    ctx: AdminContext = Depends(require_permission("agent:manage")),
) -> dict:
    data = await agent_admin.agent_run_stats(
        ctx.session,
        agent_id=agent_id,
        start_at=parse_dt(start_at),
        end_at=parse_dt(end_at),
    )
    return ok(data)


@router.post("/agent/update")
async def agent_update(
    body: AgentUpdateRequest,
    ctx: AdminContext = Depends(require_permission("agent:manage")),
) -> dict:
    data = await agent_admin.update_agent(
        ctx.session,
        admin_id=ctx.user.id,
        agent_id=body.id,
        name=body.name,
        description=body.description,
        tool_whitelist=body.tool_whitelist,
        dataset_ids=body.dataset_ids,
        temperature=body.temperature,
        is_active=body.is_active,
    )
    return ok(data)


@router.post("/agent/delete")
async def agent_delete(
    body: IdRequest,
    ctx: AdminContext = Depends(require_permission("agent:manage")),
) -> dict:
    data = await agent_admin.delete_agent(
        ctx.session,
        admin_id=ctx.user.id,
        agent_id=body.id,
    )
    return ok(data, "Agent 已删除")


@router.post("/agent/roles/bind")
async def agent_roles_bind(
    body: AgentRolesBindRequest,
    ctx: AdminContext = Depends(require_permission("agent:manage")),
) -> dict:
    data = await agent_admin.bind_agent_roles(
        ctx.session,
        admin_id=ctx.user.id,
        agent_id=body.id,
        role_codes=body.role_codes,
    )
    return ok(data)
