"""
Real-Time Live Jobs Router
POST /api/v1/jobs/live — Google Jobs via SerpApi + LLM scoring (Gemini pool → Groq)
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import List, Optional

from services.real_time_jobs import search_live_jobs

router = APIRouter(tags=["live-jobs"])


class LiveJobsRequest(BaseModel):
    skills: List[str] = Field(default_factory=list)
    dream_role: str = Field(default="")
    location: str = Field(default="India")
    experience_titles: Optional[List[str]] = Field(default=None)
    num_jobs: int = Field(default=10, ge=1, le=20)
    score_matches: bool = Field(default=True)


class LiveJobsResponse(BaseModel):
    query: str
    location: str
    total: int
    jobs: List[dict]
    error: Optional[str] = None


@router.post("/jobs/live", response_model=LiveJobsResponse)
async def get_live_jobs(
    request: LiveJobsRequest,
    x_user_gemini_key: Optional[str] = Header(default=None, alias="x-user-gemini-key"),
):
    """
    Fetch real-time Google Jobs and score each via LLM.
    Optional header: x-user-gemini-key for user-provided Gemini API key.
    """
    try:
        result = await search_live_jobs(
            skills=request.skills,
            dream_role=request.dream_role,
            location=request.location,
            experience_titles=request.experience_titles,
            num_jobs=request.num_jobs,
            score_matches=request.score_matches,
            user_key=x_user_gemini_key or None,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
