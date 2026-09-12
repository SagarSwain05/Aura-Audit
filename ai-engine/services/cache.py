"""
Tiny in-process TTL cache for LLM responses that are safe to share across
users — market demand trends and learning roadmaps don't meaningfully change
minute-to-minute, so caching them by input avoids burning shared LLM quota on
requests that would produce near-identical output anyway. NOT used for
anything personalized/must-be-fresh (resume analysis, assessment grading,
interview questions) — those always call the LLM live.

Process-local only (no Redis) — resets on restart, doesn't share across
workers/instances. Acceptable for this app's scale; if traffic grows enough
to need a shared cache, swap this module's internals for a Redis client
without changing call sites.
"""
import time
import threading
from typing import Optional, Callable, Awaitable, Any

_lock = threading.Lock()
_store: dict[str, tuple[float, Any]] = {}  # key -> (expires_at, value)


def get(key: str) -> Optional[Any]:
    with _lock:
        entry = _store.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if time.monotonic() >= expires_at:
            del _store[key]
            return None
        return value


def set(key: str, value: Any, ttl_seconds: float) -> None:
    with _lock:
        _store[key] = (time.monotonic() + ttl_seconds, value)
        # Opportunistic cleanup so this doesn't grow unbounded over a long
        # uptime — cheap since it only runs on writes, not every read.
        if len(_store) > 500:
            now = time.monotonic()
            expired = [k for k, (exp, _) in _store.items() if now >= exp]
            for k in expired:
                del _store[k]


async def get_or_compute(key: str, ttl_seconds: float, compute: Callable[[], Awaitable[Any]]) -> Any:
    cached = get(key)
    if cached is not None:
        return cached
    value = await compute()
    set(key, value, ttl_seconds)
    return value
