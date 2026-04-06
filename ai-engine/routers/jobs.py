from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.job_matching import match_jobs_for_student, recommend_careers, index_job_document
from services.vector_store import delete_job, get_stats

router = APIRouter(prefix="/jobs", tags=["Jobs"])


class MatchRequest(BaseModel):
    skills: list[dict]   # [{ name: str, level: str }]
    cgpa: float = 0.0
    min_score: int = 30
    limit: int = 20


class CareerRequest(BaseModel):
    skills: list[dict]
    cgpa: float = 0.0
    top_n: int = 3


class IndexRequest(BaseModel):
    job_id: str
    title: str
    skills: list[str]
    description: str = ""
    requirements: list[str] = []
    company: str = ""
    location: str = ""
    job_type: str = ""
    salary: str = ""


@router.post("/match")
async def match_jobs(req: MatchRequest):
    try:
        matches = await match_jobs_for_student(req.skills, req.cgpa, req.min_score, req.limit)
        return {"success": True, "matches": matches, "total": len(matches)}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/careers")
async def career_recommendations(req: CareerRequest):
    try:
        results = recommend_careers(req.skills, req.cgpa, req.top_n)
        return {"success": True, "recommendations": results}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/index")
async def index_job(req: IndexRequest):
    try:
        index_job_document(
            job_id=req.job_id,
            title=req.title,
            skills=req.skills,
            description=req.description,
            requirements=req.requirements,
            company=req.company,
            location=req.location,
            job_type=req.job_type,
            salary=req.salary,
        )
        return {"success": True, "message": f"Job {req.job_id} indexed"}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/index/{job_id}")
async def remove_job(job_id: str):
    try:
        delete_job(job_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/index/stats")
async def index_stats():
    return get_stats()
