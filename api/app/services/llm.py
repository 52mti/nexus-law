from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Literal, Protocol

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from loguru import logger
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    RateLimitError,
)

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError

ChatRole = Literal["system", "user", "assistant"]


@dataclass(slots=True)
class ChatMessageInput:
    role: ChatRole
    content: str


@dataclass(slots=True)
class ChatCompletionResult:
    content: str
    model: str
    latency_ms: float
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


class LLMClient(Protocol):
    async def chat_completions(self, messages: list[ChatMessageInput]) -> ChatCompletionResult: ...


def _to_langchain_messages(messages: list[ChatMessageInput]) -> list[BaseMessage]:
    mapped: list[BaseMessage] = []
    for message in messages:
        if message.role == "system":
            mapped.append(SystemMessage(content=message.content))
        elif message.role == "user":
            mapped.append(HumanMessage(content=message.content))
        elif message.role == "assistant":
            mapped.append(AIMessage(content=message.content))
        else:
            raise AppError(
                f"Unsupported chat role: {message.role}",
                code="invalid_chat_role",
                status_code=422,
            )
    return mapped


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

    # Backward-compatible alias used by older call sites/tests
    _build_model = build_chat_model

    async def chat_completions(self, messages: list[ChatMessageInput]) -> ChatCompletionResult:
        if not messages:
            raise AppError(
                "messages must not be empty",
                code="empty_messages",
                status_code=422,
            )

        model = self.build_chat_model()
        lc_messages = _to_langchain_messages(messages)
        started = time.perf_counter()

        try:
            response = await model.ainvoke(lc_messages)
        except Exception as exc:  # noqa: BLE001 - mapped to AppError
            logger.warning(
                "llm_error model={} message_count={} error_type={}",
                self._settings.llm_model,
                len(messages),
                type(exc).__name__,
            )
            raise _map_llm_error(exc) from exc

        latency_ms = (time.perf_counter() - started) * 1000
        content = response.content if isinstance(response.content, str) else str(response.content)
        usage = getattr(response, "usage_metadata", None) or {}
        prompt_tokens = usage.get("input_tokens")
        completion_tokens = usage.get("output_tokens")
        total_tokens = usage.get("total_tokens")

        if self._settings.llm_log_content:
            logger.info(
                "llm_chat model={} latency_ms={:.2f} prompt_tokens={} "
                "completion_tokens={} total_tokens={} message_count={} preview={}",
                self._settings.llm_model,
                latency_ms,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                len(messages),
                content[:120],
            )
        else:
            logger.info(
                "llm_chat model={} latency_ms={:.2f} prompt_tokens={} "
                "completion_tokens={} total_tokens={} message_count={}",
                self._settings.llm_model,
                latency_ms,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                len(messages),
            )

        return ChatCompletionResult(
            content=content,
            model=self._settings.llm_model,
            latency_ms=latency_ms,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
        )


_llm_client: LangChainLLMClient | None = None


def get_llm_client() -> LangChainLLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = LangChainLLMClient()
    return _llm_client
