from app.agents.tools.basic import calculator, get_current_time
from app.agents.tools.rag import search_documents
from app.core.config import Settings, get_settings

# Keep legacy alias for older imports/tests
AGENT_TOOLS = [get_current_time, calculator]
_ALL_TOOLS = [get_current_time, calculator, search_documents]


def get_agent_tools(settings: Settings | None = None):
    settings = settings or get_settings()
    whitelist = settings.agent_tool_whitelist_set
    if not whitelist:
        return list(_ALL_TOOLS)
    return [tool for tool in _ALL_TOOLS if tool.name in whitelist]
