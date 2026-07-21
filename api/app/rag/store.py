from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

import weaviate
from langchain_weaviate.vectorstores import WeaviateVectorStore
from loguru import logger

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.rag.embeddings import build_embeddings

_TEXT_KEY = "text"
_ATTRIBUTES = ["source", "document_id", "chunk_index"]


def connect_weaviate(settings: Settings | None = None) -> weaviate.WeaviateClient:
    settings = settings or get_settings()
    try:
        return weaviate.connect_to_local(
            host=settings.weaviate_host,
            port=settings.weaviate_http_port,
            grpc_port=settings.weaviate_grpc_port,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("weaviate_connect_failed error={}", type(exc).__name__)
        raise AppError(
            "Failed to connect to Weaviate. "
            f"Expected REST {settings.weaviate_host}:{settings.weaviate_http_port} "
            f"and gRPC :{settings.weaviate_grpc_port}.",
            code="weaviate_unavailable",
            status_code=503,
            details={"error": str(exc)},
        ) from exc


@contextmanager
def weaviate_client(settings: Settings | None = None) -> Iterator[weaviate.WeaviateClient]:
    client = connect_weaviate(settings)
    try:
        yield client
    finally:
        client.close()


def get_vector_store(
    client: weaviate.WeaviateClient,
    *,
    collection: str | None = None,
    settings: Settings | None = None,
) -> WeaviateVectorStore:
    settings = settings or get_settings()
    index_name = (collection or settings.weaviate_collection).strip()
    if not index_name:
        raise AppError(
            "Weaviate collection name is empty",
            code="invalid_collection",
            status_code=422,
        )
    embeddings = build_embeddings(settings)
    return WeaviateVectorStore(
        client=client,
        index_name=index_name,
        text_key=_TEXT_KEY,
        embedding=embeddings,
        attributes=_ATTRIBUTES,
    )
