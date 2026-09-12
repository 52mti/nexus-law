import json
from typing import Any


def format_sse(event: str, data: dict[str, Any] | str) -> str:
    """Format one Server-Sent Event frame.

    Envelope: ``{"event": "<name>", "data": ...}``

    - ``conversation_meta``: dict with conversation_id / request_id / model / title
    - ``token``: raw model text string
    - ``tool_start`` / ``tool_end`` / ``final`` / ``error``: event-specific dict
    """
    payload = json.dumps({"event": event, "data": data}, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"
