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


def delete_weaviate_collection(
    collection: str,
    *,
    settings: Settings | None = None,
) -> bool:
    """Drop a Weaviate collection (all vectors). Returns True if it existed."""
    settings = settings or get_settings()
    name = collection.strip()
    if not name:
        raise AppError(
            "collection is required",
            code="collection_required",
            status_code=422,
        )
    try:
        with weaviate_client(settings) as client:
            if not client.collections.exists(name):
                logger.info("weaviate_collection_absent name={}", name)
                return False
            client.collections.delete(name)
            logger.info("weaviate_collection_deleted name={}", name)
            return True
    except AppError:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "weaviate_collection_delete_failed name={} error={}",
            name,
            type(exc).__name__,
        )
        raise AppError(
            f"Failed to delete Weaviate collection '{name}'",
            code="weaviate_delete_failed",
            status_code=502,
            details={"error": str(exc)},
        ) from exc


def delete_weaviate_by_document_id(
    *,
    document_id: str,
    collection: str,
    settings: Settings | None = None,
) -> int:
    """Delete all vectors for one document_id in a collection. Returns deleted count."""
    from weaviate.classes.query import Filter

    settings = settings or get_settings()
    name = collection.strip()
    doc_id = document_id.strip()
    if not name or not doc_id:
        raise AppError(
            "document_id and collection are required",
            code="invalid_delete_args",
            status_code=422,
        )
    try:
        with weaviate_client(settings) as client:
            if not client.collections.exists(name):
                logger.info(
                    "weaviate_doc_vectors_skip_absent collection={} document_id={}",
                    name,
                    doc_id,
                )
                return 0
            col = client.collections.get(name)
            result = col.data.delete_many(
                where=Filter.by_property("document_id").equal(doc_id)
            )
            deleted = int(getattr(result, "successful", 0) or 0)
            logger.info(
                "weaviate_doc_vectors_deleted collection={} document_id={} count={}",
                name,
                doc_id,
                deleted,
            )
            return deleted
    except AppError:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "weaviate_doc_delete_failed collection={} document_id={} error={}",
            name,
            doc_id,
            type(exc).__name__,
        )
        raise AppError(
            f"Failed to delete Weaviate vectors for document '{doc_id}'",
            code="weaviate_delete_failed",
            status_code=502,
            details={"error": str(exc), "collection": name},
        ) from exc
