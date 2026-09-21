import pytest
from httpx import AsyncClient

from app.core.biz import BizCode
from app.services.admin.prompt import get_active_system_prompt
from tests.admin_helpers import auth_header, make_admin


@pytest.mark.asyncio
async def test_prompt_version_activate_and_runtime_read(admin_env) -> None:
    client: AsyncClient = admin_env["client"]
    admin = await make_admin(admin_env)
    headers = auth_header(admin["access_token"])
    agent_id = admin_env["agent_id"]

    created = await client.post(
        "/api/v1/admin/prompt/create",
        headers=headers,
        json={
            "agent_id": agent_id,
            "scene": "system",
            "content": "第一版提示词",
            "is_active": True,
        },
    )
    assert created.json()["code"] == 0
    first_id = created.json()["data"]["id"]
    assert created.json()["data"]["version"] == 1
    assert created.json()["data"]["is_active"] is True

    updated = await client.post(
        "/api/v1/admin/prompt/update",
        headers=headers,
        json={"id": first_id, "content": "第二版草稿"},
    )
    assert updated.json()["code"] == 0
    second_id = updated.json()["data"]["id"]
    assert second_id != first_id
    assert updated.json()["data"]["is_active"] is False

    activated = await client.post(
        "/api/v1/admin/prompt/activate",
        headers=headers,
        json={"id": second_id},
    )
    assert activated.json()["code"] == 0
    assert activated.json()["data"]["is_active"] is True

    blocked = await client.post(
        "/api/v1/admin/prompt/delete",
        headers=headers,
        json={"id": second_id},
    )
    assert blocked.json()["code"] == BizCode.PROMPT_PROTECTED

    async with admin_env["session_factory"]() as session:
        content = await get_active_system_prompt(
            session,
            agent_id=agent_id,
            fallback="fallback",
        )
        assert content == "第二版草稿"
