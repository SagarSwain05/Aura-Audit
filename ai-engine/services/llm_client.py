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

Priority order:
  1. User-provided key (passed per-request — highest priority, bypasses the
     circuit breaker since it's a separate, non-shared quota)
  2. Gemini key pool: GEMINI_KEY_1 … GEMINI_KEY_N + GEMINI_API_KEY (round-robin,
     cooldown-aware)
  3. Groq fallback: GROQ_KEY_1 … GROQ_KEY_N + GROQ_API_KEY (if all Gemini keys
     are exhausted/cooling)

Usage:
    from services.llm_client import llm_generate, llm_generate_json

    text = await llm_generate("your prompt", user_key="optional-user-key")
    data = await llm_generate_json("your prompt")   # returns parsed dict
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

_llm_semaphore = asyncio.Semaphore(MAX_CONCURRENT_LLM_CALLS)

# ── Key Pool Helpers ──────────────────────────────────────────────────────────

_gemini_index_lock = threading.Lock()
_gemini_index = 0

_groq_index_lock = threading.Lock()
_groq_index = 0

_cooldown_lock = threading.Lock()
_cooldowns: dict[str, float] = {}  # f"{provider}:{key}" -> monotonic resume time


def _gemini_keys() -> list[str]:
    """Collect all configured Gemini keys, numbered first then legacy single."""
    keys: list[str] = []
    for i in range(1, 10):
        k = os.getenv(f"GEMINI_KEY_{i}", "").strip()
        if k:
            keys.append(k)
    main = os.getenv("GEMINI_API_KEY", "").strip()
    if main and main not in keys:
        keys.append(main)
    return keys


def _groq_keys() -> list[str]:
    keys: list[str] = []
    for i in range(1, 10):
        k = os.getenv(f"GROQ_KEY_{i}", "").strip()
        if k:
            keys.append(k)
    main = os.getenv("GROQ_API_KEY", "").strip()
    if main and main not in keys:
        keys.append(main)
    return keys


def provider_status() -> dict:
    """Return non-secret provider configuration status for health/readiness checks."""
    return {
        "gemini_keys_configured": len(_gemini_keys()),
        "groq_keys_configured": len(_groq_keys()),
        "has_any_llm_provider": bool(_gemini_keys() or _groq_keys()),
    }


def _mark_cooldown(provider: str, key: str) -> None:
    with _cooldown_lock:
        _cooldowns[f"{provider}:{key}"] = time.monotonic() + KEY_COOLDOWN_SECONDS


def _is_cooling(provider: str, key: str) -> bool:
    with _cooldown_lock:
        until = _cooldowns.get(f"{provider}:{key}")
        return until is not None and time.monotonic() < until


def _ordered_attempt_keys(provider: str, all_keys: list[str], count: int, index_ref: list) -> list[str]:
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


def _gemini_index_ref():
    def get():
        return _gemini_index
    def set_(v):
        global _gemini_index
        _gemini_index = v
    return (_gemini_index_lock, get, set_)


def _groq_index_ref():
    def get():
        return _groq_index
    def set_(v):
        global _groq_index
        _groq_index = v
    return (_groq_index_lock, get, set_)


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
    client = genai.Client(api_key=api_key)
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
) -> Optional[str]:
    """
    Try Gemini with cooldown-aware key rotation. Returns text on success,
    None if all attempted keys/retries are exhausted for this call.
    """
    all_keys = _gemini_keys()
    if not all_keys and not user_key:
        return None

    attempt_keys: list[str] = []
    if user_key:
        attempt_keys.append(user_key)
    attempt_keys += [
        k for k in _ordered_attempt_keys("gemini", all_keys, min(max_retries, len(all_keys) or 1), _gemini_index_ref())
        if k not in attempt_keys
    ]

    for i, key in enumerate(attempt_keys):
        try:
            text = await asyncio.to_thread(_call_gemini_sync, prompt, key, json_mode)
            print(f"✅ Gemini OK (key #{i + 1})")
            return text
        except Exception as e:
            err = str(e)
            is_rate = "429" in err or "RESOURCE_EXHAUSTED" in err
            if is_rate:
                _mark_cooldown("gemini", key)
                print(f"⚠️  Gemini key #{i + 1} rate-limited, cooling down {KEY_COOLDOWN_SECONDS:.0f}s…")
            else:
                print(f"⚠️  Gemini key #{i + 1} error: {err[:120]}")
            # Short pause before the next (different) key — no need to wait
            # out THIS key's limit, we're not retrying it again this call.
            if i < len(attempt_keys) - 1:
                await asyncio.sleep(min(0.3 * (i + 1) + random.uniform(0, 0.3), 2))

    print("⚠️  Gemini pool exhausted for this request.")
    return None


# ── Groq Caller ──────────────────────────────────────────────────────────────

_GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")  # high-context, free tier

def _call_groq_sync(prompt: str, api_key: str, json_mode: bool) -> str:
    from groq import Groq

    client = Groq(api_key=api_key)
    messages = [{"role": "user", "content": prompt}]
    kwargs = {"model": _GROQ_MODEL, "messages": messages, "temperature": 0.0 if json_mode else 0.3}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    resp = client.chat.completions.create(**kwargs)
    return (resp.choices[0].message.content or "").strip()


async def _try_groq(prompt: str, json_mode: bool, max_retries: int = 3) -> Optional[str]:
    """Try Groq pool with cooldown-aware rotation. Returns text or None."""
    all_keys = _groq_keys()
    if not all_keys:
        return None

    attempt_keys = _ordered_attempt_keys("groq", all_keys, min(max_retries, len(all_keys)), _groq_index_ref())

    for i, key in enumerate(attempt_keys):
        try:
            text = await asyncio.to_thread(_call_groq_sync, prompt, key, json_mode)
            print(f"✅ Groq OK (key #{i + 1})")
            return text
        except Exception as e:
            err = str(e)
            is_rate = "429" in err or "rate_limit" in err.lower()
            if is_rate:
                _mark_cooldown("groq", key)
                print(f"⚠️  Groq key #{i + 1} rate-limited, cooling down {KEY_COOLDOWN_SECONDS:.0f}s…")
            else:
                print(f"⚠️  Groq key #{i + 1} error: {err[:100]}")
            if i < len(attempt_keys) - 1:
                await asyncio.sleep(min(0.3 * (i + 1) + random.uniform(0, 0.3), 2))

    print("⚠️  Groq pool exhausted for this request.")
    return None


# ── Public Interface ──────────────────────────────────────────────────────────

async def llm_generate(
    prompt: str,
    json_mode: bool = False,
    user_key: Optional[str] = None,
    max_retries: int = 2,
) -> str:
    """
    Generate text via Gemini (cooldown-aware rotation) -> Groq fallback,
    bounded by a process-wide concurrency limit so a burst of requests
    queues instead of all hammering the key pool at once.
    Raises RuntimeError only if all providers fail (or the circuit breaker
    is open and no user_key was given to bypass it).
    """
    if _circuit_is_open() and not user_key:
        raise RuntimeError(
            "All LLM providers (Gemini + Groq) are currently unavailable "
            "(recovering from a recent outage — failing fast, try again shortly)."
        )

    async with _llm_semaphore:
        result = await _try_gemini(prompt, user_key, json_mode, max_retries)
        if result is not None:
            _record_success()
            return result

        print("🔄 Switching to Groq fallback…")
        result = await _try_groq(prompt, json_mode)
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
    max_retries: int = 2,
) -> dict:
    """
    Generate and parse JSON response.
    Raises (does not silently swallow) if the provider is unavailable or the
    response can't be parsed as JSON even after one retry — callers must
    handle failure explicitly instead of receiving a misleadingly "successful" {}.
    """
    text = await llm_generate(prompt, json_mode=True, user_key=user_key, max_retries=max_retries)
    try:
        return _parse_json_response(text)
    except Exception as e:
        print(f"⚠️  JSON parse failed: {e} | raw: {text[:200]} — retrying once")
        text = await llm_generate(prompt, json_mode=True, user_key=user_key, max_retries=max_retries)
        try:
            return _parse_json_response(text)
        except Exception as e2:
            raise RuntimeError(f"LLM returned unparseable JSON after retry: {e2} | raw: {text[:200]}")
