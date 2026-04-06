"""
Unified LLM Client — Gemini key pool rotation + exponential backoff + Groq fallback.

Priority order:
  1. User-provided key (passed per-request — highest priority)
  2. Gemini key pool: GEMINI_KEY_1 … GEMINI_KEY_N + GEMINI_API_KEY (round-robin)
  3. Groq fallback: GROQ_KEY_1 … GROQ_KEY_N + GROQ_API_KEY (if all Gemini keys 429)

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

# ── Key Pool Helpers ──────────────────────────────────────────────────────────

_gemini_index_lock = threading.Lock()
_gemini_index = 0

_groq_index_lock = threading.Lock()
_groq_index = 0


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


def _next_gemini_key() -> Optional[str]:
    global _gemini_index
    keys = _gemini_keys()
    if not keys:
        return None
    with _gemini_index_lock:
        key = keys[_gemini_index % len(keys)]
        _gemini_index += 1
    return key


def _next_groq_key() -> Optional[str]:
    global _groq_index
    keys = _groq_keys()
    if not keys:
        return None
    with _groq_index_lock:
        key = keys[_groq_index % len(keys)]
        _groq_index += 1
    return key


# ── Gemini Caller ─────────────────────────────────────────────────────────────

def _call_gemini_sync(
    prompt: str,
    api_key: str,
    json_mode: bool = False,
    model: str = "gemini-2.0-flash",
) -> str:
    from google import genai
    from google.genai import types

    config = types.GenerateContentConfig(
        temperature=0.0 if json_mode else 0.3,
        **({"response_mime_type": "application/json"} if json_mode else {}),
    )
    client = genai.Client(api_key=api_key)
    resp = client.models.generate_content(
        model=model,
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
    Try Gemini with key rotation + exponential backoff.
    Returns text on success, None if all keys/retries exhausted.
    """
    all_keys = _gemini_keys()
    total_keys = len(all_keys)
    if not total_keys and not user_key:
        return None

    # Build attempt sequence: user_key first (if given), then rotate through pool
    attempt_keys: list[str] = []
    if user_key:
        attempt_keys.append(user_key)
    for _ in range(min(max_retries, total_keys or 1)):
        k = _next_gemini_key()
        if k and k not in attempt_keys:
            attempt_keys.append(k)

    last_is_rate_limit = False
    for i, key in enumerate(attempt_keys):
        backoff = min(2 ** i + random.uniform(0, 0.5), 16)
        try:
            text = await asyncio.to_thread(_call_gemini_sync, prompt, key, json_mode)
            print(f"✅ Gemini OK (key #{i + 1})")
            return text
        except Exception as e:
            err = str(e)
            is_rate = "429" in err or "RESOURCE_EXHAUSTED" in err
            last_is_rate_limit = is_rate
            if is_rate:
                print(f"⚠️  Gemini key #{i + 1} rate-limited, rotating… (backoff {backoff:.1f}s)")
                await asyncio.sleep(backoff)
            else:
                print(f"⚠️  Gemini key #{i + 1} error: {err[:120]}")
                # Non-rate error — still try next key
                await asyncio.sleep(1)

    print("⚠️  All Gemini keys exhausted.")
    return None


# ── Groq Caller ──────────────────────────────────────────────────────────────

_GROQ_MODEL = "llama-3.3-70b-versatile"  # fast, high context, free tier

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
    """Try Groq pool with rotation. Returns text or None."""
    keys = _groq_keys()
    if not keys:
        return None

    for i in range(min(max_retries, len(keys))):
        key = _next_groq_key()
        if not key:
            break
        try:
            text = await asyncio.to_thread(_call_groq_sync, prompt, key, json_mode)
            print(f"✅ Groq OK (key #{i + 1})")
            return text
        except Exception as e:
            err = str(e)
            is_rate = "429" in err or "rate_limit" in err.lower()
            print(f"⚠️  Groq key #{i + 1} {'rate-limited' if is_rate else 'error'}: {err[:100]}")
            if is_rate:
                await asyncio.sleep(2 ** i + random.uniform(0, 0.5))

    print("⚠️  All Groq keys exhausted.")
    return None


# ── Public Interface ──────────────────────────────────────────────────────────

async def llm_generate(
    prompt: str,
    json_mode: bool = False,
    user_key: Optional[str] = None,
    max_retries: int = 4,
) -> str:
    """
    Generate text via Gemini (with rotation) → Groq fallback.
    Raises RuntimeError only if all providers fail.
    """
    # 1. Try Gemini pool
    result = await _try_gemini(prompt, user_key, json_mode, max_retries)
    if result is not None:
        return result

    # 2. Groq fallback
    print("🔄 Switching to Groq fallback…")
    result = await _try_groq(prompt, json_mode)
    if result is not None:
        return result

    raise RuntimeError("All LLM providers (Gemini + Groq) are currently unavailable.")


async def llm_generate_json(
    prompt: str,
    user_key: Optional[str] = None,
    max_retries: int = 4,
) -> dict:
    """Generate and parse JSON response. Returns {} on parse failure."""
    text = await llm_generate(prompt, json_mode=True, user_key=user_key, max_retries=max_retries)
    try:
        # Strip markdown fences if present
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(text[start:end + 1])
        return json.loads(text)
    except Exception as e:
        print(f"⚠️  JSON parse failed: {e} | raw: {text[:200]}")
        return {}
