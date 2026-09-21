from fastapi import APIRouter, Depends, Query

from app.api.v1.admin.deps import AdminContext, require_permission
from app.core.biz import ok
from app.schemas.admin import IdRequest, PromptCreateRequest, PromptUpdateRequest
from app.services.admin import prompt as prompt_service
from app.services.admin.common import page_args

router = APIRouter()


@router.get("/prompt/list")
async def prompt_list(
    agent_id: str | None = Query(default=None),
    scene: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AdminContext = Depends(require_permission("prompt:manage")),
) -> dict:
    current, size = page_args(current, size)
    data = await prompt_service.list_prompts(
        ctx.session,
        agent_id=agent_id,
        scene=scene,
        is_active=is_active,
        current=current,
        size=size,
    )
    return ok(data)


@router.get("/prompt/detail")
async def prompt_detail(
    id: str = Query(min_length=1),
    ctx: AdminContext = Depends(require_permission("prompt:manage")),
) -> dict:
    item = await prompt_service.get_prompt(ctx.session, id)
    return ok(prompt_service.dump_prompt(item))


@router.post("/prompt/create")
async def prompt_create(
    body: PromptCreateRequest,
    ctx: AdminContext = Depends(require_permission("prompt:manage")),
) -> dict:
    data = await prompt_service.create_prompt(
        ctx.session,
        admin_id=ctx.user.id,
        agent_id=body.agent_id,
        scene=body.scene,
        content=body.content,
        is_active=body.is_active,
    )
    return ok(data)


@router.post("/prompt/update")
async def prompt_update(
    body: PromptUpdateRequest,
    ctx: AdminContext = Depends(require_permission("prompt:manage")),
) -> dict:
    data = await prompt_service.update_prompt(
        ctx.session,
        admin_id=ctx.user.id,
        prompt_id=body.id,
        content=body.content,
    )
    return ok(data)


@router.post("/prompt/activate")
async def prompt_activate(
    body: IdRequest,
    ctx: AdminContext = Depends(require_permission("prompt:manage")),
) -> dict:
    data = await prompt_service.activate_prompt(
        ctx.session,
        admin_id=ctx.user.id,
        prompt_id=body.id,
    )
    return ok(data)


@router.post("/prompt/delete")
async def prompt_delete(
    body: IdRequest,
    ctx: AdminContext = Depends(require_permission("prompt:manage")),
) -> dict:
    data = await prompt_service.delete_prompt(
        ctx.session,
        admin_id=ctx.user.id,
        prompt_id=body.id,
    )
    return ok(data, "提示词已删除")
