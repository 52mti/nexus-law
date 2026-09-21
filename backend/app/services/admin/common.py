from __future__ import annotations

from datetime import UTC, datetime

from app.core.biz import BizCode, BizError
from app.services.commerce import page_meta

ADMIN_ROLE_CODES = frozenset({"super_admin", "admin"})
SUPER_ADMIN_CODE = "super_admin"
PROTECTED_ROLE_CODES = frozenset({"super_admin"})
PROMPT_SYSTEM_SCENE = "system"


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def parse_dt(value: str | None) -> datetime | None:
    if value is None or not str(value).strip():
        return None
    raw = str(value).strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise BizError(BizCode.INVALID_PARAMS, "时间格式不正确") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed


def page_args(current: int, size: int) -> tuple[int, int]:
    return current, min(size, 100)


__all__ = [
    "ADMIN_ROLE_CODES",
    "PROTECTED_ROLE_CODES",
    "PROMPT_SYSTEM_SCENE",
    "SUPER_ADMIN_CODE",
    "iso",
    "page_args",
    "page_meta",
    "parse_dt",
]
