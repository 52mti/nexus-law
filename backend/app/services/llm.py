from __future__ import annotations

from langchain_openai import ChatOpenAI
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    RateLimitError,
)

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError


def _map_llm_error(exc: Exception) -> AppError:
    if isinstance(exc, AppError):
        return exc
    if isinstance(exc, AuthenticationError):
        return AppError(
            "LLM authentication failed",
            code="llm_unauthorized",
            status_code=401,
        )
    if isinstance(exc, RateLimitError):
        return AppError(
            "LLM rate limit exceeded",
            code="llm_rate_limited",
            status_code=429,
        )
    if isinstance(exc, (APITimeoutError, TimeoutError)):
        return AppError(
            "LLM request timed out",
            code="llm_timeout",
            status_code=502,
        )
    if isinstance(exc, APIConnectionError):
        return AppError(
            "LLM upstream connection failed",
            code="llm_upstream_unavailable",
            status_code=502,
        )
    if isinstance(exc, APIStatusError):
        status = exc.status_code or 502
        if status == 401:
            return AppError("LLM authentication failed", code="llm_unauthorized", status_code=401)
        if status == 429:
            return AppError("LLM rate limit exceeded", code="llm_rate_limited", status_code=429)
        return AppError(
            "LLM upstream error",
            code="llm_upstream_error",
            status_code=502,
            details={"upstream_status": status},
        )
    return AppError(
        "LLM request failed",
        code="llm_request_failed",
        status_code=502,
    )


class LangChainLLMClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def _ensure_configured(self) -> None:
        if not self._settings.llm_configured:
            raise AppError(
                "LLM is not configured. Set LLM_API_KEY in environment.",
                code="llm_not_configured",
                status_code=503,
            )

    def build_chat_model(self, *, streaming: bool = False) -> ChatOpenAI:
        self._ensure_configured()
        return ChatOpenAI(
            api_key=self._settings.llm_api_key,
            base_url=self._settings.llm_base_url,
            model=self._settings.llm_model,
            timeout=self._settings.llm_timeout_seconds,
            max_retries=self._settings.llm_max_retries,
            streaming=streaming,
        )


_llm_client: LangChainLLMClient | None = None


def get_llm_client() -> LangChainLLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = LangChainLLMClient()
    return _llm_client
