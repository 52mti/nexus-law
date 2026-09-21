from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.biz import BizCode, BizError
from app.db.models import Agent, Prompt
from app.services.admin.common import iso, page_meta
from app.services.audit import write_audit


def dump_prompt(item: Prompt, agent: Agent | None = None) -> dict[str, Any]:
    agent = agent or item.agent
    return {
        "id": item.id,
        "agent_id": item.agent_id,
        "agent_code": agent.code if agent else None,
        "agent_name": agent.name if agent else None,
        "scene": item.scene,
        "content": item.content,
        "version": item.version,
        "is_active": item.is_active,
        "created_at": iso(item.created_at),
        "updated_at": iso(item.updated_at),
    }


async def _get_agent(session: AsyncSession, agent_id: str) -> Agent:
    result = await session.execute(
        select(Agent).where(Agent.id == agent_id, Agent.is_deleted.is_(False))
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise BizError(BizCode.AGENT_NOT_FOUND, "Agent 不存在")
    return agent


async def get_prompt(session: AsyncSession, prompt_id: str) -> Prompt:
    result = await session.execute(
        select(Prompt)
        .where(Prompt.id == prompt_id, Prompt.is_deleted.is_(False))
        .options(selectinload(Prompt.agent))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise BizError(BizCode.PROMPT_NOT_FOUND, "提示词不存在")
    return item


async def list_prompts(
    session: AsyncSession,
    *,
    agent_id: str | None = None,
    scene: str | None = None,
    is_active: bool | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [Prompt.is_deleted.is_(False)]
    if agent_id:
        filters.append(Prompt.agent_id == agent_id)
    if scene:
        filters.append(Prompt.scene == scene)
    if is_active is not None:
        filters.append(Prompt.is_active.is_(is_active))
    total = int(
        (
            await session.execute(select(func.count()).select_from(Prompt).where(*filters))
        ).scalar_one()
    )
    rows = list(
        (
            await session.execute(
                select(Prompt)
                .where(*filters)
                .options(selectinload(Prompt.agent))
                .order_by(Prompt.updated_at.desc(), Prompt.version.desc())
                .offset((current - 1) * size)
                .limit(size)
            )
        )
        .scalars()
        .all()
    )
    return {
        "records": [dump_prompt(item) for item in rows],
        **page_meta(total, current, size),
    }


async def _next_version(session: AsyncSession, agent_id: str, scene: str) -> int:
    result = await session.execute(
        select(func.max(Prompt.version)).where(
            Prompt.agent_id == agent_id,
            Prompt.scene == scene,
        )
    )
    current = result.scalar_one()
    return int(current or 0) + 1


async def _deactivate_others(
    session: AsyncSession,
    *,
    agent_id: str,
    scene: str,
    keep_id: str,
) -> None:
    result = await session.execute(
        select(Prompt).where(
            Prompt.agent_id == agent_id,
            Prompt.scene == scene,
            Prompt.id != keep_id,
            Prompt.is_deleted.is_(False),
            Prompt.is_active.is_(True),
        )
    )
    for item in result.scalars().all():
        item.is_active = False


async def create_prompt(
    session: AsyncSession,
    *,
    admin_id: str,
    agent_id: str,
    scene: str,
    content: str,
    is_active: bool = False,
) -> dict[str, Any]:
    scene_n = (scene or "").strip()
    content_n = (content or "").strip()
    if not scene_n or not content_n:
        raise BizError(BizCode.INVALID_PARAMS, "场景和内容不能为空")
    agent = await _get_agent(session, agent_id)
    item = Prompt(
        agent_id=agent.id,
        scene=scene_n,
        content=content_n,
        version=await _next_version(session, agent.id, scene_n),
        is_active=False,
    )
    session.add(item)
    await session.flush()
    if is_active:
        item.is_active = True
        await _deactivate_others(session, agent_id=agent.id, scene=scene_n, keep_id=item.id)
        await session.flush()
    await session.refresh(item)
    await write_audit(
        session,
        admin_id=admin_id,
        action="prompt.create",
        target_type="prompt",
        target_id=item.id,
        detail={"agent_id": agent.id, "scene": scene_n, "version": item.version},
    )
    return dump_prompt(item, agent)


async def update_prompt(
    session: AsyncSession,
    *,
    admin_id: str,
    prompt_id: str,
    content: str | None,
) -> dict[str, Any]:
    item = await get_prompt(session, prompt_id)
    if content is None:
        return dump_prompt(item)
    content_n = content.strip()
    if not content_n:
        raise BizError(BizCode.INVALID_PARAMS, "提示词内容不能为空")
    if item.is_active:
        created = await create_prompt(
            session,
            admin_id=admin_id,
            agent_id=item.agent_id,
            scene=item.scene,
            content=content_n,
            is_active=False,
        )
        return created
    item.content = content_n
    await session.flush()
    await write_audit(
        session,
        admin_id=admin_id,
        action="prompt.update",
        target_type="prompt",
        target_id=item.id,
        detail={"version": item.version},
    )
    return dump_prompt(await get_prompt(session, item.id))


async def activate_prompt(
    session: AsyncSession,
    *,
    admin_id: str,
    prompt_id: str,
) -> dict[str, Any]:
    item = await get_prompt(session, prompt_id)
    item.is_active = True
    await _deactivate_others(
        session,
        agent_id=item.agent_id,
        scene=item.scene,
        keep_id=item.id,
    )
    await session.flush()
    await write_audit(
        session,
        admin_id=admin_id,
        action="prompt.activate",
        target_type="prompt",
        target_id=item.id,
        detail={"agent_id": item.agent_id, "scene": item.scene, "version": item.version},
    )
    return dump_prompt(await get_prompt(session, item.id))


async def delete_prompt(
    session: AsyncSession,
    *,
    admin_id: str,
    prompt_id: str,
) -> dict[str, Any]:
    item = await get_prompt(session, prompt_id)
    if item.is_active:
        raise BizError(BizCode.PROMPT_PROTECTED, "请先停用当前启用版本，再删除")
    item.is_deleted = True
    await session.flush()
    await write_audit(
        session,
        admin_id=admin_id,
        action="prompt.delete",
        target_type="prompt",
        target_id=item.id,
        detail={"version": item.version, "scene": item.scene},
    )
    return {"id": item.id}


async def get_active_system_prompt(
    session: AsyncSession,
    *,
    agent_id: str | None,
    fallback: str,
) -> str:
    filters = [
        Prompt.scene == "system",
        Prompt.is_active.is_(True),
        Prompt.is_deleted.is_(False),
    ]
    if agent_id:
        filters.append(Prompt.agent_id == agent_id)
        result = await session.execute(
            select(Prompt).where(*filters).order_by(Prompt.version.desc()).limit(1)
        )
        item = result.scalar_one_or_none()
        if item:
            return item.content
        return fallback

    result = await session.execute(
        select(Prompt).where(*filters).order_by(Prompt.updated_at.desc()).limit(1)
    )
    item = result.scalar_one_or_none()
    return item.content if item else fallback
