from __future__ import annotations

import asyncio
import re
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.biz import BizCode, BizError
from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.core.jwt import UserTier, create_access_token
from app.core.password import hash_password, verify_password
from app.db.models import (
    Role,
    User,
    UserRole,
    UserStatus,
    VerificationCode,
    VerificationScene,
)
from app.schemas.account import UserProfile
from app.services import cos_storage

PHONE_RE = re.compile(r"^\+?\d{8,20}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CODE_TTL = timedelta(minutes=5)
CODE_COOLDOWN = timedelta(seconds=60)
DEFAULT_ROLE_CODE = "user"
ADMIN_LIKE_ROLES = {"super_admin", "admin", "lawyer"}


def _now() -> datetime:
    return datetime.now(UTC)


def normalize_phone(value: str | None) -> str | None:
    if value is None:
        return None
    compact = re.sub(r"[\s-]", "", value.strip())
    return compact or None


def normalize_email(value: str | None) -> str | None:
    if value is None:
        return None
    compact = value.strip().lower()
    return compact or None


def resolve_contact(
    *,
    phone: str | None,
    email: str | None,
) -> tuple[str, str]:
    phone_n = normalize_phone(phone)
    email_n = normalize_email(email)
    if phone_n and email_n:
        raise BizError(BizCode.INVALID_PARAMS, "请只填写手机号或邮箱中的一项")
    if phone_n:
        if not PHONE_RE.match(phone_n):
            raise BizError(BizCode.INVALID_CONTACT, "手机号格式不正确")
        return phone_n, "phone"
    if email_n:
        if not EMAIL_RE.match(email_n):
            raise BizError(BizCode.INVALID_CONTACT, "邮箱格式不正确")
        return email_n, "email"
    raise BizError(BizCode.INVALID_PARAMS, "请填写手机号或邮箱")


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


async def _load_roles(session: AsyncSession, user: User) -> list[str]:
    result = await session.execute(
        select(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(
            UserRole.user_id == user.id,
            UserRole.is_deleted.is_(False),
            Role.is_deleted.is_(False),
        )
    )
    return list(result.scalars().all())


def to_profile(user: User, role_codes: list[str]) -> UserProfile:
    return UserProfile(
        id=user.id,
        email=user.email,
        phone=user.phone,
        nickname=user.nickname,
        avatar_url=user.avatar_url,
        points=user.points,
        status=user.status,
        role_codes=role_codes,
        membership=None,
    )


def _tier_for_roles(role_codes: list[str]) -> UserTier:
    if ADMIN_LIKE_ROLES.intersection(role_codes):
        return "vip"
    return "normal"


def issue_token(user: User, role_codes: list[str], *, settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    return create_access_token(
        user.id,
        _tier_for_roles(role_codes),
        role_codes=role_codes,
        settings=settings,
    )


def auth_payload(
    user: User,
    role_codes: list[str],
    *,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    return {
        "access_token": issue_token(user, role_codes, settings=settings),
        "token_type": "bearer",
        "expires_in_hours": settings.jwt_expire_hours,
        "user": to_profile(user, role_codes).model_dump(),
    }


async def get_active_user_by_id(session: AsyncSession, user_id: str) -> User:
    result = await session.execute(
        select(User)
        .where(User.id == user_id, User.is_deleted.is_(False))
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise BizError(BizCode.UNAUTHORIZED, "未登录或登录已过期")
    if user.status != UserStatus.ACTIVE.value:
        raise BizError(BizCode.USER_DISABLED, "账号已被禁用")
    return user


async def _find_user_by_contact(
    session: AsyncSession,
    *,
    target: str,
    channel: str,
) -> User | None:
    if channel == "phone":
        stmt = select(User).where(User.phone == target, User.is_deleted.is_(False))
    else:
        stmt = select(User).where(User.email == target, User.is_deleted.is_(False))
    result = await session.execute(
        stmt.options(selectinload(User.user_roles).selectinload(UserRole.role))
    )
    return result.scalar_one_or_none()


async def ensure_role(session: AsyncSession, code: str) -> Role:
    result = await session.execute(
        select(Role).where(Role.code == code, Role.is_deleted.is_(False))
    )
    role = result.scalar_one_or_none()
    if role:
        return role
    names = {
        "user": "普通用户",
        "lawyer": "专业律师",
        "admin": "运营管理员",
        "super_admin": "超级管理员",
    }
    role = Role(code=code, name=names.get(code, code), description=None)
    session.add(role)
    await session.flush()
    return role


async def _bind_role(session: AsyncSession, user: User, role: Role) -> None:
    result = await session.execute(
        select(UserRole).where(
            UserRole.user_id == user.id,
            UserRole.role_id == role.id,
            UserRole.is_deleted.is_(False),
        )
    )
    if result.scalar_one_or_none():
        return
    session.add(UserRole(user_id=user.id, role_id=role.id))
    await session.flush()


async def send_code(
    session: AsyncSession,
    *,
    scene: str,
    phone: str | None,
    email: str | None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    try:
        VerificationScene(scene)
    except ValueError as exc:
        raise BizError(BizCode.INVALID_PARAMS, "验证码场景不正确") from exc

    target, channel = resolve_contact(phone=phone, email=email)
    existing_user = await _find_user_by_contact(session, target=target, channel=channel)

    if scene == VerificationScene.REGISTER.value and existing_user:
        if channel == "phone":
            raise BizError(BizCode.PHONE_REGISTERED, "该手机号已注册")
        raise BizError(BizCode.EMAIL_REGISTERED, "该邮箱已注册")
    if (
        scene in {VerificationScene.LOGIN.value, VerificationScene.RESET_PASSWORD.value}
        and not existing_user
    ):
        raise BizError(BizCode.USER_NOT_FOUND, "用户不存在")

    now = _now()
    recent = await session.execute(
        select(VerificationCode)
        .where(
            VerificationCode.target == target,
            VerificationCode.scene == scene,
            VerificationCode.is_deleted.is_(False),
            VerificationCode.created_at >= now - CODE_COOLDOWN,
        )
        .order_by(VerificationCode.created_at.desc())
        .limit(1)
    )
    if recent.scalar_one_or_none():
        raise BizError(BizCode.CODE_TOO_FREQUENT, "验证码发送过于频繁，请稍后再试")

    old_codes = await session.execute(
        select(VerificationCode).where(
            VerificationCode.target == target,
            VerificationCode.scene == scene,
            VerificationCode.used.is_(False),
            VerificationCode.is_deleted.is_(False),
        )
    )
    for item in old_codes.scalars().all():
        item.used = True

    code = _generate_code()
    session.add(
        VerificationCode(
            target=target,
            channel=channel,
            scene=scene,
            code=code,
            expires_at=now + CODE_TTL,
            used=False,
        )
    )
    await session.flush()
    logger.info("verification_code_sent scene={} channel={} target={}", scene, channel, target)

    data: dict[str, Any] = {"expire_seconds": int(CODE_TTL.total_seconds())}
    if settings.debug:
        data["code"] = code
    return data


async def _consume_code(
    session: AsyncSession,
    *,
    target: str,
    scene: str,
    code: str,
) -> None:
    if not code or not code.strip():
        raise BizError(BizCode.INVALID_CODE, "验证码不正确")
    now = _now()
    result = await session.execute(
        select(VerificationCode)
        .where(
            VerificationCode.target == target,
            VerificationCode.scene == scene,
            VerificationCode.code == code.strip(),
            VerificationCode.used.is_(False),
            VerificationCode.is_deleted.is_(False),
        )
        .order_by(VerificationCode.created_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise BizError(BizCode.INVALID_CODE, "验证码不正确")
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at < now:
        raise BizError(BizCode.CODE_EXPIRED, "验证码已过期")
    record.used = True
    await session.flush()


async def register(
    session: AsyncSession,
    *,
    code: str,
    password: str,
    phone: str | None,
    email: str | None,
    nickname: str | None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    target, channel = resolve_contact(phone=phone, email=email)
    if len(password) < 8:
        raise BizError(BizCode.INVALID_PASSWORD, "密码至少 8 位")
    await _consume_code(session, target=target, scene=VerificationScene.REGISTER.value, code=code)

    existing = await _find_user_by_contact(session, target=target, channel=channel)
    if existing:
        if channel == "phone":
            raise BizError(BizCode.PHONE_REGISTERED, "该手机号已注册")
        raise BizError(BizCode.EMAIL_REGISTERED, "该邮箱已注册")

    user = User(
        phone=target if channel == "phone" else None,
        email=target if channel == "email" else None,
        password_hash=hash_password(password),
        nickname=(nickname or "").strip() or None,
        status=UserStatus.ACTIVE.value,
        points=0,
    )
    session.add(user)
    await session.flush()
    role = await ensure_role(session, DEFAULT_ROLE_CODE)
    await _bind_role(session, user, role)
    role_codes = await _load_roles(session, user)
    return auth_payload(user, role_codes, settings=settings)


async def login(
    session: AsyncSession,
    *,
    login_type: str,
    phone: str | None,
    email: str | None,
    password: str | None,
    code: str | None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    target, channel = resolve_contact(phone=phone, email=email)
    user = await _find_user_by_contact(session, target=target, channel=channel)
    if not user:
        raise BizError(BizCode.USER_NOT_FOUND, "用户不存在")
    if user.status != UserStatus.ACTIVE.value:
        raise BizError(BizCode.USER_DISABLED, "账号已被禁用")

    if login_type == "code":
        await _consume_code(
            session,
            target=target,
            scene=VerificationScene.LOGIN.value,
            code=code or "",
        )
    elif login_type == "password":
        if not password:
            raise BizError(BizCode.INVALID_PARAMS, "请输入密码")
        if not user.password_hash or not verify_password(password, user.password_hash):
            raise BizError(BizCode.PASSWORD_WRONG, "账号或密码错误")
    else:
        raise BizError(BizCode.INVALID_PARAMS, "登录方式不正确")

    role_codes = await _load_roles(session, user)
    return auth_payload(user, role_codes, settings=settings)


async def reset_password(
    session: AsyncSession,
    *,
    code: str,
    new_password: str,
    phone: str | None,
    email: str | None,
) -> dict[str, Any]:
    target, channel = resolve_contact(phone=phone, email=email)
    if len(new_password) < 8:
        raise BizError(BizCode.INVALID_PASSWORD, "密码至少 8 位")
    user = await _find_user_by_contact(session, target=target, channel=channel)
    if not user:
        raise BizError(BizCode.USER_NOT_FOUND, "用户不存在")
    await _consume_code(
        session,
        target=target,
        scene=VerificationScene.RESET_PASSWORD.value,
        code=code,
    )
    user.password_hash = hash_password(new_password)
    await session.flush()
    return {}


async def get_profile(session: AsyncSession, user: User) -> dict[str, Any]:
    role_codes = await _load_roles(session, user)
    return to_profile(user, role_codes).model_dump()


async def update_profile(
    session: AsyncSession,
    user: User,
    *,
    nickname: str | None,
    phone: str | None,
    email: str | None,
    code: str | None,
) -> dict[str, Any]:
    if nickname is not None:
        user.nickname = nickname.strip() or None

    if phone is not None or email is not None:
        target, channel = resolve_contact(phone=phone, email=email)
        current = user.phone if channel == "phone" else user.email
        if target != current:
            await _consume_code(
                session,
                target=target,
                scene=VerificationScene.BIND_CONTACT.value,
                code=code or "",
            )
            other = await _find_user_by_contact(session, target=target, channel=channel)
            if other and other.id != user.id:
                raise BizError(BizCode.CONTACT_TAKEN, "该手机号或邮箱已被占用")
            if channel == "phone":
                user.phone = target
            else:
                user.email = target

    await session.flush()
    return await get_profile(session, user)


async def update_password(
    session: AsyncSession,
    user: User,
    *,
    old_password: str,
    new_password: str,
) -> dict[str, Any]:
    if len(new_password) < 8:
        raise BizError(BizCode.INVALID_PASSWORD, "密码至少 8 位")
    if not user.password_hash or not verify_password(old_password, user.password_hash):
        raise BizError(BizCode.PASSWORD_WRONG, "原密码不正确")
    user.password_hash = hash_password(new_password)
    await session.flush()
    return {}


ALLOWED_AVATAR_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_AVATAR_BYTES = 2 * 1024 * 1024


async def upload_avatar(
    session: AsyncSession,
    user: User,
    *,
    filename: str,
    content: bytes,
    content_type: str | None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    if not content:
        raise BizError(BizCode.INVALID_AVATAR, "请选择头像文件")
    if len(content) > MAX_AVATAR_BYTES:
        raise BizError(BizCode.INVALID_AVATAR, "头像文件不能超过 2MB")
    mime = (content_type or "").split(";")[0].strip().lower()
    if mime not in ALLOWED_AVATAR_TYPES:
        raise BizError(BizCode.INVALID_AVATAR, "仅支持 jpg / png / webp / gif 头像")
    if not settings.cos_enabled:
        raise BizError(BizCode.COS_NOT_CONFIGURED, "头像存储未启用，请配置腾讯云 COS")

    object_key = cos_storage.build_avatar_object_key(
        user_id=user.id,
        filename=filename or f"avatar{ALLOWED_AVATAR_TYPES[mime]}",
        settings=settings,
    )
    old_key = cos_storage.avatar_key_from_url(user.avatar_url or "", settings=settings)
    try:
        uploaded = await asyncio.to_thread(
            cos_storage.upload_bytes,
            content=content,
            document_id=user.id,
            filename=filename or "avatar",
            content_type=mime,
            settings=settings,
            object_key=object_key,
        )
    except AppError as exc:
        raise BizError(BizCode.INTERNAL_ERROR, exc.message) from exc

    user.avatar_url = uploaded.url
    await session.flush()

    if old_key and old_key != object_key:
        try:
            await asyncio.to_thread(
                cos_storage.delete_object,
                key=old_key,
                settings=settings,
            )
        except AppError:
            logger.warning("avatar_old_delete_failed user_id={} key={}", user.id, old_key)

    return await get_profile(session, user)
