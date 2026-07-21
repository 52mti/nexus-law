from __future__ import annotations

from typing import Any, Literal

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode

from app.agents.prompts.system import SYSTEM_PROMPT
from app.agents.state import AgentState
from app.agents.tools import get_agent_tools
from app.core.config import Settings, get_settings
from app.core.exceptions import AppError


def _should_continue(state: AgentState) -> Literal["tools", "__end__"]:
    messages = state["messages"]
    if not messages:
        return "__end__"
    last = messages[-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        max_iterations = state.get("context", {}).get("max_iterations")
        iteration = state.get("iteration", 0)
        if isinstance(max_iterations, int) and iteration >= max_iterations:
            return "__end__"
        return "tools"
    return "__end__"


def build_agent_graph(model: BaseChatModel, *, settings: Settings | None = None):
    """Compile the ReAct agent graph with basic + RAG tools."""
    settings = settings or get_settings()
    tools = list(get_agent_tools(settings))
    model_with_tools = model.bind_tools(tools)
    tool_node = ToolNode(tools)

    async def agent_node(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
        messages = list(state["messages"])
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=SYSTEM_PROMPT), *messages]
        # Pass config so LangGraph token streaming / cancellation propagates.
        response = await model_with_tools.ainvoke(messages, config)
        return {
            "messages": [response],
            "iteration": state.get("iteration", 0) + 1,
        }

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)
    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", _should_continue, {"tools": "tools", "__end__": END})
    graph.add_edge("tools", "agent")
    return graph.compile()


def extract_tool_trace(messages: list[BaseMessage]) -> list[dict[str, Any]]:
    """Extract tool call / result pairs for debug responses."""
    trace: list[dict[str, Any]] = []
    pending: dict[str, dict[str, Any]] = {}

    for message in messages:
        if isinstance(message, AIMessage) and message.tool_calls:
            for call in message.tool_calls:
                call_id = call.get("id") or ""
                item = {
                    "tool_call_id": call_id,
                    "name": call.get("name"),
                    "args": call.get("args") or {},
                    "result": None,
                }
                pending[call_id] = item
                trace.append(item)
        elif getattr(message, "type", None) == "tool":
            call_id = getattr(message, "tool_call_id", None)
            if call_id and call_id in pending:
                pending[call_id]["result"] = getattr(message, "content", None)
            else:
                trace.append(
                    {
                        "tool_call_id": call_id,
                        "name": getattr(message, "name", None),
                        "args": {},
                        "result": getattr(message, "content", None),
                    }
                )
    return trace


def final_assistant_text(messages: list[BaseMessage]) -> str:
    for message in reversed(messages):
        if not isinstance(message, AIMessage):
            continue
        content = message.content
        text = content if isinstance(content, str) else str(content)
        if text.strip() and not message.tool_calls:
            return text
        if text.strip() and message.tool_calls:
            return text
    raise AppError(
        "Agent finished without a final assistant message "
        "(possibly hit max tool iterations)",
        code="agent_empty_response",
        status_code=502,
    )
