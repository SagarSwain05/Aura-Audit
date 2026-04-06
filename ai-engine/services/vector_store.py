"""
ChromaDB vector store for semantic job matching (RAG pipeline).
Persists to ./data/chroma_db — no external service needed.
"""

import os
import numpy as np
from typing import Optional
import chromadb
from chromadb.config import Settings

_PERSIST_PATH = os.path.join(os.path.dirname(__file__), "../data/chroma_db")
os.makedirs(_PERSIST_PATH, exist_ok=True)

_client = chromadb.PersistentClient(
    path=_PERSIST_PATH,
    settings=Settings(anonymized_telemetry=False),
)

_job_collection = _client.get_or_create_collection(
    name="jobs",
    metadata={"hnsw:space": "cosine"},
)


def _normalize(vec: np.ndarray) -> list[float]:
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec.tolist()
    return (vec / norm).tolist()


def index_job(job_id: str, embedding: np.ndarray, metadata: dict) -> None:
    """Add or update a job in the vector store."""
    # Sanitize metadata — ChromaDB requires str/int/float/bool values
    safe_meta = {
        k: (str(v) if not isinstance(v, (str, int, float, bool)) else v)
        for k, v in metadata.items()
        if v is not None
    }
    existing = _job_collection.get(ids=[job_id])
    if existing["ids"]:
        _job_collection.update(
            ids=[job_id],
            embeddings=[_normalize(embedding)],
            metadatas=[safe_meta],
        )
    else:
        _job_collection.add(
            ids=[job_id],
            embeddings=[_normalize(embedding)],
            metadatas=[safe_meta],
        )


def search_jobs(
    query_embedding: np.ndarray,
    top_k: int = 20,
    where: Optional[dict] = None,
) -> list[dict]:
    """
    Cosine similarity search. Returns list of
    {id, metadata, similarity_score (0–100)}.
    """
    kwargs = dict(
        query_embeddings=[_normalize(query_embedding)],
        n_results=min(top_k, max(1, _job_collection.count())),
        include=["metadatas", "distances"],
    )
    if where:
        kwargs["where"] = where

    try:
        results = _job_collection.query(**kwargs)
    except Exception:
        return []

    output = []
    for i, doc_id in enumerate(results["ids"][0]):
        # ChromaDB cosine distance → similarity: 1 - distance/2 (distance in [0,2])
        dist = results["distances"][0][i]
        similarity = max(0.0, 1.0 - dist / 2.0)
        output.append({
            "id": doc_id,
            "metadata": results["metadatas"][0][i],
            "similarity_score": round(similarity * 100, 2),
        })
    return output


def delete_job(job_id: str) -> None:
    _job_collection.delete(ids=[job_id])


def collection_count() -> int:
    return _job_collection.count()


def get_stats() -> dict:
    return {
        "total_jobs_indexed": collection_count(),
        "persist_path": _PERSIST_PATH,
    }
