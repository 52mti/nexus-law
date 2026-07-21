import json
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.rag.ingest import IngestResult, chunk_text, extract_text
from app.rag.retriever import extract_sources_from_tool_result, format_retrieval_payload


def test_extract_text_txt_and_md() -> None:
    assert "hello" in extract_text("a.txt", b"hello world")
    assert "title" in extract_text("note.md", b"# title\nbody")


def test_extract_text_rejects_unknown_type() -> None:
    from app.core.exceptions import AppError

    with pytest.raises(AppError) as exc:
        extract_text("x.docx", b"data")
    assert exc.value.code == "unsupported_file_type"


def test_chunk_text() -> None:
    text = "word " * 500
    chunks = chunk_text(text)
    assert len(chunks) >= 2


def test_format_and_extract_sources() -> None:
    payload = format_retrieval_payload(
        [
            {
                "content": "Clause 3: termination notice is 30 days.",
                "source": "contract.md",
                "document_id": "doc-1",
                "chunk_index": 0,
            }
        ]
    )
    sources = extract_sources_from_tool_result(payload)
    assert sources[0]["source"] == "contract.md"
    assert "30 days" in sources[0]["snippet"]
    assert json.loads(format_retrieval_payload([]))["matches"] == []


@pytest.mark.asyncio
async def test_upload_document_endpoint_mocked() -> None:
    transport = ASGITransport(app=app)
    fake = IngestResult(
        document_id="d1",
        source="policy.md",
        chunk_count=2,
        collection="NexusLawDocuments",
    )
    with patch("app.api.v1.rag.ingest_document", return_value=fake):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/rag/documents",
                files={"file": ("policy.md", b"# Policy\nTermination requires notice.", "text/markdown")},
            )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["document_id"] == "d1"
    assert body["data"]["chunk_count"] == 2


@pytest.mark.asyncio
async def test_supported_types() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/rag/supported-types")
    assert response.status_code == 200
    assert ".pdf" in response.json()["data"]["extensions"]


def test_map_embedding_not_found() -> None:
    from openai import NotFoundError

    from app.rag.embeddings import map_embedding_error

    response = type("R", (), {"status_code": 404, "headers": {}, "request": object()})()
    err = NotFoundError(message="missing", response=response, body=None)
    mapped = map_embedding_error(err)
    assert mapped.status_code == 503
    assert mapped.code == "embedding_endpoint_missing"


def test_search_documents_tool_uses_retriever() -> None:
    from app.agents.tools.rag import search_documents

    with patch(
        "app.agents.tools.rag.retrieve_documents",
        return_value=[
            {
                "content": "Notice period is 30 days.",
                "source": "hr.md",
                "document_id": "x",
                "chunk_index": 1,
            }
        ],
    ) as mocked:
        result = search_documents.invoke({"query": "notice period"})
    mocked.assert_called_once()
    payload = json.loads(result)
    assert payload["matches"][0]["source"] == "hr.md"
