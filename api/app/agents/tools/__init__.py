from app.agents.tools.basic import calculator, get_current_time
from app.agents.tools.rag import search_documents

# Keep legacy alias for older imports/tests
AGENT_TOOLS = [get_current_time, calculator]


def get_agent_tools():
    return [get_current_time, calculator, search_documents]
