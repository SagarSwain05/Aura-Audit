"""
Semantic candidate search — embeds a recruiter's free-text query and student
skill profiles with the same Gemini text-embedding-004 (768-dim) pipeline
already used for student-side job matching (services/embeddings.py), so a
search like "MERN" ranks a candidate whose skills are React/Node/Express/
MongoDB highly even though none of those strings literally contain "MERN" —
a real semantic match, not a keyword/regex filter.
"""

import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.embeddings import generate_embedding, prepare_student_text
from services.llm_client import llm_generate_json
from prompts import BLIND_HIRING_SUMMARY_PROMPT

router = APIRouter(prefix="/candidates", tags=["Candidates"])

# Embedding calls go through a single shared Gemini key (services/embeddings.py
# uses its own lightweight client, not the rotating pool in llm_client.py) —
# bound concurrency so a large candidate batch doesn't hammer that one key.
_EMBED_CONCURRENCY = asyncio.Semaphore(8)


class EmbedTextRequest(BaseModel):
    text: str


class StudentProfile(BaseModel):
    id: str
    skills: list[dict] = []


class EmbedBatchRequest(BaseModel):
    students: list[StudentProfile]


@router.post("/embed-text")
async def embed_text(req: EmbedTextRequest):
    """Embed a single free-text query (the recruiter's search string)."""
    try:
        vec = await asyncio.to_thread(generate_embedding, req.text)
        return {"vector": vec.tolist()}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/embed-batch")
async def embed_batch(req: EmbedBatchRequest):
    """
    Embed each candidate's weighted skill profile. Called only for students
    whose embedding isn't already cached on their record — the Node side
    persists the result so the same candidate is never re-embedded on a
    later search.
    """
    async def embed_one(s: StudentProfile):
        async with _EMBED_CONCURRENCY:
            text = prepare_student_text(s.skills)
            vec = await asyncio.to_thread(generate_embedding, text)
            return {"id": s.id, "vector": vec.tolist()}

    try:
        results = await asyncio.gather(*[embed_one(s) for s in req.students])
        return {"embeddings": results}
    except Exception as e:
        raise HTTPException(500, str(e))


class BlindSummaryRequest(BaseModel):
    department: str = ""
    skills: list[str] = []
    cgpa: float = 0.0
    readiness: int = 0
    dream_role: str = ""


@router.post("/blind-summary")
async def blind_summary(req: BlindSummaryRequest):
    """
    LLM-written, skill-first candidate summary for the Blind Hiring profile
    view — deliberately excludes name/college/location/gender by instruction
    (the caller never sends those fields in the first place, and the prompt
    also explicitly forbids pronouns and prestige markers as a second layer).
    """
    prompt = BLIND_HIRING_SUMMARY_PROMPT.format(
        department=req.department or "not specified",
        skills=", ".join(req.skills) if req.skills else "none listed",
        cgpa=req.cgpa,
        readiness=req.readiness,
        dream_role=req.dream_role or "not specified",
    )
    try:
        result = await llm_generate_json(prompt, category="blind_hiring")
        return {"summary": result.get("summary", "")}
    except Exception as e:
        raise HTTPException(502, str(e))
