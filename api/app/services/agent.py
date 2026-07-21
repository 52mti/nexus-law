from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterator
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
from app.rag.retriever import extract_sources_from_tool_result
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
    sources: list[dict[str, Any]] = field(default_factory=list)


def collect_rag_sources(
    *,
    messages: list | None = None,
    tool_trace: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    seen: set[tuple[Any, Any, Any]] = set()

    def _extend(items: list[dict[str, Any]]) -> None:
        for item in items:
            key = (item.get("source"), item.get("document_id"), item.get("chunk_index"))
            if key in seen:
                continue
            seen.add(key)
            sources.append(item)

    if tool_trace:
        for item in tool_trace:
            if item.get("name") == "search_documents":
                _extend(extract_sources_from_tool_result(item.get("result")))
    if messages:
        for message in messages:
            if getattr(message, "type", None) == "tool" and getattr(message, "name", None) == (
                "search_documents"
            ):
                _extend(extract_sources_from_tool_result(getattr(message, "content", None)))
    return sources


@dataclass(slots=True)
class AgentStreamEvent:
    event: str
    data: dict[str, Any]


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

    def _get_graph(self, *, streaming: bool = False):
        if self._graph is not None:
            return self._graph
        model = self._llm_client.build_chat_model(streaming=streaming)
        return build_agent_graph(model, settings=self._settings)

    async def _prepare(
        self,
        session: AsyncSession,
        *,
        user_input: str,
        conversation_id: str | None,
        user_external_id: str | None,
        title: str | None,
    ) -> tuple[Conversation, list]:
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
        return conversation, lc_messages

    async def _persist_turn(
        self,
        session: AsyncSession,
        *,
        conversation_id: str,
        user_input: str,
        answer: str,
    ) -> None:
        session.add(
            Message(
                conversation_id=conversation_id,
                role=MessageRole.USER.value,
                content=user_input,
            )
        )
        session.add(
            Message(
                conversation_id=conversation_id,
                role=MessageRole.ASSISTANT.value,
                content=answer,
            )
        )
        await session.flush()

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
        conversation, lc_messages = await self._prepare(
            session,
            user_input=user_input,
            conversation_id=conversation_id,
            user_external_id=user_external_id,
            title=title,
        )
        max_iterations = self._settings.agent_max_iterations
        started = time.perf_counter()

        try:
            result = await self._get_graph(streaming=False).ainvoke(
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
        full_trace = extract_tool_trace(messages)
        tool_trace = full_trace if debug else []
        sources = collect_rag_sources(messages=messages, tool_trace=full_trace)

        await self._persist_turn(
            session,
            conversation_id=conversation.id,
            user_input=user_input,
            answer=answer,
        )

        tool_names = sorted(
            {item.get("name") for item in full_trace if item.get("name")}
        )
        logger.info(
            "agent_run conversation_id={} model={} latency_ms={:.2f} "
            "iterations={} sources={} tool_names={}",
            conversation.id,
            self._settings.llm_model,
            latency_ms,
            iterations,
            len(sources),
            tool_names,
        )

        return AgentRunResult(
            conversation_id=conversation.id,
            answer=answer,
            model=self._settings.llm_model,
            latency_ms=latency_ms,
            tool_trace=tool_trace,
            iterations=iterations,
            sources=sources,
        )

    async def stream(
        self,
        session: AsyncSession,
        *,
        user_input: str,
        conversation_id: str | None = None,
        user_external_id: str | None = None,
        title: str | None = None,
        debug: bool = False,
        cancel_event: asyncio.Event | None = None,
    ) -> AsyncIterator[AgentStreamEvent]:
        """Yield SSE-oriented events: token / tool_start / tool_end / final / error."""
        try:
            conversation, lc_messages = await self._prepare(
                session,
                user_input=user_input,
                conversation_id=conversation_id,
                user_external_id=user_external_id,
                title=title,
            )
        except AppError as exc:
            yield AgentStreamEvent(
                event="error",
                data={"code": exc.code, "message": exc.message, "details": exc.details},
            )
            return

        max_iterations = self._settings.agent_max_iterations
        started = time.perf_counter()
        answer_parts: list[str] = []
        tool_trace: list[dict[str, Any]] = []
        iterations = 0
        latest_messages: list = []

        graph = self._get_graph(streaming=True)
        event_stream = graph.astream_events(
            {
                "messages": lc_messages,
                "iteration": 0,
                "context": {"max_iterations": max_iterations},
            },
            config={"recursion_limit": max(10, max_iterations * 2 + 2)},
            version="v2",
        )

        try:
            async for event in event_stream:
                if cancel_event and cancel_event.is_set():
                    logger.info(
                        "agent_stream_cancelled conversation_id={}",
                        conversation.id,
                    )
                    break

                kind = event.get("event")
                data = event.get("data") or {}
                meta = event.get("metadata") or {}
                node = meta.get("langgraph_node")

                if kind == "on_chat_model_stream" and node == "agent":
                    chunk = data.get("chunk")
                    content = getattr(chunk, "content", None)
                    if isinstance(content, str) and content:
                        answer_parts.append(content)
                        yield AgentStreamEvent(
                            event="token",
                            data={
                                "conversation_id": conversation.id,
                                "content": content,
                            },
                        )
                elif kind == "on_tool_start":
                    name = event.get("name")
                    tool_input = data.get("input")
                    item = {
                        "name": name,
                        "args": tool_input if isinstance(tool_input, dict) else {"input": tool_input},
                        "result": None,
                    }
                    tool_trace.append(item)
                    yield AgentStreamEvent(
                        event="tool_start",
                        data={
                            "conversation_id": conversation.id,
                            "name": name,
                            "args": item["args"],
                        },
                    )
                elif kind == "on_tool_end":
                    name = event.get("name")
                    output = data.get("output")
                    result_text = getattr(output, "content", None)
                    if result_text is None:
                        result_text = str(output) if output is not None else None
                    for item in reversed(tool_trace):
                        if item.get("name") == name and item.get("result") is None:
                            item["result"] = result_text
                            break
                    yield AgentStreamEvent(
                        event="tool_end",
                        data={
                            "conversation_id": conversation.id,
                            "name": name,
                            "result": result_text,
                        },
                    )
                elif kind == "on_chain_end" and event.get("name") == "LangGraph":
                    output = data.get("output") or {}
                    if isinstance(output, dict):
                        latest_messages = list(output.get("messages") or [])
                        iterations = int(output.get("iteration") or 0)
        except asyncio.CancelledError:
            logger.info("agent_stream_task_cancelled conversation_id={}", conversation.id)
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("agent_stream_error type={}", type(exc).__name__)
            mapped = _map_llm_error(exc)
            yield AgentStreamEvent(
                event="error",
                data={
                    "conversation_id": conversation.id,
                    "code": mapped.code,
                    "message": mapped.message,
                    "details": mapped.details,
                },
            )
            return
        finally:
            await event_stream.aclose()

        if cancel_event and cancel_event.is_set():
            return

        latency_ms = (time.perf_counter() - started) * 1000
        sources: list[dict[str, Any]] = []
        try:
            if latest_messages:
                answer = final_assistant_text(latest_messages)
                full_trace = extract_tool_trace(latest_messages)
                tool_trace = full_trace if debug else tool_trace
                sources = collect_rag_sources(messages=latest_messages, tool_trace=full_trace)
            else:
                answer = "".join(answer_parts).strip()
                if not answer:
                    raise AppError(
                        "Agent stream finished without content",
                        code="agent_empty_response",
                        status_code=502,
                    )
                sources = collect_rag_sources(tool_trace=tool_trace)

            await self._persist_turn(
                session,
                conversation_id=conversation.id,
                user_input=user_input,
                answer=answer,
            )
        except AppError as exc:
            yield AgentStreamEvent(
                event="error",
                data={
                    "conversation_id": conversation.id,
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                },
            )
            return

        tool_names = sorted(
            {item.get("name") for item in (tool_trace or []) if item.get("name")}
        )
        logger.info(
            "agent_stream_done conversation_id={} model={} latency_ms={:.2f} "
            "iterations={} sources={} tool_names={}",
            conversation.id,
            self._settings.llm_model,
            latency_ms,
            iterations,
            len(sources),
            tool_names,
        )
        yield AgentStreamEvent(
            event="final",
            data={
                "conversation_id": conversation.id,
                "answer": answer,
                "model": self._settings.llm_model,
                "latency_ms": latency_ms,
                "iterations": iterations,
                "tool_trace": tool_trace if debug else None,
                "sources": sources,
            },
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
