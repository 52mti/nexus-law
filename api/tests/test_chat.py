from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from openai import APIConnectionError, APITimeoutError, AuthenticationError, RateLimitError

from app.core.config import Settings
from app.core.exceptions import AppError
from app.main import app
from app.services.llm import (
    ChatCompletionResult,
    ChatMessageInput,
    LangChainLLMClient,
    _map_llm_error,
    get_llm_client,
)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_chat_completions_missing_api_key(client: AsyncClient) -> None:
    app.dependency_overrides[get_llm_client] = lambda: LangChainLLMClient(
        Settings(llm_api_key="")
    )
    response = await client.post(
        "/api/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "hello"}]},
    )
    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "llm_not_configured"


@pytest.mark.asyncio
async def test_chat_completions_success(client: AsyncClient) -> None:
    mock_client = AsyncMock()
    mock_client.chat_completions.return_value = ChatCompletionResult(
        content="这是法律咨询的参考答复",
        model="gpt-4o-mini",
        latency_ms=12.5,
        prompt_tokens=10,
        completion_tokens=20,
        total_tokens=30,
    )
    app.dependency_overrides[get_llm_client] = lambda: mock_client

    response = await client.post(
        "/api/v1/chat/completions",
        json={
            "messages": [
                {"role": "system", "content": "You are a legal assistant."},
                {"role": "user", "content": "劳动合同怎么签？"},
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["role"] == "assistant"
    assert body["data"]["content"] == "这是法律咨询的参考答复"
    assert body["data"]["usage"]["total_tokens"] == 30
    mock_client.chat_completions.assert_awaited_once()


def test_map_llm_errors() -> None:
    request = MagicMock()
    response = MagicMock()
    response.status_code = 401
    response.headers = {}
    response.request = request

    auth = AuthenticationError(message="bad key", response=response, body=None)
    mapped_auth = _map_llm_error(auth)
    assert mapped_auth.status_code == 401
    assert mapped_auth.code == "llm_unauthorized"

    response.status_code = 429
    rate = RateLimitError(message="slow down", response=response, body=None)
    mapped_rate = _map_llm_error(rate)
    assert mapped_rate.status_code == 429
    assert mapped_rate.code == "llm_rate_limited"

    timeout = APITimeoutError(request=request)
    mapped_timeout = _map_llm_error(timeout)
    assert mapped_timeout.status_code == 502
    assert mapped_timeout.code == "llm_timeout"

    conn = APIConnectionError(message="offline", request=request)
    mapped_conn = _map_llm_error(conn)
    assert mapped_conn.status_code == 502
    assert mapped_conn.code == "llm_upstream_unavailable"


@pytest.mark.asyncio
async def test_chat_completions_propagates_mapped_error(client: AsyncClient) -> None:
    mock_client = AsyncMock()
    mock_client.chat_completions.side_effect = AppError(
        "LLM rate limit exceeded",
        code="llm_rate_limited",
        status_code=429,
    )
    app.dependency_overrides[get_llm_client] = lambda: mock_client

    response = await client.post(
        "/api/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "hello"}]},
    )
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "llm_rate_limited"


@pytest.mark.asyncio
async def test_llm_client_invokes_model() -> None:
    settings = Settings(llm_api_key="test-key", llm_model="gpt-test", llm_log_content=False)
    client = LangChainLLMClient(settings)
    mock_model = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = "ok"
    mock_response.usage_metadata = {
        "input_tokens": 1,
        "output_tokens": 2,
        "total_tokens": 3,
    }
    mock_model.ainvoke.return_value = mock_response
    client.build_chat_model = lambda: mock_model  # type: ignore[method-assign]

    result = await client.chat_completions([ChatMessageInput(role="user", content="hi")])
    assert result.content == "ok"
    assert result.total_tokens == 3
    mock_model.ainvoke.assert_awaited_once()
