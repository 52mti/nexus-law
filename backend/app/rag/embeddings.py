from __future__ import annotations

import time
from functools import lru_cache
from typing import Any

from langchain_core.embeddings import Embeddings
from loguru import logger

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError

_MAX_EMBED_RETRIES = 4
_BASE_BACKOFF_SECONDS = 1.5


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
def _cached_huggingface_embeddings(model_name: str, device: str) -> Embeddings:
    """Load once per (model, device); BGE-M3 is large and must not reload per request."""
    from langchain_huggingface import HuggingFaceEmbeddings

    logger.info("loading_hf_embeddings model={} device={}", model_name, device)
    return HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs={"device": device},
        encode_kwargs={"normalize_embeddings": True},
    )


def build_embeddings(settings: Settings | None = None) -> Embeddings:
    settings = settings or get_settings()
    model = settings.embedding_model.strip()
    if not model:
        raise AppError(
            "EMBEDDING_MODEL is required.",
            code="embedding_not_configured",
            status_code=503,
        )
    device = settings.embedding_device.strip() or "cpu"
    return RetryingEmbeddings(_cached_huggingface_embeddings(model, device))


def embed_documents_with_retry(
    texts: list[str],
    *,
    settings: Settings | None = None,
) -> list[list[float]]:
    return build_embeddings(settings).embed_documents(texts)


def map_embedding_error(exc: Exception | None) -> AppError:
    if isinstance(exc, AppError):
        return exc
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
