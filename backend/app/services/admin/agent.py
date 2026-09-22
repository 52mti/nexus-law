from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.agents.templates import (
    LEGAL_QA_REACT,
    SYSTEM_AGENT_CODE,
    known_graph_codes,
    list_templates,
)
from app.core.biz import BizCode, BizError
from app.db.models import (
    Agent,
    AgentRoleBind,
    AgentRun,
    Dataset,
    Role,
    UserRole,
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
        "graph_code": item.graph_code or LEGAL_QA_REACT,
        "is_system": bool(item.is_system),
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
    graph_code: str | None = None,
) -> dict[str, Any]:
    name_n = (name or "").strip()
    code_n = (code or "").strip()
    if not name_n or not code_n:
        raise BizError(BizCode.INVALID_PARAMS, "Agent 名称和编码不能为空")
    template_code = (graph_code or LEGAL_QA_REACT).strip()
    if template_code not in known_graph_codes():
        raise BizError(BizCode.AGENT_TEMPLATE_INVALID, "未知的 Agent 模板")
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
        if not existing.is_system:
            existing.graph_code = template_code
        item = existing
    else:
        item = Agent(
            name=name_n,
            code=code_n,
            description=description,
            tool_whitelist=tool_whitelist or [],
            dataset_ids=datasets,
            graph_code=template_code,
            is_system=False,
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
    if item.is_system:
        raise BizError(BizCode.AGENT_PROTECTED, "系统 Agent 不可删除")
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


def list_agent_templates() -> list[dict[str, str]]:
    return list_templates()


async def resolve_agent_for_user(session: AsyncSession, user_id: str) -> Agent | None:
    role_ids = list(
        (
            await session.execute(
                select(UserRole.role_id).where(
                    UserRole.user_id == user_id,
                    UserRole.is_deleted.is_(False),
                )
            )
        )
        .scalars()
        .all()
    )
    candidates: list[Agent] = []
    if role_ids:
        agent_ids = list(
            (
                await session.execute(
                    select(AgentRoleBind.agent_id).where(
                        AgentRoleBind.role_id.in_(role_ids),
                        AgentRoleBind.is_deleted.is_(False),
                    )
                )
            )
            .scalars()
            .all()
        )
        if agent_ids:
            candidates = list(
                (
                    await session.execute(
                        select(Agent).where(
                            Agent.id.in_(agent_ids),
                            Agent.is_deleted.is_(False),
                            Agent.is_active.is_(True),
                        )
                    )
                )
                .scalars()
                .all()
            )
    if not candidates:
        result = await session.execute(
            select(Agent).where(
                Agent.code == SYSTEM_AGENT_CODE,
                Agent.is_deleted.is_(False),
                Agent.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    def _rank(item: Agent) -> tuple[int, float]:
        system = 0 if item.is_system or item.code == SYSTEM_AGENT_CODE else 1
        created = item.created_at.timestamp() if item.created_at else 0.0
        return (system, created)

    candidates.sort(key=_rank)
    return candidates[0]


async def resolve_dataset_collections(
    session: AsyncSession,
    dataset_ids: list[str] | None,
) -> list[str]:
    ids = [item.strip() for item in (dataset_ids or []) if item and item.strip()]
    if not ids:
        return []
    rows = list(
        (
            await session.execute(
                select(Dataset.weaviate_collection).where(
                    Dataset.id.in_(ids),
                    Dataset.is_deleted.is_(False),
                )
            )
        )
        .scalars()
        .all()
    )
    return [name for name in rows if name]


def _run_timeline(trace: list | dict | None) -> list[dict[str, Any]]:
    items = trace if isinstance(trace, list) else []
    events: list[dict[str, Any]] = [{"type": "agent", "name": "agent"}]
    for item in items:
        if not isinstance(item, dict):
            continue
        events.append(
            {
                "type": "tool",
                "name": item.get("name"),
                "args": item.get("args"),
                "empty_retrieval": bool(item.get("empty_retrieval")),
            }
        )
        events.append({"type": "agent", "name": "agent"})
    return events


def dump_agent_run(
    item: AgentRun,
    *,
    agent: Agent | None = None,
    include_timeline: bool = False,
) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": item.id,
        "conversation_id": item.conversation_id,
        "agent_id": item.agent_id,
        "agent_code": agent.code if agent else None,
        "agent_name": agent.name if agent else None,
        "prompt_id": item.prompt_id,
        "user_id": item.user_id,
        "model": item.model,
        "latency_ms": float(item.latency_ms) if item.latency_ms is not None else None,
        "iterations": item.iterations,
        "error_code": item.error_code,
        "token_input": item.token_input,
        "token_output": item.token_output,
        "retrieval_hit": item.retrieval_hit,
        "used_search": item.used_search,
        "used_tools": item.used_tools,
        "hit_max_iterations": item.hit_max_iterations,
        "created_at": iso(item.created_at),
    }
    if include_timeline:
        data["tool_trace"] = item.tool_trace_json or []
        data["timeline"] = _run_timeline(item.tool_trace_json)
        data["sources"] = item.sources_json or []
    return data


def _run_filters(
    *,
    agent_id: str | None,
    user_id: str | None,
    retrieval_hit: bool | None,
    error: bool | None,
    start_at: datetime | None,
    end_at: datetime | None,
) -> list:
    filters = [AgentRun.is_deleted.is_(False)]
    if agent_id:
        filters.append(AgentRun.agent_id == agent_id)
    if user_id:
        filters.append(AgentRun.user_id == user_id)
    if retrieval_hit is not None:
        filters.append(AgentRun.retrieval_hit.is_(retrieval_hit))
    if error is True:
        filters.append(AgentRun.error_code.is_not(None))
    elif error is False:
        filters.append(AgentRun.error_code.is_(None))
    if start_at:
        filters.append(AgentRun.created_at >= start_at)
    if end_at:
        filters.append(AgentRun.created_at <= end_at)
    return filters


async def list_agent_runs(
    session: AsyncSession,
    *,
    agent_id: str | None = None,
    user_id: str | None = None,
    retrieval_hit: bool | None = None,
    error: bool | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = _run_filters(
        agent_id=agent_id,
        user_id=user_id,
        retrieval_hit=retrieval_hit,
        error=error,
        start_at=start_at,
        end_at=end_at,
    )
    total = int(
        (
            await session.execute(select(func.count()).select_from(AgentRun).where(*filters))
        ).scalar_one()
    )
    rows = list(
        (
            await session.execute(
                select(AgentRun)
                .where(*filters)
                .order_by(AgentRun.created_at.desc(), AgentRun.id.desc())
                .offset((current - 1) * size)
                .limit(size)
            )
        )
        .scalars()
        .all()
    )
    agent_ids = [item.agent_id for item in rows if item.agent_id]
    agents: dict[str, Agent] = {}
    if agent_ids:
        found = (
            await session.execute(select(Agent).where(Agent.id.in_(agent_ids)))
        ).scalars().all()
        agents = {item.id: item for item in found}
    return {
        "records": [
            dump_agent_run(item, agent=agents.get(item.agent_id or ""))
            for item in rows
        ],
        **page_meta(total, current, size),
    }


async def get_agent_run_detail(session: AsyncSession, run_id: str) -> dict[str, Any]:
    result = await session.execute(
        select(AgentRun).where(AgentRun.id == run_id, AgentRun.is_deleted.is_(False))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise BizError(BizCode.AGENT_RUN_NOT_FOUND, "运行记录不存在")
    agent = await session.get(Agent, item.agent_id) if item.agent_id else None
    return dump_agent_run(item, agent=agent, include_timeline=True)


def _ratio(num: int, den: int) -> float:
    if den <= 0:
        return 0.0
    return round(num / den, 4)


async def agent_run_stats(
    session: AsyncSession,
    *,
    agent_id: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> dict[str, Any]:
    filters = _run_filters(
        agent_id=agent_id,
        user_id=None,
        retrieval_hit=None,
        error=None,
        start_at=start_at,
        end_at=end_at,
    )
    total = int(
        (
            await session.execute(select(func.count()).select_from(AgentRun).where(*filters))
        ).scalar_one()
    )
    used_search = int(
        (
            await session.execute(
                select(func.count())
                .select_from(AgentRun)
                .where(*filters, AgentRun.used_search.is_(True))
            )
        ).scalar_one()
    )
    empty_search = int(
        (
            await session.execute(
                select(func.count())
                .select_from(AgentRun)
                .where(
                    *filters,
                    AgentRun.used_search.is_(True),
                    AgentRun.retrieval_hit.is_(False),
                )
            )
        ).scalar_one()
    )
    used_tools = int(
        (
            await session.execute(
                select(func.count())
                .select_from(AgentRun)
                .where(*filters, AgentRun.used_tools.is_(True))
            )
        ).scalar_one()
    )
    hit_max = int(
        (
            await session.execute(
                select(func.count())
                .select_from(AgentRun)
                .where(*filters, AgentRun.hit_max_iterations.is_(True))
            )
        ).scalar_one()
    )
    avg_latency = (
        await session.execute(
            select(func.avg(AgentRun.latency_ms)).where(*filters)
        )
    ).scalar_one()
    grouped = (
        await session.execute(
            select(
                AgentRun.agent_id,
                func.count().label("total"),
                func.sum(case((AgentRun.used_search.is_(True), 1), else_=0)).label("used_search"),
                func.sum(
                    case(
                        (
                            AgentRun.used_search.is_(True) & AgentRun.retrieval_hit.is_(False),
                            1,
                        ),
                        else_=0,
                    )
                ).label("empty_search"),
                func.sum(case((AgentRun.used_tools.is_(True), 1), else_=0)).label(
                    "used_tools"
                ),
                func.sum(
                    case((AgentRun.hit_max_iterations.is_(True), 1), else_=0)
                ).label("hit_max"),
                func.avg(AgentRun.latency_ms).label("avg_latency"),
            )
            .where(*filters)
            .group_by(AgentRun.agent_id)
        )
    ).all()
    agent_ids = [row.agent_id for row in grouped if row.agent_id]
    agents: dict[str, Agent] = {}
    if agent_ids:
        found = (
            await session.execute(select(Agent).where(Agent.id.in_(agent_ids)))
        ).scalars().all()
        agents = {item.id: item for item in found}
    by_agent = []
    for row in grouped:
        agent = agents.get(row.agent_id) if row.agent_id else None
        row_total = int(row.total or 0)
        row_search = int(row.used_search or 0)
        by_agent.append(
            {
                "agent_id": row.agent_id,
                "agent_code": agent.code if agent else None,
                "agent_name": agent.name if agent else None,
                "total": row_total,
                "empty_retrieval_rate": _ratio(int(row.empty_search or 0), row_search),
                "tool_call_rate": _ratio(int(row.used_tools or 0), row_total),
                "avg_latency_ms": (
                    round(float(row.avg_latency), 2)
                    if row.avg_latency is not None
                    else None
                ),
                "hit_max_iterations_rate": _ratio(int(row.hit_max or 0), row_total),
            }
        )
    by_agent.sort(key=lambda item: item["total"], reverse=True)
    return {
        "total": total,
        "empty_retrieval_rate": _ratio(empty_search, used_search),
        "tool_call_rate": _ratio(used_tools, total),
        "avg_latency_ms": round(float(avg_latency), 2) if avg_latency is not None else None,
        "hit_max_iterations_rate": _ratio(hit_max, total),
        "by_agent": by_agent,
    }
