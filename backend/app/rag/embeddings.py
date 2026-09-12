from __future__ import annotations

import time
from functools import lru_cache
from typing import Any

from langchain_core.embeddings import Embeddings
from loguru import logger
from openai import AuthenticationError

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError

_MAX_EMBED_RETRIES = 4
_BASE_BACKOFF_SECONDS = 1.5
# SiliconFlow embeddings accept at most 32 inputs per request.
_MAX_EMBED_BATCH_SIZE = 32


class RetryingEmbeddings(Embeddings):
    """Wrap an Embeddings implementation with exponential backoff on transient errors."""

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
    status = getattr(exc, "status_code", None)
    if status == 429:
        return True
    response = getattr(exc, "response", None)
    return getattr(response, "status_code", None) == 429


@lru_cache(maxsize=4)
def _cached_openai_embeddings(
    model_name: str,
    api_key: str,
    base_url: str,
    chunk_size: int,
) -> Embeddings:
    """OpenAI-compatible client (SiliconFlow). Do not send `dimensions` for BGE-M3."""
    from langchain_openai import OpenAIEmbeddings

    logger.info(
        "init_remote_embeddings model={} base_url={} batch_size={}",
        model_name,
        base_url,
        chunk_size,
    )
    return OpenAIEmbeddings(
        model=model_name,
        api_key=api_key,
        base_url=base_url,
        check_embedding_ctx_length=False,
        chunk_size=chunk_size,
    )


def build_embeddings(settings: Settings | None = None) -> Embeddings:
    settings = settings or get_settings()
    if not settings.embedding_configured:
        raise AppError(
            "Embedding API is not configured. Set EMBEDDING_API_KEY and EMBEDDING_BASE_URL.",
            code="embedding_not_configured",
            status_code=503,
        )
    model = settings.embedding_model.strip()
    api_key = settings.embedding_api_key.strip()
    base_url = settings.embedding_base_url.strip().rstrip("/")
    chunk_size = max(1, min(settings.embedding_batch_size, _MAX_EMBED_BATCH_SIZE))
    return RetryingEmbeddings(
        _cached_openai_embeddings(model, api_key, base_url, chunk_size)
    )


def embed_documents_with_retry(
    texts: list[str],
    *,
    settings: Settings | None = None,
) -> list[list[float]]:
    return build_embeddings(settings).embed_documents(texts)


def map_embedding_error(exc: Exception | None) -> AppError:
    if isinstance(exc, AppError):
        return exc
    if isinstance(exc, AuthenticationError) or getattr(exc, "status_code", None) == 401:
        return AppError(
            "Embedding authentication failed. Check EMBEDDING_API_KEY.",
            code="embedding_unauthorized",
            status_code=401,
        )
    if _is_rate_limited(exc) if exc else False:
        return AppError(
            "Embedding provider rate limited (429). Retry publish later.",
            code="embedding_rate_limited",
            status_code=429,
            details={"upstream_status": 429},
        )
    details: dict[str, Any] = {"error": str(exc) if exc else "unknown"}
    return AppError(
        "Failed to create embeddings",
        code="embedding_failed",
        status_code=502,
        details=details,
    )
