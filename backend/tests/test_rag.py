import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
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
    result = parse_and_chunk(filename="policy.md", content=b"# Policy\nTermination requires notice.")
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


@pytest.mark.asyncio
async def test_upload_document_creates_draft_stub_not_weaviate() -> None:
    transport = ASGITransport(app=app)
    stub = MagicMock()
    stub.id = "d1"
    stub.source = "policy.md"
    stub.status = "uploading"
    stub.dataset_id = "ds1"
    stub.collection = "NexusLawDocuments"

    with (
        patch(
            "app.api.v1.rag.document_service.create_upload_stub",
            new=AsyncMock(return_value=stub),
        ) as create_stub,
        patch("fastapi.BackgroundTasks.add_task") as add_task,
        patch("app.rag.ingest.publish_to_weaviate") as publish,
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/rag/documents",
                data={"collection": "NexusLawDocuments"},
                files={
                    "file": (
                        "policy.md",
                        b"# Policy\nTermination requires notice.",
                        "text/markdown",
                    )
                },
            )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["document_id"] == "d1"
    assert body["data"]["status"] == "uploading"
    create_stub.assert_awaited_once()
    assert create_stub.await_args.kwargs["collection"] == "NexusLawDocuments"
    add_task.assert_called_once()
    publish.assert_not_called()


@pytest.mark.asyncio
async def test_get_document_and_chunks_mocked() -> None:
    transport = ASGITransport(app=app)
    doc = MagicMock()
    doc.id = "d1"
    doc.source = "policy.md"
    doc.title = "policy"
    doc.status = "draft"
    doc.chunk_count = 2
    doc.dataset_id = "ds1"
    doc.collection = "NexusLawDocuments"
    doc.content_type = "text/markdown"
    doc.file_extension = ".md"
    doc.file_size_bytes = 10
    doc.error_message = None
    doc.storage_status = "uploaded"
    doc.oss_url = "https://bucket.cos.ap-guangzhou.myqcloud.com/documents/d1/file.md"
    doc.oss_key = "documents/d1/file.md"
    doc.created_at = None
    doc.updated_at = None

    chunk = MagicMock()
    chunk.id = "c1"
    chunk.chunk_index = 0
    chunk.content = "hello"
    chunk.char_count = 5

    with (
        patch(
            "app.api.v1.rag.document_service.get_document",
            new=AsyncMock(return_value=doc),
        ),
        patch(
            "app.api.v1.rag.document_service.list_chunks",
            new=AsyncMock(return_value=[chunk]),
        ),
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            detail = await client.get("/api/v1/rag/documents/d1")
            chunks = await client.get("/api/v1/rag/documents/d1/chunks")

    assert detail.status_code == 200
    assert detail.json()["data"]["status"] == "draft"
    assert detail.json()["data"]["oss_url"].endswith("file.md")
    assert chunks.status_code == 200
    assert chunks.json()["data"]["chunks"][0]["content"] == "hello"


@pytest.mark.asyncio
async def test_replace_chunks_endpoint_mocked() -> None:
    transport = ASGITransport(app=app)
    doc = MagicMock()
    doc.id = "d1"
    doc.status = "draft"

    updated = MagicMock()
    updated.id = "c2"
    updated.chunk_index = 0
    updated.content = "edited"
    updated.char_count = 6

    with (
        patch(
            "app.api.v1.rag.document_service.get_document",
            new=AsyncMock(return_value=doc),
        ),
        patch(
            "app.api.v1.rag.document_service.replace_chunks",
            new=AsyncMock(return_value=[updated]),
        ) as replace,
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.put(
                "/api/v1/rag/documents/d1/chunks",
                json={"chunks": [{"content": "edited"}]},
            )
    assert response.status_code == 200
    assert response.json()["data"]["chunks"][0]["content"] == "edited"
    replace.assert_awaited_once()


@pytest.mark.asyncio
async def test_publish_document_schedules_task_not_sync_embed() -> None:
    transport = ASGITransport(app=app)
    doc = MagicMock()
    doc.id = "d1"
    doc.status = "publishing"
    doc.chunk_count = 2
    doc.dataset_id = "ds1"
    doc.collection = "NexusLawDocuments"

    with (
        patch(
            "app.api.v1.rag.document_service.mark_publishing",
            new=AsyncMock(return_value=doc),
        ),
        patch("fastapi.BackgroundTasks.add_task") as add_task,
        patch("app.rag.ingest.publish_to_weaviate") as publish,
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/rag/documents/d1/publish")

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "publishing"
    publish.assert_not_called()
    add_task.assert_called_once()


@pytest.mark.asyncio
async def test_delete_collection_endpoint_mocked() -> None:
    transport = ASGITransport(app=app)
    with patch(
        "app.api.v1.rag.document_service.delete_collection_dataset",
        new=AsyncMock(
            return_value={
                "dataset_id": "ds-labor",
                "collection": "LaborContracts",
                "document_count": 2,
                "chunk_count": 10,
                "weaviate_deleted": True,
                "cos_deleted_count": 2,
            }
        ),
    ) as delete_ds:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/v1/rag/collections/LaborContracts")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["collection"] == "LaborContracts"
    assert body["data"]["document_count"] == 2
    assert body["data"]["chunk_count"] == 10
    assert body["data"]["weaviate_deleted"] is True
    assert body["data"]["cos_deleted_count"] == 2
    delete_ds.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_document_endpoint_mocked() -> None:
    transport = ASGITransport(app=app)
    with patch(
        "app.api.v1.rag.document_service.delete_document_by_id",
        new=AsyncMock(
            return_value={
                "document_id": "d1",
                "dataset_id": "ds-labor",
                "collection": "LaborContracts",
                "chunk_count": 3,
                "weaviate_deleted_count": 3,
                "cos_deleted_count": 1,
            }
        ),
    ) as delete_doc:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/v1/rag/documents/d1")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["document_id"] == "d1"
    assert body["data"]["chunk_count"] == 3
    assert body["data"]["weaviate_deleted_count"] == 3
    assert body["data"]["cos_deleted_count"] == 1
    delete_doc.assert_awaited_once()


@pytest.mark.asyncio
async def test_supported_types() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/rag/supported-types")
    assert response.status_code == 200
    assert ".pdf" in response.json()["data"]["extensions"]


def test_build_embeddings_uses_huggingface() -> None:
    from app.core.config import Settings
    from app.rag.embeddings import RetryingEmbeddings, build_embeddings

    settings = Settings(
        embedding_model="BAAI/bge-m3",
        embedding_device="cpu",
    )
    fake = object()
    with patch(
        "app.rag.embeddings._cached_huggingface_embeddings",
        return_value=fake,
    ) as cached:
        emb = build_embeddings(settings)
    cached.assert_called_once_with("BAAI/bge-m3", "cpu")
    assert isinstance(emb, RetryingEmbeddings)
    assert emb._inner is fake


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
