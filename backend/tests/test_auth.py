from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.requests import Request

from app.core.config import Settings, get_settings
from app.core.jwt import create_access_token
from app.core.security import Principal, authenticate_request
from app.main import app


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _request(headers: dict[str, str]) -> Request:
    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "GET",
            "path": "/",
            "raw_path": b"/",
            "query_string": b"",
            "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
            "client": ("testclient", 50000),
            "server": ("testserver", 80),
        }
    )


def test_kong_header_principal() -> None:
    settings = Settings(trust_kong_headers=True, auth_enabled=True)
    principal = authenticate_request(
        _request(
            {
                "X-Gateway-Auth": "kong",
                "X-User-Id": "user-42",
                "X-User-Tier": "vip",
            }
        ),
        settings,
    )
    assert principal == Principal(subject="user-42", auth_type="kong_jwt", tier="vip")


def test_bearer_jwt_principal() -> None:
    settings = Settings(jwt_secret="test-secret", auth_enabled=True)
    token = create_access_token("user-7", "normal", settings=settings)
    principal = authenticate_request(
        _request({"Authorization": f"Bearer {token}"}),
        settings,
    )
    assert principal == Principal(subject="user-7", auth_type="jwt", tier="normal")


@pytest.mark.asyncio
async def test_issue_token_endpoint() -> None:
    transport = ASGITransport(app=app)
    with patch(
        "app.api.v1.auth.get_settings",
        return_value=Settings(jwt_secret="test-secret"),
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/token",
                json={"user_id": "demo", "tier": "vip"},
            )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["tier"] == "vip"
    assert body["data"]["token_type"] == "bearer"
    assert body["data"]["access_token"]
