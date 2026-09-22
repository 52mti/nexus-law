from __future__ import annotations

import json
from typing import Any

from loguru import logger

from app.core.config import Settings, get_settings
from app.rag.store import get_vector_store, weaviate_client


def _doc_to_result(doc: Any, score: float | None = None) -> dict[str, Any]:
    meta = getattr(doc, "metadata", None) or {}
    document_id = meta.get("document_id")
    chunk_index = meta.get("chunk_index")
    item = {
        "content": getattr(doc, "page_content", ""),
        "source": str(meta.get("source")) if meta.get("source") is not None else None,
        "document_id": str(document_id) if document_id is not None else None,
        "chunk_index": int(chunk_index) if chunk_index is not None else None,
    }
    if score is not None:
        item["_score"] = score
    return item


def _search_collection(store: Any, query: str, k: int) -> list[tuple[Any, float | None]]:
    search_with_score = getattr(store, "similarity_search_with_score", None)
    if callable(search_with_score):
        pairs = search_with_score(query, k=k)
        return [(doc, float(score) if score is not None else None) for doc, score in pairs]
    docs = store.similarity_search(query, k=k)
    return [(doc, None) for doc in docs]


def retrieve_documents(
    query: str,
    *,
    top_k: int | None = None,
    settings: Settings | None = None,
    collections: list[str] | None = None,
) -> list[dict[str, Any]]:
    settings = settings or get_settings()
    k = top_k or settings.rag_top_k
    names = [name.strip() for name in (collections or []) if name and name.strip()]
    if not names:
        names = [settings.weaviate_collection]

    scored: list[dict[str, Any]] = []
    with weaviate_client(settings) as client:
        for name in names:
            try:
                store = get_vector_store(client, collection=name, settings=settings)
                for doc, score in _search_collection(store, query, k):
                    scored.append(_doc_to_result(doc, score))
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "retrieve_collection_failed collection={} error={}",
                    name,
                    type(exc).__name__,
                )

    has_scores = any(item.get("_score") is not None for item in scored)
    if has_scores:
        scored.sort(key=lambda item: item.get("_score") if item.get("_score") is not None else 1e9)
    results: list[dict[str, Any]] = []
    seen: set[tuple[Any, Any, Any]] = set()
    for item in scored:
        key = (item.get("source"), item.get("document_id"), item.get("chunk_index"))
        if key in seen:
            continue
        seen.add(key)
        item.pop("_score", None)
        results.append(item)
        if len(results) >= k:
            break
    return results


def format_retrieval_payload(results: list[dict[str, Any]]) -> str:
    if not results:
        return json.dumps(
            {
                "matches": [],
                "note": "No relevant documents found. Do not invent sources.",
            },
            ensure_ascii=False,
        )
    return json.dumps({"matches": results}, ensure_ascii=False)


def extract_sources_from_tool_result(result: Any) -> list[dict[str, Any]]:
    """Parse search_documents tool output into citation objects."""
    if result is None:
        return []
    text = result if isinstance(result, str) else str(result)
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return []
    matches = payload.get("matches") if isinstance(payload, dict) else None
    if not isinstance(matches, list):
        return []

    sources: list[dict[str, Any]] = []
    seen: set[tuple[Any, Any, Any]] = set()
    for item in matches:
        if not isinstance(item, dict):
            continue
        key = (item.get("source"), item.get("document_id"), item.get("chunk_index"))
        if key in seen:
            continue
        seen.add(key)
        sources.append(
            {
                "source": item.get("source"),
                "document_id": item.get("document_id"),
                "chunk_index": item.get("chunk_index"),
                "snippet": (item.get("content") or "")[:240],
            }
        )
    return sources
