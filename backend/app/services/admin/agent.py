from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.biz import BizCode, BizError
from app.db.models import (
    Agent,
    AgentRoleBind,
    Dataset,
    Role,
)
from app.services.admin.common import iso, page_meta
from app.services.audit import write_audit


def dump_agent(item: Agent, role_codes: list[str] | None = None) -> dict[str, Any]:
    codes = role_codes
    if codes is None:
        codes = [
            bind.role.code
            for bind in item.role_binds
            if not bind.is_deleted and bind.role and not bind.role.is_deleted
        ]
    return {
        "id": item.id,
        "name": item.name,
        "code": item.code,
        "description": item.description,
        "tool_whitelist": item.tool_whitelist or [],
        "dataset_ids": item.dataset_ids or [],
        "temperature": float(item.temperature),
        "is_active": item.is_active,
        "role_codes": codes or [],
        "created_at": iso(item.created_at),
        "updated_at": iso(item.updated_at),
    }


async def _role_codes_for_agents(
    session: AsyncSession,
    agent_ids: list[str],
) -> dict[str, list[str]]:
    if not agent_ids:
        return {}
    result = await session.execute(
        select(AgentRoleBind.agent_id, Role.code)
        .join(Role, Role.id == AgentRoleBind.role_id)
        .where(
            AgentRoleBind.agent_id.in_(agent_ids),
            AgentRoleBind.is_deleted.is_(False),
            Role.is_deleted.is_(False),
        )
    )
    mapping: dict[str, list[str]] = {agent_id: [] for agent_id in agent_ids}
    for agent_id, code in result.all():
        mapping.setdefault(agent_id, []).append(code)
    return mapping


async def get_agent(session: AsyncSession, agent_id: str) -> Agent:
    result = await session.execute(
        select(Agent)
        .where(Agent.id == agent_id, Agent.is_deleted.is_(False))
        .options(selectinload(Agent.role_binds).selectinload(AgentRoleBind.role))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise BizError(BizCode.AGENT_NOT_FOUND, "Agent 不存在")
    return item


async def list_agents(
    session: AsyncSession,
    *,
    keyword: str | None = None,
    is_active: bool | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [Agent.is_deleted.is_(False)]
    if is_active is not None:
        filters.append(Agent.is_active.is_(is_active))
    if keyword and keyword.strip():
        like = f"%{keyword.strip()}%"
        filters.append(or_(Agent.name.ilike(like), Agent.code.ilike(like)))
    total = int(
        (
            await session.execute(select(func.count()).select_from(Agent).where(*filters))
        ).scalar_one()
    )
    rows = list(
        (
            await session.execute(
                select(Agent)
                .where(*filters)
                .order_by(Agent.created_at.desc())
                .offset((current - 1) * size)
                .limit(size)
            )
        )
        .scalars()
        .all()
    )
    role_map = await _role_codes_for_agents(session, [item.id for item in rows])
    return {
        "records": [dump_agent(item, role_map.get(item.id, [])) for item in rows],
        **page_meta(total, current, size),
    }


async def get_agent_detail(session: AsyncSession, agent_id: str) -> dict[str, Any]:
    item = await get_agent(session, agent_id)
    return dump_agent(item)


def _parse_temperature(value: float | Decimal | None) -> Decimal:
    raw = 0.2 if value is None else value
    try:
        parsed = Decimal(str(raw)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError) as exc:
        raise BizError(BizCode.INVALID_PARAMS, "温度参数不正确") from exc
    if parsed < 0 or parsed > 2:
        raise BizError(BizCode.INVALID_PARAMS, "温度参数需在 0–2 之间")
    return parsed


async def _assert_datasets(session: AsyncSession, dataset_ids: list[str] | None) -> list[str]:
    ids = [item.strip() for item in (dataset_ids or []) if item and item.strip()]
    if not ids:
        return []
    result = await session.execute(
        select(Dataset.id).where(Dataset.id.in_(ids), Dataset.is_deleted.is_(False))
    )
    found = set(result.scalars().all())
    missing = [item for item in ids if item not in found]
    if missing:
        raise BizError(BizCode.DATASET_NOT_FOUND, "关联知识库不存在")
    return ids


async def _get_by_code(session: AsyncSession, code: str) -> Agent | None:
    result = await session.execute(select(Agent).where(Agent.code == code))
    return result.scalar_one_or_none()


async def create_agent(
    session: AsyncSession,
    *,
    admin_id: str,
    name: str,
    code: str,
    description: str | None,
    tool_whitelist: list[str] | None,
    dataset_ids: list[str] | None,
    temperature: float | None,
    is_active: bool = True,
) -> dict[str, Any]:
    name_n = (name or "").strip()
    code_n = (code or "").strip()
    if not name_n or not code_n:
        raise BizError(BizCode.INVALID_PARAMS, "Agent 名称和编码不能为空")
    existing = await _get_by_code(session, code_n)
    if existing and not existing.is_deleted:
        raise BizError(BizCode.AGENT_CODE_TAKEN, "Agent 编码已存在")
    datasets = await _assert_datasets(session, dataset_ids)
    if existing and existing.is_deleted:
        existing.is_deleted = False
        existing.name = name_n
        existing.description = description
        existing.tool_whitelist = tool_whitelist or []
        existing.dataset_ids = datasets
        existing.temperature = _parse_temperature(temperature)
        existing.is_active = is_active
        item = existing
    else:
        item = Agent(
            name=name_n,
            code=code_n,
            description=description,
            tool_whitelist=tool_whitelist or [],
            dataset_ids=datasets,
            temperature=_parse_temperature(temperature),
            is_active=is_active,
        )
        session.add(item)
    await session.flush()
    await session.refresh(item)
    await write_audit(
        session,
        admin_id=admin_id,
        action="agent.create",
        target_type="agent",
        target_id=item.id,
        detail={"code": item.code},
    )
    return dump_agent(item, [])


async def update_agent(
    session: AsyncSession,
    *,
    admin_id: str,
    agent_id: str,
    name: str | None = None,
    description: str | None = None,
    tool_whitelist: list[str] | None = None,
    dataset_ids: list[str] | None = None,
    temperature: float | None = None,
    is_active: bool | None = None,
) -> dict[str, Any]:
    item = await get_agent(session, agent_id)
    if name is not None:
        name_n = name.strip()
        if not name_n:
            raise BizError(BizCode.INVALID_PARAMS, "Agent 名称不能为空")
        item.name = name_n
    if description is not None:
        item.description = description
    if tool_whitelist is not None:
        item.tool_whitelist = tool_whitelist
    if dataset_ids is not None:
        item.dataset_ids = await _assert_datasets(session, dataset_ids)
    if temperature is not None:
        item.temperature = _parse_temperature(temperature)
    if is_active is not None:
        item.is_active = is_active
    await session.flush()
    await session.refresh(item)
    await write_audit(
        session,
        admin_id=admin_id,
        action="agent.update",
        target_type="agent",
        target_id=item.id,
        detail={"code": item.code},
    )
    return dump_agent(item, (await _role_codes_for_agents(session, [item.id])).get(item.id, []))


async def delete_agent(
    session: AsyncSession,
    *,
    admin_id: str,
    agent_id: str,
) -> dict[str, Any]:
    item = await get_agent(session, agent_id)
    item.is_deleted = True
    item.is_active = False
    binds = (
        await session.execute(
            select(AgentRoleBind).where(
                AgentRoleBind.agent_id == item.id,
                AgentRoleBind.is_deleted.is_(False),
            )
        )
    ).scalars().all()
    for bind in binds:
        bind.is_deleted = True
    await session.flush()
    await write_audit(
        session,
        admin_id=admin_id,
        action="agent.delete",
        target_type="agent",
        target_id=item.id,
        detail={"code": item.code},
    )
    return {"id": item.id}


async def bind_agent_roles(
    session: AsyncSession,
    *,
    admin_id: str,
    agent_id: str,
    role_codes: list[str],
) -> dict[str, Any]:
    item = await get_agent(session, agent_id)
    unique_codes = [code.strip() for code in role_codes if code and code.strip()]
    roles: list[Role] = []
    if unique_codes:
        result = await session.execute(
            select(Role).where(Role.code.in_(unique_codes), Role.is_deleted.is_(False))
        )
        roles = list(result.scalars().all())
        found = {role.code for role in roles}
        missing = [code for code in unique_codes if code not in found]
        if missing:
            raise BizError(BizCode.ROLE_NOT_FOUND, f"角色不存在: {', '.join(missing)}")

    existing = list(
        (
            await session.execute(select(AgentRoleBind).where(AgentRoleBind.agent_id == item.id))
        ).scalars().all()
    )
    keep_ids = {role.id for role in roles}
    for bind in existing:
        if bind.role_id in keep_ids:
            bind.is_deleted = False
            keep_ids.discard(bind.role_id)
        else:
            bind.is_deleted = True
    for role in roles:
        if role.id in keep_ids:
            session.add(AgentRoleBind(agent_id=item.id, role_id=role.id))
    await session.flush()
    await session.refresh(item)
    await write_audit(
        session,
        admin_id=admin_id,
        action="agent.roles.bind",
        target_type="agent",
        target_id=item.id,
        detail={"role_codes": unique_codes},
    )
    return dump_agent(item, (await _role_codes_for_agents(session, [item.id])).get(item.id, []))
