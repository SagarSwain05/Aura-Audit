"""
Embedding generation using Google Gemini text-embedding-004.
768-dimensional vectors via API — no local model download required.
Falls back to keyword hash if API unavailable.
"""

import os
import hashlib
import numpy as np
from google import genai
from google.genai import types as genai_types

_client = None

def _get_client():
    global _client
    if _client is None:
        api_key = (
            os.getenv("GEMINI_KEY_1") or
            os.getenv("GEMINI_API_KEY") or
            ""
        )
        _client = genai.Client(api_key=api_key)
    return _client


def _keyword_hash_embedding(text: str, dim: int = 768) -> np.ndarray:
    """Deterministic fallback embedding via keyword hashing (no API)."""
    vec = np.zeros(dim, dtype=np.float32)
    words = text.lower().split()
    for word in words:
        h = int(hashlib.md5(word.encode()).hexdigest(), 16)
        idx = h % dim
        vec[idx] += 1.0
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec


def generate_embedding(text: str) -> np.ndarray:
    """Encode text using Gemini text-embedding-004 (768-dim)."""
    try:
        client = _get_client()
        result = client.models.embed_content(
            model="text-embedding-004",
            contents=text,
            config=genai_types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
        )
        vec = np.array(result.embeddings[0].values, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec
    except Exception:
        return _keyword_hash_embedding(text)


def prepare_job_text(title: str, skills: list[str], description: str = "", requirements: list[str] = []) -> str:
    """Weighted job text for embedding."""
    parts = [
        title, title,
        " ".join(skills), " ".join(skills),
        description[:500] if description else "",
        " ".join(requirements[:10]),
    ]
    return " ".join(filter(None, parts))


def prepare_student_text(skills: list[dict]) -> str:
    """Weighted student text for embedding."""
    WEIGHTS = {"expert": 3, "advanced": 2, "intermediate": 1, "beginner": 1}
    parts = []
    for s in skills:
        name = s.get("name", "")
        level = s.get("level", "beginner").lower()
        weight = WEIGHTS.get(level, 1)
        parts.extend([name] * weight)
    return " ".join(parts) if parts else "general software development"


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Manual cosine similarity."""
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))
