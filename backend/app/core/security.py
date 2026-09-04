from dataclasses import dataclass

from fastapi import Request

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.core.jwt import UserTier, decode_access_token


@dataclass(slots=True, frozen=True)
class Principal:
    subject: str
    auth_type: str
    tier: UserTier = "normal"

    @property
    def is_vip(self) -> bool:
        return self.tier == "vip"


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


def _principal_from_kong_headers(request: Request) -> Principal | None:
    gateway = request.headers.get("x-gateway-auth")
    user_id = request.headers.get("x-user-id")
    tier = request.headers.get("x-user-tier", "normal")
    if gateway != "kong" or not user_id or not user_id.strip():
        return None
    if tier not in {"normal", "vip"}:
        tier = "normal"
    return Principal(
        subject=user_id.strip(),
        auth_type="kong_jwt",
        tier=tier,  # type: ignore[arg-type]
    )


def _principal_from_bearer_jwt(request: Request, settings: Settings) -> Principal | None:
    authorization = request.headers.get("authorization")
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    if not settings.jwt_secret.strip():
        return None

    payload = decode_access_token(token.strip(), settings=settings)
    subject = str(payload["sub"])
    tier = str(payload["tier"])
    return Principal(subject=subject, auth_type="jwt", tier=tier)  # type: ignore[arg-type]


def authenticate_request(request: Request, settings: Settings | None = None) -> Principal | None:
    """Resolve caller identity from Kong headers, JWT, or API key."""
    settings = settings or get_settings()
    if not settings.is_auth_enabled:
        return Principal(subject="anonymous", auth_type="none")

    if settings.trust_kong_headers:
        kong_principal = _principal_from_kong_headers(request)
        if kong_principal is not None:
            return kong_principal

    jwt_principal = _principal_from_bearer_jwt(request, settings)
    if jwt_principal is not None:
        return jwt_principal

    api_key = request.headers.get("x-api-key")
    if api_key and api_key.strip():
        if api_key.strip() not in settings.api_key_set:
            raise AppError(
                "Invalid API key",
                code="unauthorized",
                status_code=401,
            )
        subject = (
            f"key:{api_key.strip()[:4]}…{api_key.strip()[-4:]}"
            if len(api_key.strip()) >= 8
            else "key:***"
        )
        return Principal(subject=subject, auth_type="api_key")

    authorization = request.headers.get("authorization")
    if authorization and authorization.lower().startswith("bearer "):
        raise AppError(
            "Invalid or expired JWT",
            code="unauthorized",
            status_code=401,
        )

    raise AppError(
        "Missing credentials. Use Authorization: Bearer <jwt> or X-API-Key.",
        code="unauthorized",
        status_code=401,
    )
