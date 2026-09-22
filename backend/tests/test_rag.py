import json
from unittest.mock import MagicMock, patch

import pytest

from app.rag.ingest import chunk_text, extract_text, parse_and_chunk
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


def test_normalize_collection_name() -> None:
    from app.core.exceptions import AppError
    from app.services.document import normalize_collection_name

    assert normalize_collection_name(" LaborContracts ") == "LaborContracts"
    with pytest.raises(AppError) as empty:
        normalize_collection_name("  ")
    assert empty.value.code == "collection_required"
    with pytest.raises(AppError) as bad:
        normalize_collection_name("labor-contracts")
    assert bad.value.code == "invalid_collection"


def test_parse_and_chunk_no_embedding() -> None:
    result = parse_and_chunk(
        filename="policy.md",
        content=b"# Policy\nTermination requires notice.",
    )
    assert result.source == "policy.md"
    assert "Policy" in result.extracted_text
    assert len(result.chunks) >= 1


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


def test_build_embeddings_uses_openai_compatible_client() -> None:
    from app.core.config import Settings
    from app.rag.embeddings import RetryingEmbeddings, build_embeddings

    settings = Settings(
        embedding_api_key="sk-test",
        embedding_base_url="https://api.siliconflow.cn/v1/",
        embedding_model="BAAI/bge-m3",
        embedding_batch_size=64,
    )
    fake = object()
    with patch(
        "app.rag.embeddings._cached_openai_embeddings",
        return_value=fake,
    ) as cached:
        emb = build_embeddings(settings)
    cached.assert_called_once_with(
        "BAAI/bge-m3",
        "sk-test",
        "https://api.siliconflow.cn/v1",
        32,
    )
    assert isinstance(emb, RetryingEmbeddings)
    assert emb._inner is fake


def test_build_embeddings_requires_api_key() -> None:
    from app.core.config import Settings
    from app.core.exceptions import AppError
    from app.rag.embeddings import build_embeddings

    with pytest.raises(AppError) as exc:
        build_embeddings(Settings(embedding_api_key="", embedding_model="BAAI/bge-m3"))
    assert exc.value.code == "embedding_not_configured"


def test_map_embedding_rate_limited() -> None:
    from app.rag.embeddings import map_embedding_error

    err = type("E", (Exception,), {"status_code": 429})("slow down")
    mapped = map_embedding_error(err)
    assert mapped.status_code == 429
    assert mapped.code == "embedding_rate_limited"


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


def test_retrieve_documents_merges_collections() -> None:
    from app.rag.retriever import retrieve_documents

    class Doc:
        def __init__(self, source: str) -> None:
            self.page_content = f"{source} text"
            self.metadata = {"source": source, "document_id": source, "chunk_index": 0}

    class Store:
        def __init__(self, name: str) -> None:
            self.name = name

        def similarity_search_with_score(self, query: str, k: int = 4):
            return [(Doc(self.name), 0.1)]

    def fake_store(_client, *, collection=None, settings=None):
        return Store(collection)

    with (
        patch("app.rag.retriever.weaviate_client") as ctx,
        patch("app.rag.retriever.get_vector_store", side_effect=fake_store),
    ):
        ctx.return_value.__enter__.return_value = object()
        ctx.return_value.__exit__.return_value = None
        results = retrieve_documents("q", collections=["LawsA", "LawsB"], top_k=2)
    assert {item["source"] for item in results} == {"LawsA", "LawsB"}


def test_get_agent_tools_respects_instance_whitelist() -> None:
    from app.agents.tools import get_agent_tools
    from app.core.config import Settings

    tools = get_agent_tools(
        Settings(agent_tool_whitelist="calculator,search_documents"),
        whitelist=["search_documents"],
        collections=["LaborLaw"],
    )
    assert [tool.name for tool in tools] == ["search_documents"]


def test_cos_public_url_and_upload_mocked() -> None:
    from app.core.config import Settings
    from app.services.cos_storage import public_object_url, upload_bytes

    url = public_object_url(
        bucket="demo-125000",
        region="ap-guangzhou",
        key="documents/d1/a.pdf",
    )
    assert url == "https://demo-125000.cos.ap-guangzhou.myqcloud.com/documents/d1/a.pdf"

    settings = Settings(
        cos_enabled=True,
        cos_secret_id="sid",
        cos_secret_key="skey",
        cos_region="ap-guangzhou",
        cos_bucket="demo-125000",
        cos_key_prefix="documents/",
    )
    fake_client = MagicMock()
    fake_client.put_object.return_value = {"ETag": '"abc123"'}
    with patch("app.services.cos_storage._build_client", return_value=fake_client):
        result = upload_bytes(
            content=b"hello",
            document_id="d1",
            filename="note.md",
            content_type="text/markdown",
            settings=settings,
        )
    fake_client.put_object.assert_called_once()
    assert result.etag == "abc123"
    assert result.bucket == "demo-125000"
    assert result.url.startswith("https://demo-125000.cos.ap-guangzhou.myqcloud.com/")
    assert "d1/" in result.key


def test_cos_delete_object_mocked() -> None:
    from app.core.config import Settings
    from app.services.cos_storage import delete_objects

    settings = Settings(
        cos_enabled=True,
        cos_secret_id="sid",
        cos_secret_key="skey",
        cos_region="ap-guangzhou",
        cos_bucket="demo-125000",
    )
    fake_client = MagicMock()
    with patch("app.services.cos_storage._build_client", return_value=fake_client):
        deleted = delete_objects(
            items=[(None, "documents/d1/a.pdf"), ("demo-125000", "documents/d2/b.pdf")],
            settings=settings,
        )
    assert deleted == 2
    assert fake_client.delete_object.call_count == 2
