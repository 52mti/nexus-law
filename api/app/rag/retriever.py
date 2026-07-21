from __future__ import annotations

import json
from typing import Any

from app.core.config import Settings, get_settings
from app.rag.store import get_vector_store, weaviate_client


def retrieve_documents(
    query: str,
    *,
    top_k: int | None = None,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    settings = settings or get_settings()
    k = top_k or settings.rag_top_k
    with weaviate_client(settings) as client:
        store = get_vector_store(client, settings=settings)
        docs = store.similarity_search(query, k=k)

    results: list[dict[str, Any]] = []
    for doc in docs:
        meta = doc.metadata or {}
        document_id = meta.get("document_id")
        chunk_index = meta.get("chunk_index")
        results.append(
            {
                "content": doc.page_content,
                "source": str(meta.get("source")) if meta.get("source") is not None else None,
                "document_id": str(document_id) if document_id is not None else None,
                "chunk_index": int(chunk_index) if chunk_index is not None else None,
            }
        )
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
