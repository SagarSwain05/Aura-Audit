"""
Embedding generation using sentence-transformers (all-MiniLM-L6-v2).
384-dimensional dense vectors, runs fully locally — no API cost.
"""

import numpy as np
from functools import lru_cache
from sentence_transformers import SentenceTransformer

_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    """Lazy-load the model once and cache it."""
    return SentenceTransformer(_MODEL_NAME)


def generate_embedding(text: str) -> np.ndarray:
    """Encode text to a 384-dim normalized embedding."""
    model = _get_model()
    vec = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
    return vec.astype(np.float32)


def prepare_job_text(title: str, skills: list[str], description: str = "", requirements: list[str] = []) -> str:
    """
    Weighted job text for embedding.
    Title and skills are repeated to increase their semantic weight.
    """
    parts = [
        title, title,                          # 2x weight
        " ".join(skills), " ".join(skills),    # 2x weight
        description[:500] if description else "",
        " ".join(requirements[:10]),
    ]
    return " ".join(filter(None, parts))


def prepare_student_text(skills: list[dict]) -> str:
    """
    Weighted student text for embedding.
    Expert skills appear 3x, advanced 2x, beginner/intermediate 1x.
    """
    WEIGHTS = {"expert": 3, "advanced": 2, "intermediate": 1, "beginner": 1}
    parts = []
    for s in skills:
        name = s.get("name", "")
        level = s.get("level", "beginner").lower()
        weight = WEIGHTS.get(level, 1)
        parts.extend([name] * weight)
    return " ".join(parts) if parts else "general software development"


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Manual cosine similarity for debugging."""
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))
