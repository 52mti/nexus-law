from dataclasses import dataclass

from fastapi import Request

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError


@dataclass(slots=True, frozen=True)
class Principal:
    subject: str
    auth_type: str


def extract_api_key(request: Request) -> str | None:
    header_key = request.headers.get("x-api-key")
    if header_key and header_key.strip():
        return header_key.strip()

    authorization = request.headers.get("authorization")
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() == "bearer" and token.strip():
        return token.strip()
    return None


def authenticate_request(request: Request, settings: Settings | None = None) -> Principal | None:
    """Validate API key when auth is enabled. Returns principal or None if auth disabled."""
    settings = settings or get_settings()
    if not settings.is_auth_enabled:
        return Principal(subject="anonymous", auth_type="none")

    api_key = extract_api_key(request)
    if not api_key:
        raise AppError(
            "Missing API key. Provide X-API-Key or Authorization: Bearer <key>.",
            code="unauthorized",
            status_code=401,
        )
    if api_key not in settings.api_key_set:
        raise AppError(
            "Invalid API key",
            code="unauthorized",
            status_code=401,
        )
    # Do not log the raw key; use a short fingerprint as subject.
    subject = f"key:{api_key[:4]}…{api_key[-4:]}" if len(api_key) >= 8 else "key:***"
    return Principal(subject=subject, auth_type="api_key")
