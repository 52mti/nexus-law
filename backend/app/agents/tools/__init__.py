from app.agents.tools.basic import calculator, get_current_time
from app.agents.tools.rag import build_search_tool, search_documents
from app.core.config import Settings, get_settings

# Keep legacy alias for older imports/tests
AGENT_TOOLS = [get_current_time, calculator]


def get_agent_tools(
    settings: Settings | None = None,
    *,
    whitelist: list[str] | None = None,
    collections: list[str] | None = None,
):
    settings = settings or get_settings()
    search_tool = (
        build_search_tool(collections)
        if collections
        else search_documents
    )
    all_tools = [get_current_time, calculator, search_tool]
    names = (
        set(whitelist)
        if whitelist is not None
        else settings.agent_tool_whitelist_set
    )
    if not names:
        return list(all_tools) if whitelist is None else []
    return [tool for tool in all_tools if tool.name in names]
