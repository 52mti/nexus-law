from __future__ import annotations

from langchain_core.language_models.chat_models import BaseChatModel

from app.agents.graph import build_agent_graph
from app.core.config import Settings

LEGAL_QA_REACT = "legal_qa_react"
SYSTEM_AGENT_CODE = "legal_qa"

TEMPLATES: dict[str, dict[str, str]] = {
    LEGAL_QA_REACT: {
        "code": LEGAL_QA_REACT,
        "name": "法律问答 ReAct",
        "description": "检索 + 工具调用的法律问答图（START → agent ⇄ tools → END）",
    }
}


def list_templates() -> list[dict[str, str]]:
    return [dict(item) for item in TEMPLATES.values()]


def known_graph_codes() -> set[str]:
    return set(TEMPLATES)


def compile_template(
    graph_code: str | None,
    model: BaseChatModel,
    *,
    settings: Settings | None = None,
    tools: list | None = None,
):
    code = (graph_code or LEGAL_QA_REACT).strip()
    if code not in TEMPLATES:
        code = LEGAL_QA_REACT
    return build_agent_graph(model, settings=settings, tools=tools)
