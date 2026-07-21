from __future__ import annotations

import time
from typing import Any

from langchain_core.embeddings import Embeddings
from langchain_openai import OpenAIEmbeddings
from loguru import logger
from openai import APIStatusError, NotFoundError, RateLimitError

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError

_MAX_EMBED_RETRIES = 4
_BASE_BACKOFF_SECONDS = 1.5


class RetryingEmbeddings(Embeddings):
    """Wrap an Embeddings implementation with exponential backoff on 429."""

    def __init__(
        self,
        inner: Embeddings,
        *,
        max_retries: int = _MAX_EMBED_RETRIES,
    ) -> None:
        self._inner = inner
        self._max_retries = max_retries

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._call_with_retry(lambda: self._inner.embed_documents(texts))

    def embed_query(self, text: str) -> list[float]:
        return self._call_with_retry(lambda: self._inner.embed_query(text))

    def _call_with_retry(self, fn):  # noqa: ANN001
        last_exc: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                return fn()
            except Exception as exc:  # noqa: BLE001
                if not _is_rate_limited(exc):
                    raise map_embedding_error(exc) from exc
                last_exc = exc
                if attempt >= self._max_retries:
                    break
                delay = _BASE_BACKOFF_SECONDS * (2**attempt)
                logger.warning(
                    "embedding_rate_limited attempt={} delay_s={:.1f}",
                    attempt + 1,
                    delay,
                )
                time.sleep(delay)
        raise map_embedding_error(last_exc or RuntimeError("embedding rate limited"))


def _is_rate_limited(exc: Exception) -> bool:
    if isinstance(exc, RateLimitError):
        return True
    if isinstance(exc, APIStatusError) and exc.status_code == 429:
        return True
    status = getattr(getattr(exc, "response", None), "status_code", None)
    return status == 429


def build_embeddings(settings: Settings | None = None) -> Embeddings:
    settings = settings or get_settings()
    api_key = settings.resolved_embedding_api_key
    if not api_key:
        raise AppError(
            "Embeddings require EMBEDDING_API_KEY or LLM_API_KEY.",
            code="llm_not_configured",
            status_code=503,
        )
    inner = OpenAIEmbeddings(
        api_key=api_key,
        base_url=settings.resolved_embedding_base_url,
        model=settings.embedding_model,
    )
    return RetryingEmbeddings(inner)


def embed_documents_with_retry(
    texts: list[str],
    *,
    settings: Settings | None = None,
) -> list[list[float]]:
    return build_embeddings(settings).embed_documents(texts)


def map_embedding_error(exc: Exception | None) -> AppError:
    if isinstance(exc, AppError):
        return exc
    if isinstance(exc, NotFoundError):
        return AppError(
            "Embedding endpoint not found. Set EMBEDDING_BASE_URL to an "
            "OpenAI-compatible embeddings API (…/v1) if your chat proxy has no /embeddings.",
            code="embedding_endpoint_missing",
            status_code=503,
        )
    if _is_rate_limited(exc) if exc else False:
        return AppError(
            "Embedding provider rate limited (429). Retry publish later.",
            code="embedding_rate_limited",
            status_code=429,
            details={"upstream_status": 429},
        )
    if isinstance(exc, APIStatusError):
        return AppError(
            "Embedding provider error",
            code="embedding_upstream_error",
            status_code=502,
            details={"upstream_status": exc.status_code},
        )
    details: dict[str, Any] = {"error": str(exc) if exc else "unknown"}
    return AppError(
        "Failed to create embeddings",
        code="embedding_failed",
        status_code=502,
        details=details,
    )
