"""
Real-Time Job Search Service
Uses SerpApi Google Jobs engine + unified LLM client (Gemini pool → Groq fallback)
for smart query building and match scoring.
"""

import os
import re
import json
import asyncio
from typing import List, Dict, Any, Optional

from services.llm_client import llm_generate, llm_generate_json


def _serpapi_available() -> bool:
    if not os.getenv("SERPAPI_KEY", ""):
        return False
    try:
        from serpapi import GoogleSearch  # noqa
        return True
    except ImportError:
        return False


# ── Query Builder ─────────────────────────────────────────────────────────────

async def _build_search_query(
    skills: List[str],
    dream_role: str,
    experience: List[str],
    user_key: Optional[str] = None,
) -> str:
    # A role the student explicitly typed/selected (or set as their profile's
    # target role) is a direct instruction, not a suggestion for the LLM to
    # improve on. Search it literally — the previous behavior of running it
    # through an LLM that also saw the student's skills let the model
    # substitute a DIFFERENT role whenever skills leaned toward one profile
    # (e.g. a "Mechanical Engineer" search kept coming back as "Full Stack
    # Developer jobs" for a student with software skills), which made every
    # search look identical regardless of what was actually searched for.
    if dream_role and dream_role.strip():
        query = re.sub(r"[^a-zA-Z0-9\s]", "", dream_role).strip()
        if not query.lower().endswith("jobs"):
            query += " jobs"
        return query

    # No explicit role at all (e.g. a bare "recommended for you" pull with no
    # dream role set) — only here does it make sense to infer a role from
    # skills via the LLM.
    skills_str = ", ".join(skills[:10]) if skills else "general"
    exp_str = ", ".join(experience[:3]) if experience else ""
    prompt = f"""You are a career assistant helping a student find jobs.

Student background:
- Skills: {skills_str}
- Experience/Projects: {exp_str}

The student has not set a target role. Infer the single most fitting job
title from their skills/experience and generate a concise Google Jobs search
query (2-4 words): the job title itself plus the word "jobs" — e.g. "Machine
Learning Engineer jobs", "React Developer jobs", "Data Analyst jobs". Do NOT
add experience-level qualifiers like "entry level", "fresher", "intern", or
"junior"/"senior" — Google Jobs search matches far fewer (often zero) results
when a free-text query is narrowed this way.

Respond with ONLY the search query, nothing else."""
    try:
        query = await llm_generate(prompt, user_key=user_key)
        query = re.sub(r"[^a-zA-Z0-9\s]", "", query).strip()
        if not query.lower().endswith("jobs"):
            query += " jobs"
        return query
    except Exception as e:
        print(f"⚠️ Query builder failed: {e}")
        if dream_role:
            return f"{dream_role} jobs"
        if skills:
            return f"{skills[0]} developer jobs"
        return "Software Engineer jobs"


# ── Match Scorer ──────────────────────────────────────────────────────────────

async def _score_job_match(
    skills: List[str],
    dream_role: str,
    job_title: str,
    job_company: str,
    job_description: str,
    user_key: Optional[str] = None,
) -> Dict[str, Any]:
    skills_str = ", ".join(skills[:12]) if skills else "none listed"
    prompt = f"""You are an expert career matcher. Evaluate how well this student matches the job.

Student Profile:
- Skills: {skills_str}
- Target Role: {dream_role or 'any suitable role'}

Job Posting:
- Title: {job_title}
- Company: {job_company}
- Description: {job_description[:400]}

Respond ONLY in this exact JSON format:
{{
    "match_percentage": <integer 0-100>,
    "match_reason": "<one sentence why>",
    "matched_skills": ["skill1", "skill2"],
    "missing_skills": ["skill3", "skill4"]
}}"""
    try:
        data = await llm_generate_json(prompt, user_key=user_key)
        pct = float(data.get("match_percentage", 0) or 0)
        return {
            "match_percentage": round(max(0.0, min(100.0, pct)), 1),
            "match_reason": str(data.get("match_reason", "N/A")),
            "matched_skills": list(data.get("matched_skills", [])),
            "missing_skills": list(data.get("missing_skills", [])),
        }
    except Exception as e:
        print(f"⚠️ Job match scoring failed: {e}")
        return {
            "match_percentage": 0.0,
            "match_reason": "Could not evaluate match.",
            "matched_skills": [],
            "missing_skills": [],
        }


# ── SerpApi Fetcher ───────────────────────────────────────────────────────────

def _fetch_jobs_via_serpapi(query: str, location: str, num_jobs: int) -> List[Dict[str, Any]]:
    try:
        from serpapi import GoogleSearch
    except ImportError:
        print("⚠️ serpapi not installed.")
        return []

    params: Dict[str, Any] = {
        "engine": "google_jobs",
        "q": query,
        "hl": "en",
        "api_key": os.getenv("SERPAPI_KEY", ""),
    }
    location_clean = re.sub(r"[^A-Za-z0-9\s,]", "", (location or "")).strip()
    if location_clean:
        params["location"] = location_clean
        params["q"] = f"{query} in {location_clean}"

    try:
        results = GoogleSearch(params).get_dict()
        jobs_raw = results.get("jobs_results", [])
        if not jobs_raw:
            print(f"⚠️  SerpApi: 0 jobs for '{params['q']}' — {results.get('error', 'no error given')}")
        else:
            print(f"✅ SerpApi: {len(jobs_raw)} jobs for '{params['q']}'")
    except Exception as e:
        print(f"❌ SerpApi failed: {e}")
        return []

    jobs = []
    for j in jobs_raw[:num_jobs]:
        ext = j.get("detected_extensions", {})
        apply_link = (
            j.get("apply_link")
            or ext.get("apply_link")
            or j.get("share_link")
            or j.get("via")
            or ""
        )
        salary = ext.get("salary") or j.get("salary") or ""
        job_type = ext.get("schedule_type", "")

        jobs.append({
            "title": j.get("title", ""),
            "company": j.get("company_name", ""),
            "location": j.get("location", ""),
            "description": (j.get("description") or "")[:500],
            "apply_link": apply_link,
            "salary": salary,
            "job_type": job_type,
            "posted_at": ext.get("posted_at", ""),
            "source": "google_jobs_live",
        })
    return jobs


# ── Main Entry Point ──────────────────────────────────────────────────────────

async def search_live_jobs(
    skills: List[str],
    dream_role: str,
    location: str = "India",
    experience_titles: List[str] = None,
    num_jobs: int = 10,
    score_matches: bool = True,
    user_key: Optional[str] = None,
) -> Dict[str, Any]:
    if not _serpapi_available():
        return {
            "query": "",
            "location": location,
            "total": 0,
            "jobs": [],
            "error": f"SerpApi not available. SERPAPI_KEY set: {bool(os.getenv('SERPAPI_KEY'))}",
        }

    query = await _build_search_query(skills, dream_role, experience_titles or [], user_key)
    print(f"🔍 Live search query: {query}")

    # Google Jobs' free-text matching can return zero results for an
    # otherwise-reasonable query/location combo (empirically confirmed: even
    # a simple, valid combination sometimes comes back empty on the first
    # try). Rather than surface a bare "no jobs found" from one attempt,
    # progressively broaden: same query without location, then a minimal
    # role-only query, before genuinely giving up.
    raw_jobs = await asyncio.to_thread(_fetch_jobs_via_serpapi, query, location, num_jobs)
    used_query, used_location = query, location

    if not raw_jobs and location:
        print("🔄 Zero results with location filter — retrying without it…")
        raw_jobs = await asyncio.to_thread(_fetch_jobs_via_serpapi, query, "", num_jobs)
        used_location = ""

    if not raw_jobs:
        fallback_query = f"{dream_role} jobs" if dream_role else (f"{skills[0]} jobs" if skills else "Software Engineer jobs")
        fallback_query = re.sub(r"[^a-zA-Z0-9\s]", "", fallback_query).strip()
        if fallback_query.lower() != query.lower():
            print(f"🔄 Still zero results — retrying with a simpler query: '{fallback_query}'")
            raw_jobs = await asyncio.to_thread(_fetch_jobs_via_serpapi, fallback_query, location, num_jobs)
            used_query, used_location = fallback_query, location
            if not raw_jobs and location:
                raw_jobs = await asyncio.to_thread(_fetch_jobs_via_serpapi, fallback_query, "", num_jobs)
                used_location = ""

    if not raw_jobs:
        return {"query": used_query, "location": used_location or location, "total": 0, "jobs": []}

    if score_matches:
        sem = asyncio.Semaphore(5)

        async def score_one(job: Dict) -> Dict:
            async with sem:
                scores = await _score_job_match(
                    skills, dream_role,
                    job["title"], job["company"], job["description"],
                    user_key,
                )
                return {**job, **scores}

        scored = await asyncio.gather(*[score_one(j) for j in raw_jobs])
        scored.sort(key=lambda x: x.get("match_percentage", 0), reverse=True)
    else:
        scored = raw_jobs

    return {"query": used_query, "location": used_location, "total": len(scored), "jobs": scored}
