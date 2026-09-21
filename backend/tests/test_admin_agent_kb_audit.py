from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.db.models import DocumentStatus
from tests.admin_helpers import auth_header, make_admin


@pytest.mark.asyncio
async def test_agent_crud_and_role_bind(admin_env) -> None:
    client: AsyncClient = admin_env["client"]
    admin = await make_admin(admin_env)
    headers = auth_header(admin["access_token"])

    created = await client.post(
        "/api/v1/admin/agent/create",
        headers=headers,
        json={
            "name": "专业检索",
            "code": "lawyer_search",
            "description": "律师检索",
            "tool_whitelist": ["search_documents"],
            "temperature": 0.1,
            "is_active": True,
        },
    )
    assert created.json()["code"] == 0
    agent_id = created.json()["data"]["id"]

    bound = await client.post(
        "/api/v1/admin/agent/roles/bind",
        headers=headers,
        json={"id": agent_id, "role_codes": ["lawyer"]},
    )
    assert bound.json()["code"] == 0
    assert bound.json()["data"]["role_codes"] == ["lawyer"]

    listed = await client.get("/api/v1/admin/agent/list", headers=headers)
    assert listed.json()["data"]["total"] >= 2


@pytest.mark.asyncio
async def test_dataset_document_audit_flow(admin_env) -> None:
    client: AsyncClient = admin_env["client"]
    admin = await make_admin(admin_env)
    headers = auth_header(admin["access_token"])

    dataset = await client.post(
        "/api/v1/admin/dataset/create",
        headers=headers,
        json={
            "name": "LocalLaws",
            "title": "地方法规",
            "region": "广东",
            "visibility": "all",
        },
    )
    assert dataset.json()["code"] == 0, dataset.json()
    dataset_id = dataset.json()["data"]["id"]

    with patch("app.api.v1.admin.knowledge.document_service.run_parse_task", new=AsyncMock()):
        uploaded = await client.post(
            "/api/v1/admin/document/upload",
            headers=headers,
            files={"file": ("law.txt", "第一条 地方性法规示例。".encode(), "text/plain")},
            data={
                "dataset_id": dataset_id,
                "title": "示例法规",
                "region": "广东",
                "law_level": "地方法规",
            },
        )
    assert uploaded.json()["code"] == 0, uploaded.json()
    document_id = uploaded.json()["data"]["id"]

    from app.db.models import Document
    from app.db.models import DocumentStatus as St

    async with admin_env["session_factory"]() as session:
        doc = await session.get(Document, document_id)
        assert doc is not None
        doc.status = St.DRAFT.value
        await session.commit()

    chunks_update = await client.post(
        "/api/v1/admin/document/chunks/update",
        headers=headers,
        json={
            "id": document_id,
            "chunks": [{"content": "第一条 修订后的条文。"}],
        },
    )
    assert chunks_update.json()["code"] == 0, chunks_update.json()

    with (
        patch("app.services.document.publish_to_weaviate"),
        patch("app.api.v1.admin.knowledge.document_service.run_publish_task", new=AsyncMock()),
        patch("app.services.admin.knowledge.delete_weaviate_by_document_id", return_value=0),
        patch("app.services.admin.knowledge.delete_weaviate_collection", return_value=True),
    ):
        async with admin_env["session_factory"]() as session:
            from app.db.models import Document

            doc = await session.get(Document, document_id)
            assert doc is not None
            doc.status = DocumentStatus.DRAFT.value
            await session.commit()
        published = await client.post(
            "/api/v1/admin/document/publish",
            headers=headers,
            json={"id": document_id},
        )
        assert published.json()["code"] == 0
        async with admin_env["session_factory"]() as session:
            from app.db.models import Document

            doc = await session.get(Document, document_id)
            assert doc is not None
            doc.status = DocumentStatus.PUBLISHED.value
            await session.commit()
        unpublished = await client.post(
            "/api/v1/admin/document/unpublish",
            headers=headers,
            json={"id": document_id},
        )
        assert unpublished.json()["code"] == 0
        assert unpublished.json()["data"]["status"] == DocumentStatus.DRAFT.value

        deleted = await client.post(
            "/api/v1/admin/document/delete",
            headers=headers,
            json={"id": document_id},
        )
        assert deleted.json()["code"] == 0

    audits = await client.get("/api/v1/admin/audit/list", headers=headers)
    assert audits.json()["code"] == 0
    assert audits.json()["data"]["total"] >= 1
