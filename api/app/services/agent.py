from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import build_agent_graph, extract_tool_trace, final_assistant_text
from app.agents.prompts.system import SYSTEM_PROMPT
from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.db.models import Conversation, Message, MessageRole
from app.services import conversation as conversation_service
from app.services.llm import LangChainLLMClient, _map_llm_error, get_llm_client


@dataclass(slots=True)
class AgentRunResult:
    conversation_id: str
    answer: str
    model: str
    latency_ms: float
    tool_trace: list[dict[str, Any]] = field(default_factory=list)
    iterations: int = 0


class AgentService:
    def __init__(
        self,
        *,
        settings: Settings | None = None,
        llm_client: LangChainLLMClient | None = None,
        graph=None,
    ) -> None:
        self._settings = settings or get_settings()
        self._llm_client = llm_client or get_llm_client()
        self._graph = graph

    def _get_graph(self):
        if self._graph is not None:
            return self._graph
        model = self._llm_client.build_chat_model()
        return build_agent_graph(model, settings=self._settings)

    async def run(
        self,
        session: AsyncSession,
        *,
        user_input: str,
        conversation_id: str | None = None,
        user_external_id: str | None = None,
        title: str | None = None,
        debug: bool = False,
    ) -> AgentRunResult:
        if not user_input.strip():
            raise AppError("input must not be empty", code="empty_input", status_code=422)

        conversation = await self._resolve_conversation(
            session,
            conversation_id=conversation_id,
            user_external_id=user_external_id,
            title=title or user_input[:80],
        )
        history = await conversation_service.get_conversation_messages(session, conversation.id)
        lc_messages = [SystemMessage(content=SYSTEM_PROMPT)]
        for item in history:
            if item.role == MessageRole.USER.value:
                lc_messages.append(HumanMessage(content=item.content))
            elif item.role == MessageRole.ASSISTANT.value:
                lc_messages.append(AIMessage(content=item.content))

        lc_messages.append(HumanMessage(content=user_input))
        max_iterations = self._settings.agent_max_iterations
        started = time.perf_counter()

        try:
            result = await self._get_graph().ainvoke(
                {
                    "messages": lc_messages,
                    "iteration": 0,
                    "context": {"max_iterations": max_iterations},
                },
                config={"recursion_limit": max(10, max_iterations * 2 + 2)},
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("agent_error type={}", type(exc).__name__)
            raise _map_llm_error(exc) from exc

        latency_ms = (time.perf_counter() - started) * 1000
        messages = list(result.get("messages") or [])
        answer = final_assistant_text(messages)
        iterations = int(result.get("iteration") or 0)
        tool_trace = extract_tool_trace(messages) if debug else []

        session.add(
            Message(
                conversation_id=conversation.id,
                role=MessageRole.USER.value,
                content=user_input,
            )
        )
        session.add(
            Message(
                conversation_id=conversation.id,
                role=MessageRole.ASSISTANT.value,
                content=answer,
            )
        )
        await session.flush()

        logger.info(
            "agent_run conversation_id={} latency_ms={:.2f} iterations={} tools={}",
            conversation.id,
            latency_ms,
            iterations,
            len(tool_trace) if debug else "hidden",
        )

        return AgentRunResult(
            conversation_id=conversation.id,
            answer=answer,
            model=self._settings.llm_model,
            latency_ms=latency_ms,
            tool_trace=tool_trace,
            iterations=iterations,
        )

    async def _resolve_conversation(
        self,
        session: AsyncSession,
        *,
        conversation_id: str | None,
        user_external_id: str | None,
        title: str | None,
    ) -> Conversation:
        if conversation_id:
            return await conversation_service.get_conversation(session, conversation_id)

        conversation, _ = await conversation_service.create_conversation(
            session,
            title=title,
            user_external_id=user_external_id,
        )
        return conversation


_agent_service: AgentService | None = None


def get_agent_service() -> AgentService:
    global _agent_service
    if _agent_service is None:
        _agent_service = AgentService()
    return _agent_service
