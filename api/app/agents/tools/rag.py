from langchain_core.tools import tool

from app.rag.retriever import format_retrieval_payload, retrieve_documents


@tool
def search_documents(query: str) -> str:
    """Search uploaded legal/reference documents in Weaviate for relevant passages.

    Use this when the user asks about content that may exist in uploaded files.
    Return value is JSON with matches (content, source, document_id, chunk_index).
    If matches is empty, do not invent citations.
    """
    results = retrieve_documents(query)
    return format_retrieval_payload(results)
