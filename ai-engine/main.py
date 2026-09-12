"""
Aura-Audit AI Engine — FastAPI application entry point.
Full-stack career platform AI: resume audit, assessment, RAG job matching, career reco.
"""

import os
import re
import json
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Header
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from parser import extract_text_from_bytes, detect_sections, count_metrics, find_weak_verbs
from auditor import analyze_resume, analyze_gap, generate_roadmap, generate_interview_questions, get_market_demand, enhance_bullet
from matcher import get_top_matches
from services.youtube_service import search_tutorials
from services.pdf_editor import apply_redlines_to_pdf, PdfEditError
from routers.assessment import router as assessment_router
from routers.jobs import router as jobs_router
from routers.live_jobs import router as live_jobs_router
from services.llm_client import provider_status, llm_generate

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
    return {"status": "ok", "engine": "Aura-Audit v2.0.0", "providers": provider_status()}


@app.get("/ready")
async def ready():
    """Functional canary — actually calls the LLM instead of just checking key presence.
    A deprecated/renamed model (as happened before) leaves keys 'configured' but every
    real call failing; this catches that case instead of reporting false confidence."""
    providers = provider_status()
    llm_ok = True
    llm_error = None
    try:
        await llm_generate("Reply with the single word: ok", max_retries=1)
    except Exception as e:
        llm_ok = False
        llm_error = str(e)[:200]

    return {
        "status": "ready" if providers["has_any_llm_provider"] and llm_ok else "degraded",
        "engine": "Aura-Audit v2.0.0",
        "providers": providers,
        "llm_call_ok": llm_ok,
        "llm_call_error": llm_error,
    }


def _fallback_extract_skills(resume_text: str) -> list:
    """
    Defense-in-depth: if the LLM's own EXTRACTED SKILLS list comes back empty
    (observed for non-software-dev resumes, e.g. a "System Engineer"/sysadmin
    resume, before the prompt was broadened to be occupation-agnostic), pull a
    naive skill list from the resume's own detected "Skills" section instead
    of letting job-matching and market-demand cascade to fully empty.
    """
    sections = detect_sections(resume_text)
    skills_text = sections.get("skills", "")
    if not skills_text:
        return []
    tokens = re.split(r"[,|/\n••;]+", skills_text)
    skills = []
    for t in tokens:
        t = re.sub(r"^[\s\-:]+|[\s\-:]+$", "", t)
        if 1 < len(t) <= 40 and not t.lower().startswith(("skill", "technolog", "tech stack", "expertise", "competenc")):
            skills.append(t)
    return skills[:25]


# ── Resume Analysis (existing) ───────────────────────
@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    dream_role: str = Form(default=""),
    x_user_gemini_key: Optional[str] = Header(default=None, alias="x-user-gemini-key"),
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

    user_key = x_user_gemini_key or None
    try:
        audit_result = await analyze_resume(resume_text, user_key=user_key)
    except Exception as e:
        raise HTTPException(500, f"Resume analysis failed: {e}")

    extracted_skills = audit_result.get("extracted_skills", [])
    extracted_experience = audit_result.get("extracted_experience", [])

    if not extracted_skills:
        extracted_skills = _fallback_extract_skills(resume_text)
        audit_result["extracted_skills"] = extracted_skills

    # RESUME_AUDITOR_PROMPT already asks the LLM for job_matches derived from the
    # WHOLE resume (skills, projects, experience) — this used to always be
    # overwritten by a keyword match against a static list of only 10 job
    # titles using skills alone, discarding the richer result and returning
    # zero matches for any resume that didn't happen to fit one of those 10.
    # Keep the LLM's own result; only fall back to the keyword matcher if it
    # produced nothing.
    if not audit_result.get("job_matches"):
        audit_result["job_matches"] = await get_top_matches(extracted_skills)

    if dream_role:
        try:
            audit_result["gap_analysis"] = await analyze_gap(extracted_skills, dream_role, extracted_experience, user_key=user_key)
        except Exception:
            audit_result["gap_analysis"] = None
    else:
        audit_result["gap_analysis"] = None

    try:
        market = await get_market_demand(extracted_skills[:10], user_key=user_key)
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
    x_user_gemini_key: Optional[str] = Header(default=None, alias="x-user-gemini-key"),
):
    try:
        skills_list = [s.strip() for s in skill.split(",") if s.strip()] if skill else [dream_role]
        result = await generate_roadmap(skills_list, dream_role, days, user_key=x_user_gemini_key or None)
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
    skills: str = Form(default=""),
    x_user_gemini_key: Optional[str] = Header(default=None, alias="x-user-gemini-key"),
):
    try:
        skills_list = [s.strip() for s in skills.split(",") if s.strip()]
        result = await generate_interview_questions(
            resume_text or "No resume provided", role, skills=skills_list, user_key=x_user_gemini_key or None
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/enhance-bullet")
async def enhance_bullet_endpoint(
    original: str = Form(...),
    role_context: str = Form(default=""),
    x_user_gemini_key: Optional[str] = Header(default=None, alias="x-user-gemini-key"),
):
    try:
        return JSONResponse(content=await enhance_bullet(original, role_context, user_key=x_user_gemini_key or None))
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


@app.post("/edit-resume")
async def edit_resume(file: UploadFile = File(...), edits: str = Form(...)):
    """
    In-place PDF text editing — replaces accepted redline text directly inside
    the original resume PDF (search -> redact -> reinsert), preserving layout.
    Best-effort: returns which edits applied vs. were skipped and why, never
    a broken/corrupted PDF (see services/pdf_editor.py for the full rationale).
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")
    pdf_bytes = await file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large. Max 10 MB.")

    try:
        edit_list = json.loads(edits)
    except Exception:
        raise HTTPException(400, "`edits` must be a JSON array of {original, suggestion}.")
    if not isinstance(edit_list, list) or not edit_list:
        raise HTTPException(400, "`edits` must be a non-empty array.")

    try:
        result = apply_redlines_to_pdf(pdf_bytes, edit_list)
    except PdfEditError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"PDF editing failed: {e}")

    return JSONResponse(content={
        "pdf_base64": base64.b64encode(result["pdf_bytes"]).decode("ascii"),
        "applied": result["applied"],
        "skipped": result["skipped"],
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
