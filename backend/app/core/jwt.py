from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Literal

import jwt

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError

UserTier = Literal["normal", "vip"]


def issuer_for_tier(tier: UserTier, settings: Settings) -> str:
    if tier == "vip":
        return settings.jwt_issuer_vip
    return settings.jwt_issuer_normal


def create_access_token(
    user_id: str,
    tier: UserTier,
    *,
    settings: Settings | None = None,
    expires_hours: int | None = None,
) -> str:
    settings = settings or get_settings()
    secret = settings.jwt_secret.strip()
    if not secret:
        raise AppError(
            "JWT is not configured on this server",
            code="jwt_not_configured",
            status_code=503,
        )

    lifetime = expires_hours if expires_hours is not None else settings.jwt_expire_hours
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "tier": tier,
        "iss": issuer_for_tier(tier, settings),
        "iat": now,
        "exp": now + timedelta(hours=lifetime),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_access_token(token: str, *, settings: Settings | None = None) -> dict[str, object]:
    settings = settings or get_settings()
    secret = settings.jwt_secret.strip()
    if not secret:
        raise AppError(
            "JWT is not configured on this server",
            code="jwt_not_configured",
            status_code=503,
        )

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["sub", "tier", "iss", "exp"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise AppError("JWT has expired", code="unauthorized", status_code=401) from exc
    except jwt.InvalidTokenError as exc:
        raise AppError("Invalid JWT", code="unauthorized", status_code=401) from exc

    iss = str(payload.get("iss", ""))
    tier = str(payload.get("tier", ""))
    allowed_issuers = {settings.jwt_issuer_normal, settings.jwt_issuer_vip}
    if iss not in allowed_issuers:
        raise AppError("Invalid JWT issuer", code="unauthorized", status_code=401)
    if tier not in {"normal", "vip"}:
        raise AppError("Invalid JWT tier", code="unauthorized", status_code=401)
    if (tier == "vip" and iss != settings.jwt_issuer_vip) or (
        tier == "normal" and iss != settings.jwt_issuer_normal
    ):
        raise AppError("JWT issuer does not match tier", code="unauthorized", status_code=401)

    return payload
