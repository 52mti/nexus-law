from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError

_lock = asyncio.Lock()
_buckets: dict[str, deque[float]] = defaultdict(deque)


async def check_rate_limit(
    identity: str,
    *,
    settings: Settings | None = None,
) -> None:
    settings = settings or get_settings()
    if not settings.rate_limit_enabled or settings.rate_limit_per_minute <= 0:
        return

    now = time.monotonic()
    window = 60.0
    limit = settings.rate_limit_per_minute

    async with _lock:
        bucket = _buckets[identity]
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= limit:
            raise AppError(
                "Rate limit exceeded. Try again later.",
                code="rate_limited",
                status_code=429,
                details={"limit_per_minute": limit},
            )
        bucket.append(now)


def reset_rate_limits() -> None:
    """Test helper."""
    _buckets.clear()
