"""
Aura-Audit AI Engine — FastAPI application entry point.
Full-stack career platform AI: resume audit, assessment, RAG job matching, career reco.
"""

import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from parser import extract_text_from_bytes, detect_sections, count_metrics, find_weak_verbs
from auditor import analyze_resume, analyze_gap, generate_roadmap, generate_interview_questions, get_market_demand, enhance_bullet
from matcher import get_top_matches
from services.youtube_service import search_tutorials
from routers.assessment import router as assessment_router
from routers.jobs import router as jobs_router
from routers.live_jobs import router as live_jobs_router

app = FastAPI(
    title="Aura-Audit AI Engine",
    description="NLP + Gemini + RAG-powered career intelligence backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────
app.include_router(assessment_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(live_jobs_router, prefix="/api/v1")


# ── Root + Health ─────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "ok", "service": "Aura-Audit AI Engine", "version": "2.0.0", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "Aura-Audit v2.0.0"}


# ── Resume Analysis (existing) ───────────────────────
@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    dream_role: str = Form(default=""),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")
    pdf_bytes = await file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large. Max 10 MB.")

    parsed = extract_text_from_bytes(pdf_bytes)
    resume_text = parsed["text"]
    if len(resume_text.strip()) < 100:
        raise HTTPException(422, "Could not extract meaningful text from this PDF.")

    import asyncio
    audit_result = await analyze_resume(resume_text)
    if isinstance(audit_result, Exception):
        raise HTTPException(500, str(audit_result))

    extracted_skills = audit_result.get("extracted_skills", [])
    extracted_experience = audit_result.get("extracted_experience", [])

    job_matches = await get_top_matches(extracted_skills)
    audit_result["job_matches"] = job_matches

    if dream_role:
        try:
            audit_result["gap_analysis"] = await analyze_gap(extracted_skills, dream_role, extracted_experience)
        except Exception:
            audit_result["gap_analysis"] = None
    else:
        audit_result["gap_analysis"] = None

    try:
        market = await get_market_demand(extracted_skills[:10])
        audit_result["market_demand"] = market.get("demand", {})
        audit_result["market_meta"] = {"trending": market.get("trending_additions", []), "hot_cities": market.get("hot_cities", {})}
    except Exception:
        audit_result["market_demand"] = {}
        audit_result["market_meta"] = {}

    audit_result["user_id"] = user_id
    audit_result["resume_meta"] = {
        "pages": parsed["pages"],
        "method": parsed["method"],
        "word_count": len(resume_text.split()),
        "metrics_count": count_metrics(resume_text),
        "weak_verbs_count": len(find_weak_verbs(parsed["lines"])),
    }
    return JSONResponse(content=audit_result)


@app.post("/roadmap")
async def roadmap_endpoint(
    skill: str = Form(default=""),
    dream_role: str = Form(...),
    days: int = Form(default=30),
):
    try:
        skills_list = [s.strip() for s in skill.split(",") if s.strip()] if skill else [dream_role]
        result = await generate_roadmap(skills_list, dream_role, days)
        # Enrich first 5 days with YouTube resources (non-fatal)
        for day in result.get("days", [])[:5]:
            try:
                yt = await search_tutorials(day.get("topic", ""), max_results=2)
                existing = day.get("resources", [])
                day["resources"] = existing + yt
            except Exception:
                pass
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/interview")
async def interview_endpoint(
    resume_text: str = Form(default=""),
    role: str = Form(default="Software Engineer"),
):
    try:
        result = await generate_interview_questions(resume_text or "No resume provided", role)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/enhance-bullet")
async def enhance_bullet_endpoint(original: str = Form(...), role_context: str = Form(default="")):
    try:
        return JSONResponse(content=await enhance_bullet(original, role_context))
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/parse-only")
async def parse_only(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")
    pdf_bytes = await file.read()
    parsed = extract_text_from_bytes(pdf_bytes)
    return JSONResponse(content={
        "text": parsed["text"],
        "pages": parsed["pages"],
        "sections": detect_sections(parsed["text"]),
        "metrics": count_metrics(parsed["text"]),
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
