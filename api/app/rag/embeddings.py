from langchain_openai import OpenAIEmbeddings
from openai import APIStatusError, NotFoundError

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError


def build_embeddings(settings: Settings | None = None) -> OpenAIEmbeddings:
    settings = settings or get_settings()
    api_key = settings.resolved_embedding_api_key
    if not api_key:
        raise AppError(
            "Embeddings require EMBEDDING_API_KEY or LLM_API_KEY.",
            code="llm_not_configured",
            status_code=503,
        )
    return OpenAIEmbeddings(
        api_key=api_key,
        base_url=settings.resolved_embedding_base_url,
        model=settings.embedding_model,
    )


def map_embedding_error(exc: Exception) -> AppError:
    if isinstance(exc, AppError):
        return exc
    if isinstance(exc, NotFoundError):
        return AppError(
            "Embedding endpoint not found. Set EMBEDDING_BASE_URL to an "
            "OpenAI-compatible embeddings API (…/v1) if your chat proxy has no /embeddings.",
            code="embedding_endpoint_missing",
            status_code=503,
        )
    if isinstance(exc, APIStatusError):
        return AppError(
            "Embedding provider error",
            code="embedding_upstream_error",
            status_code=502,
            details={"upstream_status": exc.status_code},
        )
    return AppError(
        "Failed to create embeddings",
        code="embedding_failed",
        status_code=502,
        details={"error": str(exc)},
    )
