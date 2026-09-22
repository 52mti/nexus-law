from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import extract_tool_trace, final_assistant_text
from app.agents.prompts.system import SYSTEM_PROMPT
from app.agents.templates import LEGAL_QA_REACT, compile_template
from app.agents.tools import get_agent_tools
from app.agents.trace import (
    NodeTraceHandler,
    compact_node_trace,
    serialize_chain_input,
    serialize_chain_output,
    used_search_from_trace,
    used_tools_from_trace,
)
from app.core.biz import BizError
from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.db.models import Agent, AgentRun, Conversation, Message, MessageRole
from app.rag.retriever import extract_sources_from_tool_result
from app.schemas.agent import ConversationMetaEventData
from app.services import conversation as conversation_service
from app.services.admin import agent as agent_admin
from app.services.admin.prompt import get_active_system_prompt_record
from app.services.llm import LangChainLLMClient, _map_llm_error, get_llm_client

_SOURCE_ITEMS = 12


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


def collect_token_usage(messages: list | None) -> tuple[int | None, int | None, int | None]:
    if not messages:
        return None, None, None
    inp = 0
    out = 0
    total = 0
    found = False
    for message in messages:
        usage = getattr(message, "usage_metadata", None)
        if not usage:
            meta = getattr(message, "response_metadata", None) or {}
            usage = meta.get("token_usage") or meta.get("usage")
        if not isinstance(usage, dict) or not usage:
            continue
        found = True
        inp += int(usage.get("input_tokens") or usage.get("prompt_tokens") or 0)
        out += int(usage.get("output_tokens") or usage.get("completion_tokens") or 0)
        total += int(usage.get("total_tokens") or 0)
    if not found:
        return None, None, None
    if total <= 0:
        total = inp + out
    return (inp or None, out or None, total or None)


def compact_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in sources[:_SOURCE_ITEMS]:
        snippet = item.get("snippet") or item.get("content") or ""
        out.append(
            {
                "source": item.get("source"),
                "document_id": item.get("document_id"),
                "chunk_index": item.get("chunk_index"),
                "snippet": snippet[:240] if isinstance(snippet, str) else snippet,
            }
        )
    return out


def _stream_token_text(chunk: Any) -> str:
    """Extract visible model text from an AIMessageChunk / content block."""
    if chunk is None:
        return ""
    text = getattr(chunk, "text", None)
    if isinstance(text, str) and text:
        return text
    content = getattr(chunk, "content", None)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str) and block:
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                value = block.get("text")
                if isinstance(value, str) and value:
                    parts.append(value)
        return "".join(parts)
    return ""


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

    def _run_config(
        self,
        max_iterations: int,
        handler: NodeTraceHandler | None = None,
    ) -> dict[str, Any]:
        config: dict[str, Any] = {
            "recursion_limit": max(10, max_iterations * 2 + 2),
        }
        if handler is not None:
            config["callbacks"] = [handler]
        return config

    def _get_graph(
        self,
        *,
        streaming: bool = False,
        agent: Agent | None = None,
        collections: list[str] | None = None,
    ):
        if self._graph is not None:
            return self._graph
        temperature = float(agent.temperature) if agent is not None else None
        model = self._llm_client.build_chat_model(
            streaming=streaming,
            temperature=temperature,
        )
        whitelist = None
        if agent is not None and agent.tool_whitelist is not None:
            whitelist = list(agent.tool_whitelist)
        tools = get_agent_tools(
            self._settings,
            whitelist=whitelist,
            collections=collections or None,
        )
        graph_code = agent.graph_code if agent is not None else LEGAL_QA_REACT
        return compile_template(
            graph_code,
            model,
            settings=self._settings,
            tools=tools,
        )

    async def _load_runtime_agent(
        self,
        session: AsyncSession,
        conversation: Conversation,
        *,
        user_id: str,
    ) -> Agent | None:
        agent: Agent | None = None
        if conversation.agent_id:
            result = await session.get(Agent, conversation.agent_id)
            if result and not result.is_deleted and result.is_active:
                agent = result
        if agent is None:
            agent = await agent_admin.resolve_agent_for_user(session, user_id)
            if agent and conversation.agent_id != agent.id:
                conversation.agent_id = agent.id
                await session.flush()
        return agent

    async def _prepare(
        self,
        session: AsyncSession,
        *,
        user_input: str,
        conversation_id: str | None,
        user_id: str,
        title: str | None,
    ) -> tuple[Conversation, list, Agent | None, str | None, list[str]]:
        if not user_input.strip():
            raise AppError("input must not be empty", code="empty_input", status_code=422)

        conversation = await self._resolve_conversation(
            session,
            conversation_id=conversation_id,
            user_id=user_id,
            title=user_input,
        )
        agent = await self._load_runtime_agent(session, conversation, user_id=user_id)
        history = await conversation_service.get_conversation_messages(
            session,
            conversation.id,
            user_id=user_id,
        )
        prompt = await get_active_system_prompt_record(
            session,
            agent_id=conversation.agent_id,
        )
        system_prompt = prompt.content if prompt else SYSTEM_PROMPT
        prompt_id = prompt.id if prompt else None
        collections = await agent_admin.resolve_dataset_collections(
            session,
            agent.dataset_ids if agent else None,
        )
        lc_messages = [SystemMessage(content=system_prompt)]
        for item in history:
            if item.role == MessageRole.USER.value:
                lc_messages.append(HumanMessage(content=item.content))
            elif item.role == MessageRole.ASSISTANT.value:
                lc_messages.append(AIMessage(content=item.content))
        lc_messages.append(HumanMessage(content=user_input))
        return conversation, lc_messages, agent, prompt_id, collections

    async def _persist_turn(
        self,
        session: AsyncSession,
        *,
        conversation_id: str,
        user_input: str,
        answer: str,
        token_usage: int | None = None,
        sources: list[dict[str, Any]] | None = None,
    ) -> None:
        conversation = await conversation_service.get_conversation(session, conversation_id)
        now = datetime.now(UTC)
        conversation.last_message_at = now
        await conversation_service.sync_conversation_preview(
            session,
            conversation,
            title=user_input,
            content=answer,
        )
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
                token_usage=token_usage,
                sources_json=compact_sources(sources or []) or None,
            )
        )
        await session.flush()

    async def _persist_run(
        self,
        session: AsyncSession,
        *,
        conversation: Conversation,
        agent: Agent | None,
        prompt_id: str | None,
        user_id: str,
        model: str,
        latency_ms: float,
        iterations: int,
        error_code: str | None,
        token_input: int | None,
        token_output: int | None,
        tool_trace: list[dict[str, Any]],
        sources: list[dict[str, Any]],
    ) -> None:
        compacted = compact_node_trace(tool_trace)
        used_search = used_search_from_trace(compacted)
        retrieval_hit = bool(sources)
        max_iterations = self._settings.agent_max_iterations
        session.add(
            AgentRun(
                conversation_id=conversation.id,
                agent_id=agent.id if agent else conversation.agent_id,
                prompt_id=prompt_id,
                user_id=user_id,
                model=model,
                latency_ms=round(latency_ms, 2),
                iterations=iterations,
                error_code=error_code,
                token_input=token_input,
                token_output=token_output,
                tool_trace_json=compacted,
                retrieval_hit=retrieval_hit,
                used_search=used_search,
                used_tools=used_tools_from_trace(compacted),
                hit_max_iterations=iterations >= max_iterations,
                sources_json=compact_sources(sources) or None,
            )
        )
        await session.flush()

    async def run(
        self,
        session: AsyncSession,
        *,
        user_input: str,
        conversation_id: str | None = None,
        user_id: str,
        title: str | None = None,
        debug: bool = False,
    ) -> AgentRunResult:
        conversation, lc_messages, agent, prompt_id, collections = await self._prepare(
            session,
            user_input=user_input,
            conversation_id=conversation_id,
            user_id=user_id,
            title=title,
        )
        max_iterations = self._settings.agent_max_iterations
        started = time.perf_counter()
        error_code: str | None = None
        messages: list = []
        iterations = 0
        full_trace: list[dict[str, Any]] = []
        tool_pairs: list[dict[str, Any]] = []
        sources: list[dict[str, Any]] = []
        token_input = token_output = token_total = None
        answer = ""
        handler = NodeTraceHandler()

        try:
            result = await self._get_graph(
                streaming=False,
                agent=agent,
                collections=collections,
            ).ainvoke(
                {
                    "messages": lc_messages,
                    "iteration": 0,
                    "context": {"max_iterations": max_iterations},
                },
                config=self._run_config(max_iterations, handler),
            )
            messages = list(result.get("messages") or [])
            answer = final_assistant_text(messages)
            iterations = int(result.get("iteration") or 0)
            tool_pairs = extract_tool_trace(messages)
            full_trace = handler.nodes or tool_pairs
            sources = collect_rag_sources(messages=messages, tool_trace=tool_pairs)
            token_input, token_output, token_total = collect_token_usage(messages)
        except Exception as exc:
            logger.warning("agent_error type={}", type(exc).__name__)
            mapped = _map_llm_error(exc)
            error_code = mapped.code
            latency_ms = (time.perf_counter() - started) * 1000
            await self._persist_run(
                session,
                conversation=conversation,
                agent=agent,
                prompt_id=prompt_id,
                user_id=user_id,
                model=self._settings.llm_model,
                latency_ms=latency_ms,
                iterations=iterations,
                error_code=error_code,
                token_input=token_input,
                token_output=token_output,
                tool_trace=full_trace,
                sources=sources,
            )
            raise mapped from exc

        latency_ms = (time.perf_counter() - started) * 1000
        tool_trace = tool_pairs if debug else []

        await self._persist_turn(
            session,
            conversation_id=conversation.id,
            user_input=user_input,
            answer=answer,
            token_usage=token_total,
            sources=sources,
        )
        await self._persist_run(
            session,
            conversation=conversation,
            agent=agent,
            prompt_id=prompt_id,
            user_id=user_id,
            model=self._settings.llm_model,
            latency_ms=latency_ms,
            iterations=iterations,
            error_code=None,
            token_input=token_input,
            token_output=token_output,
            tool_trace=full_trace,
            sources=sources,
        )

        tool_names = sorted({item.get("name") for item in full_trace if item.get("name")})
        logger.info(
            "agent_run conversation_id={} agent_id={} model={} latency_ms={:.2f} "
            "iterations={} sources={} tool_names={}",
            conversation.id,
            conversation.agent_id,
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
        user_id: str,
        title: str | None = None,
        debug: bool = False,
        cancel_event: asyncio.Event | None = None,
    ) -> AsyncIterator[AgentStreamEvent]:
        """Yield SSE events: conversation_meta, token, tool_start, tool_end, final, error."""
        try:
            conversation, lc_messages, agent, prompt_id, collections = await self._prepare(
                session,
                user_input=user_input,
                conversation_id=conversation_id,
                user_id=user_id,
                title=title,
            )
        except BizError as exc:
            yield AgentStreamEvent(
                event="error",
                data={"code": exc.code, "message": exc.message},
            )
            return
        except AppError as exc:
            yield AgentStreamEvent(
                event="error",
                data={"code": exc.code, "message": exc.message, "details": exc.details},
            )
            return

        yield AgentStreamEvent(
            event="conversation_meta",
            data=ConversationMetaEventData(
                conversation_id=conversation.id,
                title=conversation_service.preview_title(user_input),
                model=self._settings.llm_model,
            ).model_dump(exclude_none=True),
        )

        max_iterations = self._settings.agent_max_iterations
        started = time.perf_counter()
        answer_parts: list[str] = []
        tool_trace: list[dict[str, Any]] = []
        node_spans: list[dict[str, Any]] = []
        pending_agent: dict[str, dict[str, Any]] = {}
        pending_tools: dict[str, dict[str, Any]] = {}
        iterations = 0
        latest_messages: list = []
        error_code: str | None = None
        handler = NodeTraceHandler()

        graph = self._get_graph(streaming=True, agent=agent, collections=collections)
        event_stream = graph.astream_events(
            {
                "messages": lc_messages,
                "iteration": 0,
                "context": {"max_iterations": max_iterations},
            },
            config=self._run_config(max_iterations, handler),
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
                run_id = str(event.get("run_id") or "")

                if kind == "on_chat_model_stream" and node != "tools":
                    chunk = data.get("chunk")
                    content = _stream_token_text(chunk)
                    if content:
                        answer_parts.append(content)
                        yield AgentStreamEvent(event="token", data=content)
                elif kind == "on_chain_start" and node == "agent":
                    pending_agent[run_id or "agent"] = {
                        "type": "agent",
                        "name": "agent",
                        "_t0": time.perf_counter(),
                        "input": serialize_chain_input(data.get("input")),
                    }
                elif kind == "on_chain_end" and node == "agent":
                    item = pending_agent.pop(run_id, None)
                    if item is None and pending_agent:
                        item = pending_agent.pop(next(iter(pending_agent)))
                    if item is not None:
                        started_at = item.pop("_t0", None)
                        item["latency_ms"] = (
                            round((time.perf_counter() - started_at) * 1000, 2)
                            if started_at
                            else None
                        )
                        item["output"] = serialize_chain_output(data.get("output"))
                        node_spans.append(item)
                elif kind == "on_tool_start":
                    name = event.get("name")
                    tool_input = data.get("input")
                    args = tool_input if isinstance(tool_input, dict) else {"input": tool_input}
                    item = {
                        "name": name,
                        "args": args,
                        "result": None,
                    }
                    tool_trace.append(item)
                    pending_tools[run_id or name or "tool"] = {
                        "type": "tool",
                        "name": name,
                        "_t0": time.perf_counter(),
                        "input": args,
                    }
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
                    span = pending_tools.pop(run_id, None)
                    if span is None:
                        for key, pending in list(pending_tools.items()):
                            if pending.get("name") == name:
                                span = pending_tools.pop(key)
                                break
                    if span is not None:
                        started_at = span.pop("_t0", None)
                        span["output"] = result_text
                        span["latency_ms"] = (
                            round((time.perf_counter() - started_at) * 1000, 2)
                            if started_at
                            else None
                        )
                        node_spans.append(span)
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
            error_code = mapped.code
            latency_ms = (time.perf_counter() - started) * 1000
            await self._persist_run(
                session,
                conversation=conversation,
                agent=agent,
                prompt_id=prompt_id,
                user_id=user_id,
                model=self._settings.llm_model,
                latency_ms=latency_ms,
                iterations=iterations,
                error_code=error_code,
                token_input=None,
                token_output=None,
                tool_trace=handler.nodes or node_spans or tool_trace,
                sources=[],
            )
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
        token_input = token_output = token_total = None
        persist_trace: list[dict[str, Any]] = handler.nodes or node_spans or tool_trace
        try:
            if latest_messages:
                answer = final_assistant_text(latest_messages)
                full_trace = extract_tool_trace(latest_messages)
                tool_trace = full_trace if debug else tool_trace
                sources = collect_rag_sources(messages=latest_messages, tool_trace=full_trace)
                token_input, token_output, token_total = collect_token_usage(latest_messages)
                persist_trace = handler.nodes or node_spans or full_trace
            else:
                answer = "".join(answer_parts).strip()
                if not answer:
                    raise AppError(
                        "Agent stream finished without content",
                        code="agent_empty_response",
                        status_code=502,
                    )
                sources = collect_rag_sources(tool_trace=tool_trace)
                persist_trace = handler.nodes or node_spans or tool_trace

            await self._persist_turn(
                session,
                conversation_id=conversation.id,
                user_input=user_input,
                answer=answer,
                token_usage=token_total,
                sources=sources,
            )
            await self._persist_run(
                session,
                conversation=conversation,
                agent=agent,
                prompt_id=prompt_id,
                user_id=user_id,
                model=self._settings.llm_model,
                latency_ms=latency_ms,
                iterations=iterations,
                error_code=None,
                token_input=token_input,
                token_output=token_output,
                tool_trace=persist_trace,
                sources=sources,
            )
        except AppError as exc:
            await self._persist_run(
                session,
                conversation=conversation,
                agent=agent,
                prompt_id=prompt_id,
                user_id=user_id,
                model=self._settings.llm_model,
                latency_ms=latency_ms,
                iterations=iterations,
                error_code=exc.code,
                token_input=token_input,
                token_output=token_output,
                tool_trace=persist_trace,
                sources=sources,
            )
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

        tool_names = sorted({item.get("name") for item in (tool_trace or []) if item.get("name")})
        logger.info(
            "agent_stream_done conversation_id={} agent_id={} model={} latency_ms={:.2f} "
            "iterations={} sources={} tool_names={}",
            conversation.id,
            conversation.agent_id,
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
        user_id: str,
        title: str | None,
    ) -> Conversation:
        if conversation_id:
            return await conversation_service.get_conversation(
                session,
                conversation_id,
                user_id=user_id,
            )

        agent = await agent_admin.resolve_agent_for_user(session, user_id)
        return await conversation_service.create_conversation(
            session,
            title=title,
            user_id=user_id,
            agent_id=agent.id if agent else None,
        )


@dataclass(slots=True)
class AgentStreamEvent:
    event: str
    data: dict[str, Any] | str


_agent_service: AgentService | None = None


def get_agent_service() -> AgentService:
    global _agent_service
    if _agent_service is None:
        _agent_service = AgentService()
    return _agent_service
