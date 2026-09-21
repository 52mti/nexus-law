from __future__ import annotations

from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.biz import BizCode, BizError
from app.db.models import (
    Permission,
    PointLedgerType,
    Role,
    RolePermission,
    User,
    UserRole,
    UserStatus,
)
from app.services.admin.common import (
    PROTECTED_ROLE_CODES,
    SUPER_ADMIN_CODE,
    iso,
    page_meta,
)
from app.services.audit import write_audit
from app.services.commerce import _lock_user, add_points


async def load_role_codes(session: AsyncSession, user_id: str) -> list[str]:
    result = await session.execute(
        select(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(
            UserRole.user_id == user_id,
            UserRole.is_deleted.is_(False),
            Role.is_deleted.is_(False),
        )
    )
    return list(result.scalars().all())


async def load_permission_codes(session: AsyncSession, user_id: str) -> list[str]:
    result = await session.execute(
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(
            UserRole.user_id == user_id,
            UserRole.is_deleted.is_(False),
            Role.is_deleted.is_(False),
            RolePermission.is_deleted.is_(False),
            Permission.is_deleted.is_(False),
        )
    )
    return sorted(set(result.scalars().all()))


def dump_user(user: User, role_codes: list[str] | None = None) -> dict[str, Any]:
    codes = role_codes
    if codes is None:
        codes = [
            item.role.code
            for item in user.user_roles
            if not item.is_deleted and item.role and not item.role.is_deleted
        ]
    return {
        "id": user.id,
        "email": user.email,
        "phone": user.phone,
        "nickname": user.nickname,
        "avatar_url": user.avatar_url,
        "points": user.points,
        "status": user.status,
        "role_codes": codes,
        "created_at": iso(user.created_at),
        "updated_at": iso(user.updated_at),
    }


def dump_role(role: Role, permission_codes: list[str] | None = None) -> dict[str, Any]:
    codes = permission_codes
    if codes is None and role.role_permissions:
        codes = [
            item.permission.code
            for item in role.role_permissions
            if not item.is_deleted and item.permission and not item.permission.is_deleted
        ]
    return {
        "id": role.id,
        "code": role.code,
        "name": role.name,
        "description": role.description,
        "permission_codes": codes or [],
        "created_at": iso(role.created_at),
        "updated_at": iso(role.updated_at),
    }


def dump_permission(item: Permission) -> dict[str, Any]:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "type": item.type,
        "created_at": iso(item.created_at),
    }


async def _role_codes_for_users(
    session: AsyncSession,
    user_ids: list[str],
) -> dict[str, list[str]]:
    if not user_ids:
        return {}
    result = await session.execute(
        select(UserRole.user_id, Role.code)
        .join(Role, Role.id == UserRole.role_id)
        .where(
            UserRole.user_id.in_(user_ids),
            UserRole.is_deleted.is_(False),
            Role.is_deleted.is_(False),
        )
    )
    mapping: dict[str, list[str]] = {user_id: [] for user_id in user_ids}
    for user_id, code in result.all():
        mapping.setdefault(user_id, []).append(code)
    return mapping


async def list_active_super_admin_ids(session: AsyncSession) -> list[str]:
    result = await session.execute(
        select(User.id)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(
            Role.code == SUPER_ADMIN_CODE,
            Role.is_deleted.is_(False),
            UserRole.is_deleted.is_(False),
            User.is_deleted.is_(False),
            User.status == UserStatus.ACTIVE.value,
        )
    )
    return list(result.scalars().all())


async def assert_not_last_super_admin(session: AsyncSession, user_id: str) -> None:
    ids = await list_active_super_admin_ids(session)
    if user_id in ids and len(ids) <= 1:
        raise BizError(BizCode.LAST_SUPER_ADMIN, "不能对最后一个超级管理员执行该操作")


async def _permission_codes_for_roles(
    session: AsyncSession,
    role_ids: list[str],
) -> dict[str, list[str]]:
    if not role_ids:
        return {}
    result = await session.execute(
        select(RolePermission.role_id, Permission.code)
        .join(Permission, Permission.id == RolePermission.permission_id)
        .where(
            RolePermission.role_id.in_(role_ids),
            RolePermission.is_deleted.is_(False),
            Permission.is_deleted.is_(False),
        )
    )
    mapping: dict[str, list[str]] = {role_id: [] for role_id in role_ids}
    for role_id, code in result.all():
        mapping.setdefault(role_id, []).append(code)
    return mapping


async def load_role_permission_codes(session: AsyncSession, role_id: str) -> list[str]:
    mapping = await _permission_codes_for_roles(session, [role_id])
    return mapping.get(role_id, [])


async def get_user(session: AsyncSession, user_id: str) -> User:
    result = await session.execute(
        select(User)
        .where(User.id == user_id, User.is_deleted.is_(False))
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise BizError(BizCode.USER_NOT_FOUND, "用户不存在")
    return user


async def list_users(
    session: AsyncSession,
    *,
    keyword: str | None = None,
    status: str | None = None,
    role_code: str | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [User.is_deleted.is_(False)]
    if status:
        filters.append(User.status == status)
    if keyword and keyword.strip():
        like = f"%{keyword.strip()}%"
        filters.append(
            or_(
                User.phone.ilike(like),
                User.email.ilike(like),
                User.nickname.ilike(like),
            )
        )

    stmt = select(User).where(*filters)
    if role_code:
        stmt = (
            stmt.join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(
                Role.code == role_code,
                Role.is_deleted.is_(False),
                UserRole.is_deleted.is_(False),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await session.execute(count_stmt)).scalar_one())
    rows = list(
        (
            await session.execute(
                stmt.order_by(User.created_at.desc(), User.id.desc())
                .offset((current - 1) * size)
                .limit(size)
            )
        ).scalars()
        .unique()
        .all()
    )
    role_map = await _role_codes_for_users(session, [item.id for item in rows])
    return {
        "records": [dump_user(item, role_map.get(item.id, [])) for item in rows],
        **page_meta(total, current, size),
    }


async def get_user_detail(session: AsyncSession, user_id: str) -> dict[str, Any]:
    user = await get_user(session, user_id)
    codes = await load_role_codes(session, user.id)
    data = dump_user(user, codes)
    data["permission_codes"] = await load_permission_codes(session, user.id)
    return data


async def update_user_status(
    session: AsyncSession,
    *,
    admin_id: str,
    user_id: str,
    status: str,
) -> dict[str, Any]:
    if status not in {UserStatus.ACTIVE.value, UserStatus.DISABLED.value}:
        raise BizError(BizCode.INVALID_PARAMS, "用户状态不正确")
    user = await get_user(session, user_id)
    if status == UserStatus.DISABLED.value:
        await assert_not_last_super_admin(session, user.id)
    previous = user.status
    user.status = status
    await session.flush()
    await session.refresh(user)
    await write_audit(
        session,
        admin_id=admin_id,
        action="user.status.update",
        target_type="user",
        target_id=user.id,
        detail={"from": previous, "to": status},
    )
    return dump_user(user, await load_role_codes(session, user.id))


async def _roles_by_codes(session: AsyncSession, codes: list[str]) -> list[Role]:
    unique_codes = [code.strip() for code in codes if code and code.strip()]
    if not unique_codes:
        raise BizError(BizCode.INVALID_PARAMS, "请至少选择一个角色")
    result = await session.execute(
        select(Role).where(Role.code.in_(unique_codes), Role.is_deleted.is_(False))
    )
    roles = list(result.scalars().all())
    found = {item.code for item in roles}
    missing = [code for code in unique_codes if code not in found]
    if missing:
        raise BizError(BizCode.ROLE_NOT_FOUND, f"角色不存在: {', '.join(missing)}")
    return roles


async def assign_user_roles(
    session: AsyncSession,
    *,
    admin_id: str,
    user_id: str,
    role_codes: list[str],
) -> dict[str, Any]:
    user = await get_user(session, user_id)
    roles = await _roles_by_codes(session, role_codes)
    next_codes = {item.code for item in roles}
    current_codes = set(await load_role_codes(session, user.id))
    if SUPER_ADMIN_CODE in current_codes and SUPER_ADMIN_CODE not in next_codes:
        await assert_not_last_super_admin(session, user.id)

    existing = list(
        (
            await session.execute(select(UserRole).where(UserRole.user_id == user.id))
        ).scalars().all()
    )
    keep_ids = {item.id for item in roles}
    for bind in existing:
        if bind.role_id in keep_ids:
            bind.is_deleted = False
            keep_ids.discard(bind.role_id)
        else:
            bind.is_deleted = True
    for role in roles:
        if role.id in keep_ids:
            session.add(UserRole(user_id=user.id, role_id=role.id))
    await session.flush()
    await session.refresh(user)
    await write_audit(
        session,
        admin_id=admin_id,
        action="user.roles.assign",
        target_type="user",
        target_id=user.id,
        detail={"from": sorted(current_codes), "to": sorted(next_codes)},
    )
    return dump_user(user, await load_role_codes(session, user.id))


async def adjust_user_points(
    session: AsyncSession,
    *,
    admin_id: str,
    user_id: str,
    change: int,
    remark: str | None,
) -> dict[str, Any]:
    if change == 0:
        raise BizError(BizCode.INVALID_PARAMS, "调整积分不能为 0")
    user = await _lock_user(session, user_id)
    previous = user.points
    await add_points(
        session,
        user,
        change=change,
        ledger_type=PointLedgerType.ADMIN_ADJUST.value,
        biz_id=admin_id,
        remark=remark or "管理员调整积分",
    )
    await write_audit(
        session,
        admin_id=admin_id,
        action="user.points.adjust",
        target_type="user",
        target_id=user.id,
        detail={"from": previous, "change": change, "to": user.points, "remark": remark},
    )
    return dump_user(user, await load_role_codes(session, user.id))


async def list_roles(session: AsyncSession) -> dict[str, Any]:
    result = await session.execute(
        select(Role)
        .where(Role.is_deleted.is_(False))
        .options(selectinload(Role.role_permissions).selectinload(RolePermission.permission))
        .order_by(Role.created_at.asc())
    )
    roles = list(result.scalars().unique().all())
    perm_map = await _permission_codes_for_roles(session, [item.id for item in roles])
    records = [dump_role(item, perm_map.get(item.id, [])) for item in roles]
    return {"records": records, **page_meta(len(records), 1, max(len(records), 1))}


async def get_role(session: AsyncSession, role_id: str) -> Role:
    result = await session.execute(
        select(Role)
        .where(Role.id == role_id, Role.is_deleted.is_(False))
        .options(selectinload(Role.role_permissions).selectinload(RolePermission.permission))
    )
    role = result.scalar_one_or_none()
    if not role:
        raise BizError(BizCode.ROLE_NOT_FOUND, "角色不存在")
    return role


async def get_role_detail(session: AsyncSession, role_id: str) -> dict[str, Any]:
    role = await get_role(session, role_id)
    return dump_role(role, await load_role_permission_codes(session, role.id))


async def _get_role_by_code(
    session: AsyncSession,
    code: str,
    *,
    include_deleted: bool = True,
) -> Role | None:
    stmt = select(Role).where(Role.code == code)
    if not include_deleted:
        stmt = stmt.where(Role.is_deleted.is_(False))
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_role(
    session: AsyncSession,
    *,
    admin_id: str,
    code: str,
    name: str,
    description: str | None,
) -> dict[str, Any]:
    code_n = (code or "").strip()
    name_n = (name or "").strip()
    if not code_n or not name_n:
        raise BizError(BizCode.INVALID_PARAMS, "角色编码和名称不能为空")
    existing = await _get_role_by_code(session, code_n)
    if existing and not existing.is_deleted:
        raise BizError(BizCode.ROLE_CODE_TAKEN, "角色编码已存在")
    if existing and existing.is_deleted:
        existing.is_deleted = False
        existing.name = name_n
        existing.description = description
        role = existing
    else:
        role = Role(code=code_n, name=name_n, description=description)
        session.add(role)
    await session.flush()
    await session.refresh(role)
    await write_audit(
        session,
        admin_id=admin_id,
        action="role.create",
        target_type="role",
        target_id=role.id,
        detail={"code": role.code, "name": role.name},
    )
    return dump_role(role, await load_role_permission_codes(session, role.id))


async def update_role(
    session: AsyncSession,
    *,
    admin_id: str,
    role_id: str,
    name: str | None,
    description: str | None,
) -> dict[str, Any]:
    role = await get_role(session, role_id)
    if name is not None:
        name_n = name.strip()
        if not name_n:
            raise BizError(BizCode.INVALID_PARAMS, "角色名称不能为空")
        role.name = name_n
    if description is not None:
        role.description = description
    await session.flush()
    await session.refresh(role)
    await write_audit(
        session,
        admin_id=admin_id,
        action="role.update",
        target_type="role",
        target_id=role.id,
        detail={"name": role.name, "description": role.description},
    )
    return dump_role(role, await load_role_permission_codes(session, role.id))


async def delete_role(
    session: AsyncSession,
    *,
    admin_id: str,
    role_id: str,
) -> dict[str, Any]:
    role = await get_role(session, role_id)
    if role.code in PROTECTED_ROLE_CODES:
        raise BizError(BizCode.ROLE_PROTECTED, "超级管理员角色不可删除")
    role.is_deleted = True
    binds = (
        await session.execute(
            select(UserRole).where(UserRole.role_id == role.id, UserRole.is_deleted.is_(False))
        )
    ).scalars().all()
    for bind in binds:
        bind.is_deleted = True
    perm_binds = (
        await session.execute(
            select(RolePermission).where(
                RolePermission.role_id == role.id,
                RolePermission.is_deleted.is_(False),
            )
        )
    ).scalars().all()
    for bind in perm_binds:
        bind.is_deleted = True
    await session.flush()
    await write_audit(
        session,
        admin_id=admin_id,
        action="role.delete",
        target_type="role",
        target_id=role.id,
        detail={"code": role.code},
    )
    return {"id": role.id}


async def list_permissions(session: AsyncSession) -> dict[str, Any]:
    result = await session.execute(
        select(Permission).where(Permission.is_deleted.is_(False)).order_by(Permission.code.asc())
    )
    rows = list(result.scalars().all())
    return {
        "records": [dump_permission(item) for item in rows],
        **page_meta(len(rows), 1, max(len(rows), 1)),
    }


async def bind_role_permissions(
    session: AsyncSession,
    *,
    admin_id: str,
    role_id: str,
    permission_codes: list[str],
) -> dict[str, Any]:
    role = await get_role(session, role_id)
    unique_codes = [code.strip() for code in permission_codes if code and code.strip()]
    result = await session.execute(
        select(Permission).where(
            Permission.code.in_(unique_codes),
            Permission.is_deleted.is_(False),
        )
        if unique_codes
        else select(Permission).where(Permission.id.is_(None))
    )
    perms = list(result.scalars().all())
    found = {item.code for item in perms}
    missing = [code for code in unique_codes if code not in found]
    if missing:
        raise BizError(BizCode.PERMISSION_NOT_FOUND, f"权限点不存在: {', '.join(missing)}")

    existing = list(
        (
            await session.execute(
                select(RolePermission).where(RolePermission.role_id == role.id)
            )
        ).scalars().all()
    )
    keep_ids = {item.id for item in perms}
    previous = await load_role_permission_codes(session, role.id)
    for bind in existing:
        if bind.permission_id in keep_ids:
            bind.is_deleted = False
            keep_ids.discard(bind.permission_id)
        else:
            bind.is_deleted = True
    for perm in perms:
        if perm.id in keep_ids:
            session.add(RolePermission(role_id=role.id, permission_id=perm.id))
    await session.flush()
    codes = await load_role_permission_codes(session, role.id)
    await write_audit(
        session,
        admin_id=admin_id,
        action="role.permissions.bind",
        target_type="role",
        target_id=role.id,
        detail={"from": previous, "to": codes},
    )
    await session.refresh(role)
    return dump_role(role, codes)
