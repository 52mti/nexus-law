import re

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError

_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions", re.I),
    re.compile(r"disregard\s+(all\s+)?(previous|prior)\s+instructions", re.I),
    re.compile(r"reveal\s+(your\s+)?system\s+prompt", re.I),
    re.compile(r"<\s*\|\s*im_start\s*\|\s*>", re.I),
    re.compile(r"```\s*system", re.I),
]


def assert_safe_user_text(text: str, *, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    if not settings.prompt_guard_enabled:
        return
    sample = (text or "").strip()
    if not sample:
        return
    for pattern in _PATTERNS:
        if pattern.search(sample):
            raise AppError(
                "Request blocked by prompt safety guard",
                code="prompt_injection_blocked",
                status_code=400,
            )
