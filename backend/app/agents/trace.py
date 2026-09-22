from __future__ import annotations

import json
import time
from typing import Any
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import BaseMessage

from app.rag.retriever import extract_sources_from_tool_result

_TRACE_ITEMS = 20
_MESSAGE_CHARS = 400
_IO_CHARS = 800
_MAX_MESSAGES = 8


def truncate_value(value: Any, limit: int = _IO_CHARS) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        return value if len(value) <= limit else value[:limit] + "…"
    try:
        text = json.dumps(value, ensure_ascii=False)
    except (TypeError, ValueError):
        text = str(value)
    if len(text) <= limit:
        return value
    return text[:limit] + "…"


def message_preview(message: Any, *, limit: int = _MESSAGE_CHARS) -> dict[str, Any]:
    role = getattr(message, "type", None) or "unknown"
    content = getattr(message, "content", None)
    if not isinstance(content, str):
        content = str(content or "")
    item: dict[str, Any] = {
        "role": role,
        "content": content if len(content) <= limit else content[:limit] + "…",
    }
    name = getattr(message, "name", None)
    if name:
        item["name"] = name
    tool_calls = getattr(message, "tool_calls", None) or []
    if tool_calls:
        item["tool_calls"] = [
            {
                "name": call.get("name"),
                "args": truncate_value(call.get("args") or {}, 240),
            }
            for call in tool_calls
            if isinstance(call, dict)
        ]
    return item


def messages_preview(messages: list | None) -> list[dict[str, Any]]:
    items = [message_preview(item) for item in (messages or [])]
    if len(items) <= _MAX_MESSAGES:
        return items
    return items[-_MAX_MESSAGES:]


def serialize_chain_input(inp: Any) -> Any:
    if isinstance(inp, dict):
        messages = inp.get("messages")
        if messages is not None:
            return {
                "messages": messages_preview(list(messages)),
                "iteration": inp.get("iteration"),
            }
        return truncate_value(inp)
    if isinstance(inp, list):
        return messages_preview(inp)
    return truncate_value(inp)


def serialize_chain_output(out: Any) -> Any:
    if isinstance(out, dict):
        messages = out.get("messages")
        if messages:
            return message_preview(messages[-1], limit=_IO_CHARS)
        return truncate_value(out)
    if isinstance(out, BaseMessage):
        return message_preview(out, limit=_IO_CHARS)
    return truncate_value(out)


def _ai_output_from_response(response: Any) -> Any:
    generations = getattr(response, "generations", None) or []
    if not generations or not generations[0]:
        return None
    gen = generations[0][0]
    message = getattr(gen, "message", None)
    if message is not None:
        return message_preview(message, limit=_IO_CHARS)
    text = getattr(gen, "text", None)
    if isinstance(text, str):
        return text if len(text) <= _IO_CHARS else text[:_IO_CHARS] + "…"
    return None


def _tool_output_text(output: Any) -> Any:
    if output is None:
        return None
    content = getattr(output, "content", None)
    if content is not None:
        return content
    if isinstance(output, (str, dict, list)):
        return output
    return str(output)


class NodeTraceHandler(BaseCallbackHandler):
    """Record agent/tool node input, output and latency for observability."""

    raise_error = False

    def __init__(self) -> None:
        super().__init__()
        self.nodes: list[dict[str, Any]] = []
        self._pending: dict[str, dict[str, Any]] = {}

    def on_chat_model_start(
        self,
        serialized: dict[str, Any],
        messages: list[list[BaseMessage]],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        batch = messages[0] if messages and isinstance(messages[0], list) else messages
        self._pending[str(run_id)] = {
            "type": "agent",
            "name": "agent",
            "_t0": time.perf_counter(),
            "input": messages_preview(list(batch or [])),
        }

    def on_chat_model_end(self, response: Any, *, run_id: UUID, **kwargs: Any) -> None:
        pending = self._pending.pop(str(run_id), None)
        if not pending:
            return
        started = pending.pop("_t0", None)
        pending["output"] = _ai_output_from_response(response)
        pending["latency_ms"] = (
            round((time.perf_counter() - started) * 1000, 2) if started else None
        )
        self.nodes.append(pending)

    def on_chat_model_error(self, error: BaseException, *, run_id: UUID, **kwargs: Any) -> None:
        pending = self._pending.pop(str(run_id), None)
        if not pending:
            return
        started = pending.pop("_t0", None)
        pending["output"] = {"error": type(error).__name__}
        pending["latency_ms"] = (
            round((time.perf_counter() - started) * 1000, 2) if started else None
        )
        self.nodes.append(pending)

    def on_tool_start(
        self,
        serialized: dict[str, Any] | None,
        input_str: str,
        *,
        run_id: UUID,
        inputs: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> None:
        name = (serialized or {}).get("name") or kwargs.get("name")
        self._pending[str(run_id)] = {
            "type": "tool",
            "name": name,
            "_t0": time.perf_counter(),
            "input": inputs if inputs is not None else input_str,
        }

    def on_tool_end(self, output: Any, *, run_id: UUID, **kwargs: Any) -> None:
        pending = self._pending.pop(str(run_id), None)
        if not pending:
            return
        started = pending.pop("_t0", None)
        pending["output"] = _tool_output_text(output)
        pending["latency_ms"] = (
            round((time.perf_counter() - started) * 1000, 2) if started else None
        )
        self.nodes.append(pending)

    def on_tool_error(self, error: BaseException, *, run_id: UUID, **kwargs: Any) -> None:
        pending = self._pending.pop(str(run_id), None)
        if not pending:
            return
        started = pending.pop("_t0", None)
        pending["output"] = {"error": type(error).__name__}
        pending["latency_ms"] = (
            round((time.perf_counter() - started) * 1000, 2) if started else None
        )
        self.nodes.append(pending)


def _empty_retrieval(name: str | None, output: Any) -> bool:
    if name != "search_documents":
        return False
    text = output
    if isinstance(output, dict) and "content" in output:
        text = output.get("content")
    return not extract_sources_from_tool_result(text)


def compact_node_trace(trace: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    compacted: list[dict[str, Any]] = []
    for item in (trace or [])[:_TRACE_ITEMS]:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        node_type = item.get("type")
        if node_type not in {"agent", "tool"}:
            node_type = "tool" if name and name != "agent" else "agent"
        output = item.get("output")
        if output is None:
            output = item.get("result")
        if output is None:
            output = item.get("result_preview")
        input_state = item.get("input")
        if input_state is None:
            input_state = item.get("args")
        compacted.append(
            {
                "type": node_type,
                "name": name or node_type,
                "input": truncate_value(input_state, _IO_CHARS),
                "output": truncate_value(output, _IO_CHARS),
                "latency_ms": item.get("latency_ms"),
                "empty_retrieval": bool(item.get("empty_retrieval"))
                or _empty_retrieval(name, output),
            }
        )
    return compacted


def used_tools_from_trace(trace: list[dict[str, Any]]) -> bool:
    return any(
        item.get("type") == "tool" or item.get("name") not in {None, "agent"}
        for item in trace
    )


def used_search_from_trace(trace: list[dict[str, Any]]) -> bool:
    return any(item.get("name") == "search_documents" for item in trace)
