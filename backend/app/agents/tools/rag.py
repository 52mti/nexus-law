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


def build_search_tool(collections: list[str] | None = None):
    """Bind search_documents to specific Weaviate collections (dataset instances)."""

    @tool
    def search_documents(query: str) -> str:
        """Search uploaded legal/reference documents in Weaviate for relevant passages.

        Use this when the user asks about content that may exist in uploaded files.
        Return value is JSON with matches (content, source, document_id, chunk_index).
        If matches is empty, do not invent citations.
        """
        results = retrieve_documents(query, collections=collections)
        return format_retrieval_payload(results)

    return search_documents
