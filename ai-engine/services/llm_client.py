"""
Unified LLM Client — Gemini key pool rotation + Groq fallback, hardened for
concurrent load (many users hitting the AI engine at once):

  - Concurrency semaphore: caps how many LLM calls run at once process-wide,
    so a burst of requests queues instead of all hitting the key pool
    simultaneously and all failing together (thundering herd).
  - Per-key cooldown tracking: a key that just got 429'd is skipped on the
    NEXT request too (not just retried blindly), instead of every concurrent
    request rediscovering the same exhausted key from scratch.
  - Circuit breaker: after several consecutive total failures (both Gemini
    AND Groq pools exhausted), fail fast for a short window instead of every
    new request wasting 10-30s retrying a pool that's clearly not recovering
    yet — callers get a fallback response quickly instead of hanging.
  - Shorter inter-key pause instead of long exponential backoff — with
    cooldown-aware rotation, the next key tried is a different quota bucket,
    so there's no need to wait out THIS key's specific limit before moving on.
  - Per-category dedicated key pools: each caller passes a `category`
    (e.g. "audit", "assessment", "jobs", "interview", "market"). If
    GEMINI_KEY_{CATEGORY}_1.. / GROQ_KEY_{CATEGORY}_1.. env vars are set,
    that category gets its OWN isolated pool + rotation index + cooldown
    tracking, so heavy use or a bad patch on one feature can't starve every
    other feature of the shared pool. Falls back to the shared pool
    (GEMINI_KEY_1../GROQ_KEY_1..) when no dedicated keys exist for a
    category — fully backward compatible, zero behavior change until
    dedicated keys are actually added.

Priority order:
  1. User-provided key (passed per-request — highest priority, bypasses the
     circuit breaker since it's a separate, non-shared quota)
  2. Gemini key pool for this category — dedicated if configured, else
     shared GEMINI_KEY_1 … GEMINI_KEY_N + GEMINI_API_KEY (round-robin,
     cooldown-aware). Tried across most/all configured keys before giving
     up on Gemini for this call, not just the first one or two.
  3. Groq fallback for this category — same dedicated-or-shared pattern.

Usage:
    from services.llm_client import llm_generate, llm_generate_json

    text = await llm_generate("your prompt", category="audit", user_key="optional-user-key")
    data = await llm_generate_json("your prompt", category="assessment")
"""

import os
import re
import json
import time
import random
import asyncio
import threading
from typing import Optional

# ── Tuning (env-configurable, safe defaults for a small free-tier instance) ───

MAX_CONCURRENT_LLM_CALLS = int(os.getenv("MAX_CONCURRENT_LLM_CALLS", "8"))
KEY_COOLDOWN_SECONDS = float(os.getenv("KEY_COOLDOWN_SECONDS", "45"))
CIRCUIT_FAILURE_THRESHOLD = int(os.getenv("CIRCUIT_FAILURE_THRESHOLD", "5"))
CIRCUIT_OPEN_SECONDS = float(os.getenv("CIRCUIT_OPEN_SECONDS", "20"))
# How many keys to try per call before giving up on a provider. Previously 2
# for Gemini / 3 for Groq — far too shallow for a 10/8-key pool: a single
# transient blip (Gemini's own "high demand" 503s are common right after a
# cold start) on the first one or two keys abandoned the whole 10-key pool
# and fell to Groq, which then did the same thing on its 8-key pool. Now
# tries most of each pool before actually failing over.
GEMINI_MAX_RETRIES_DEFAULT = int(os.getenv("GEMINI_MAX_RETRIES", "6"))
GROQ_MAX_RETRIES_DEFAULT = int(os.getenv("GROQ_MAX_RETRIES", "6"))
# Neither SDK bounded an individual call by default, so one stalled key
# (a common Render free-tier network hiccup) could hang far longer than the
# "30-60 seconds" a user is told to expect — with up to 6 keys tried per
# provider, an unbounded per-call hang compounds into a many-minute stall.
# This caps each attempt so a bad key fails fast and rotation moves on.
LLM_CALL_TIMEOUT_SECONDS = float(os.getenv("LLM_CALL_TIMEOUT_SECONDS", "25"))

_llm_semaphore = asyncio.Semaphore(MAX_CONCURRENT_LLM_CALLS)

# ── Key Pool Helpers ──────────────────────────────────────────────────────────

# Per-category rotation index + lock, created lazily so any category string
# works without pre-registration.
_index_locks: dict[str, threading.Lock] = {}
_indexes: dict[str, int] = {}
_index_registry_lock = threading.Lock()

_cooldown_lock = threading.Lock()
_cooldowns: dict[str, float] = {}  # f"{provider}:{key}" -> monotonic resume time


def _numbered_keys(prefix: str) -> list[str]:
    keys: list[str] = []
    for i in range(1, 10):
        k = os.getenv(f"{prefix}_{i}", "").strip()
        if k:
            keys.append(k)
    return keys


def _shared_gemini_keys() -> list[str]:
    keys = _numbered_keys("GEMINI_KEY")
    main = os.getenv("GEMINI_API_KEY", "").strip()
    if main and main not in keys:
        keys.append(main)
    return keys


def _shared_groq_keys() -> list[str]:
    keys = _numbered_keys("GROQ_KEY")
    main = os.getenv("GROQ_API_KEY", "").strip()
    if main and main not in keys:
        keys.append(main)
    return keys


def _gemini_keys(category: str = "general") -> list[str]:
    """
    Dedicated pool for this category (GEMINI_KEY_{CATEGORY}_1..9) if any are
    configured, else the shared pool. Category names are free-form strings
    (e.g. "audit", "assessment", "jobs") — uppercased for the env var lookup.
    """
    dedicated = _numbered_keys(f"GEMINI_KEY_{category.upper()}")
    return dedicated if dedicated else _shared_gemini_keys()


def _groq_keys(category: str = "general") -> list[str]:
    dedicated = _numbered_keys(f"GROQ_KEY_{category.upper()}")
    return dedicated if dedicated else _shared_groq_keys()


def provider_status() -> dict:
    """Return non-secret provider configuration status for health/readiness checks."""
    gemini = _shared_gemini_keys()
    groq = _shared_groq_keys()
    return {
        "gemini_keys_configured": len(gemini),
        "groq_keys_configured": len(groq),
        "has_any_llm_provider": bool(gemini or groq),
    }


def _mark_cooldown(provider: str, key: str) -> None:
    with _cooldown_lock:
        _cooldowns[f"{provider}:{key}"] = time.monotonic() + KEY_COOLDOWN_SECONDS


def _is_cooling(provider: str, key: str) -> bool:
    with _cooldown_lock:
        until = _cooldowns.get(f"{provider}:{key}")
        return until is not None and time.monotonic() < until


def _index_ref(provider: str, category: str):
    """Lazily creates a per-(provider, category) rotation index + lock."""
    name = f"{provider}:{category}"
    with _index_registry_lock:
        if name not in _index_locks:
            _index_locks[name] = threading.Lock()
            _indexes[name] = 0

    def get():
        return _indexes[name]

    def set_(v):
        _indexes[name] = v

    return (_index_locks[name], get, set_)


def _ordered_attempt_keys(provider: str, all_keys: list[str], count: int, index_ref: tuple) -> list[str]:
    """
    Build a rotation-fair attempt sequence, preferring keys that aren't
    currently in cooldown. Falls back to cooling keys only if every key in
    the pool is currently cooling (better to try than to give up outright).
    """
    if not all_keys:
        return []
    available = [k for k in all_keys if not _is_cooling(provider, k)]
    pool = available if available else all_keys

    lock, get_index, set_index = index_ref
    with lock:
        start = get_index()
        set_index(start + count)

    seen = set()
    out = []
    for offset in range(min(count, len(pool))):
        k = pool[(start + offset) % len(pool)]
        if k not in seen:
            seen.add(k)
            out.append(k)
    return out


# ── Circuit breaker (both providers exhausted repeatedly -> fail fast) ────────

_circuit_lock = threading.Lock()
_circuit_consecutive_failures = 0
_circuit_open_until = 0.0


def _circuit_is_open() -> bool:
    with _circuit_lock:
        return time.monotonic() < _circuit_open_until


def _record_success() -> None:
    global _circuit_consecutive_failures
    with _circuit_lock:
        _circuit_consecutive_failures = 0


def _record_total_failure() -> None:
    global _circuit_consecutive_failures, _circuit_open_until
    with _circuit_lock:
        _circuit_consecutive_failures += 1
        if _circuit_consecutive_failures >= CIRCUIT_FAILURE_THRESHOLD:
            _circuit_open_until = time.monotonic() + CIRCUIT_OPEN_SECONDS
            print(f"🔴 Circuit breaker OPEN for {CIRCUIT_OPEN_SECONDS:.0f}s "
                  f"after {_circuit_consecutive_failures} consecutive total failures")


# ── Gemini Caller ─────────────────────────────────────────────────────────────

def _call_gemini_sync(
    prompt: str,
    api_key: str,
    json_mode: bool = False,
    model: str = "",
) -> str:
    from google import genai
    from google.genai import types

    config = types.GenerateContentConfig(
        temperature=0.0 if json_mode else 0.3,
        **({"response_mime_type": "application/json"} if json_mode else {}),
    )
    selected_model = model or os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=int(LLM_CALL_TIMEOUT_SECONDS * 1000)),
    )
    resp = client.models.generate_content(
        model=selected_model,
        contents=[prompt],
        config=config,
    )
    return (resp.text or "").strip()


async def _try_gemini(
    prompt: str,
    user_key: Optional[str],
    json_mode: bool,
    max_retries: int,
    category: str = "general",
) -> Optional[str]:
    """
    Try Gemini with cooldown-aware key rotation. Returns text on success,
    None if all attempted keys/retries are exhausted for this call.
    """
    all_keys = _gemini_keys(category)
    if not all_keys and not user_key:
        return None

    attempt_keys: list[str] = []
    if user_key:
        attempt_keys.append(user_key)
    attempt_keys += [
        k for k in _ordered_attempt_keys("gemini", all_keys, min(max_retries, len(all_keys) or 1), _index_ref("gemini", category))
        if k not in attempt_keys
    ]

    for i, key in enumerate(attempt_keys):
        try:
            text = await asyncio.to_thread(_call_gemini_sync, prompt, key, json_mode)
            print(f"✅ Gemini OK ({category}, key #{i + 1})")
            return text
        except Exception as e:
            err = str(e)
            is_rate = "429" in err or "RESOURCE_EXHAUSTED" in err
            if is_rate:
                _mark_cooldown("gemini", key)
                print(f"⚠️  Gemini key #{i + 1} ({category}) rate-limited, cooling down {KEY_COOLDOWN_SECONDS:.0f}s…")
            else:
                print(f"⚠️  Gemini key #{i + 1} ({category}) error: {err[:120]}")
            # Short pause before the next (different) key — no need to wait
            # out THIS key's limit, we're not retrying it again this call.
            if i < len(attempt_keys) - 1:
                await asyncio.sleep(min(0.3 * (i + 1) + random.uniform(0, 0.3), 2))

    print(f"⚠️  Gemini pool exhausted for this request ({category}, {len(attempt_keys)} keys tried).")
    return None


# ── Groq Caller ──────────────────────────────────────────────────────────────

_GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")  # high-context, free tier

def _call_groq_sync(prompt: str, api_key: str, json_mode: bool) -> str:
    from groq import Groq

    # max_retries=0: the Groq SDK retries the SAME key internally by default
    # (up to 2x) — redundant with, and additive to, our own rotation across
    # different keys, and neither layer bounded the retried calls without an
    # explicit timeout, so a bad key could burn several unbounded attempts.
    client = Groq(api_key=api_key, timeout=LLM_CALL_TIMEOUT_SECONDS, max_retries=0)
    messages = [{"role": "user", "content": prompt}]
    kwargs = {"model": _GROQ_MODEL, "messages": messages, "temperature": 0.0 if json_mode else 0.3}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    resp = client.chat.completions.create(**kwargs)
    return (resp.choices[0].message.content or "").strip()


async def _try_groq(prompt: str, json_mode: bool, max_retries: int, category: str = "general") -> Optional[str]:
    """Try Groq pool with cooldown-aware rotation. Returns text or None."""
    all_keys = _groq_keys(category)
    if not all_keys:
        return None

    attempt_keys = _ordered_attempt_keys("groq", all_keys, min(max_retries, len(all_keys)), _index_ref("groq", category))

    for i, key in enumerate(attempt_keys):
        try:
            text = await asyncio.to_thread(_call_groq_sync, prompt, key, json_mode)
            print(f"✅ Groq OK ({category}, key #{i + 1})")
            return text
        except Exception as e:
            err = str(e)
            is_rate = "429" in err or "rate_limit" in err.lower()
            if is_rate:
                _mark_cooldown("groq", key)
                print(f"⚠️  Groq key #{i + 1} ({category}) rate-limited, cooling down {KEY_COOLDOWN_SECONDS:.0f}s…")
            else:
                print(f"⚠️  Groq key #{i + 1} ({category}) error: {err[:100]}")
            if i < len(attempt_keys) - 1:
                await asyncio.sleep(min(0.3 * (i + 1) + random.uniform(0, 0.3), 2))

    print(f"⚠️  Groq pool exhausted for this request ({category}, {len(attempt_keys)} keys tried).")
    return None


# ── Public Interface ──────────────────────────────────────────────────────────

async def llm_generate(
    prompt: str,
    json_mode: bool = False,
    user_key: Optional[str] = None,
    category: str = "general",
    max_retries: int = None,
    groq_max_retries: int = None,
) -> str:
    """
    Generate text via Gemini (cooldown-aware rotation) -> Groq fallback,
    bounded by a process-wide concurrency limit so a burst of requests
    queues instead of all hammering the key pool at once.

    `category` selects a dedicated key pool (GEMINI_KEY_{CATEGORY}_N /
    GROQ_KEY_{CATEGORY}_N) if configured, else the shared pool — pass a
    stable name per feature (e.g. "audit", "assessment", "jobs") so
    dedicated keys can be added later without any code change.

    Raises RuntimeError only if all providers fail (or the circuit breaker
    is open and no user_key was given to bypass it).
    """
    if _circuit_is_open() and not user_key:
        raise RuntimeError(
            "All LLM providers (Gemini + Groq) are currently unavailable "
            "(recovering from a recent outage — failing fast, try again shortly)."
        )

    gemini_retries = max_retries if max_retries is not None else GEMINI_MAX_RETRIES_DEFAULT
    groq_retries = groq_max_retries if groq_max_retries is not None else GROQ_MAX_RETRIES_DEFAULT

    async with _llm_semaphore:
        result = await _try_gemini(prompt, user_key, json_mode, gemini_retries, category)
        if result is not None:
            _record_success()
            return result

        print(f"🔄 Switching to Groq fallback… ({category})")
        result = await _try_groq(prompt, json_mode, groq_retries, category)
        if result is not None:
            _record_success()
            return result

        _record_total_failure()
        raise RuntimeError("All LLM providers (Gemini + Groq) are currently unavailable.")


def _parse_json_response(text: str) -> dict:
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1:
        return json.loads(text[start:end + 1])
    return json.loads(text)


async def llm_generate_json(
    prompt: str,
    user_key: Optional[str] = None,
    category: str = "general",
    max_retries: int = None,
) -> dict:
    """
    Generate and parse JSON response.
    Raises (does not silently swallow) if the provider is unavailable or the
    response can't be parsed as JSON even after one retry — callers must
    handle failure explicitly instead of receiving a misleadingly "successful" {}.
    """
    text = await llm_generate(prompt, json_mode=True, user_key=user_key, category=category, max_retries=max_retries)
    try:
        return _parse_json_response(text)
    except Exception as e:
        print(f"⚠️  JSON parse failed: {e} | raw: {text[:200]} — retrying once")
        text = await llm_generate(prompt, json_mode=True, user_key=user_key, category=category, max_retries=max_retries)
        try:
            return _parse_json_response(text)
        except Exception as e2:
            raise RuntimeError(f"LLM returned unparseable JSON after retry: {e2} | raw: {text[:200]}")
