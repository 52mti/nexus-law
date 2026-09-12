from unittest.mock import MagicMock

import pytest
from openai import APIConnectionError, APITimeoutError, AuthenticationError, RateLimitError

from app.core.config import Settings
from app.core.exceptions import AppError
from app.services.llm import LangChainLLMClient, _map_llm_error


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


def test_build_chat_model_requires_api_key() -> None:
    client = LangChainLLMClient(Settings(llm_api_key=""))
    with pytest.raises(AppError) as exc:
        client.build_chat_model()
    assert exc.value.status_code == 503
    assert exc.value.code == "llm_not_configured"
