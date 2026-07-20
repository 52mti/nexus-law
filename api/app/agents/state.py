from typing import Annotated, Any, NotRequired, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """LangGraph state for the Stage-4 single-agent MVP."""

    messages: Annotated[list[BaseMessage], add_messages]
    iteration: int
    context: NotRequired[dict[str, Any]]
