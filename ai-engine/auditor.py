"""
Core auditor — orchestrates LLM calls for resume analysis, gap analysis,
market demand pulse, and interview simulation.
Uses unified llm_client (Gemini key pool → Groq fallback).
"""

import hashlib
from prompts import (
    RESUME_AUDITOR_PROMPT,
    GAP_ANALYSIS_PROMPT,
    ROADMAP_PROMPT,
    INTERVIEW_SIM_PROMPT,
    MARKET_DEMAND_PROMPT,
)
from services.llm_client import llm_generate_json
from services.cache import get_or_compute

# Roadmaps and market-demand data don't meaningfully change minute to minute
# and many different users ask about the same common role/skill combos —
# caching these (platform-pool calls only, not personal-key calls) cuts real
# LLM call volume under load without affecting personalized results like
# resume analysis or interview questions, which always call live.
_CACHE_TTL_SECONDS = 6 * 3600


def _cache_key(*parts) -> str:
    raw = "|".join(str(p) for p in parts)
    return hashlib.sha256(raw.encode()).hexdigest()


async def analyze_resume(resume_text: str, user_key: str = None) -> dict:
    prompt = f"{RESUME_AUDITOR_PROMPT}\n\nRESUME TEXT:\n{resume_text}"
    return await llm_generate_json(prompt, user_key=user_key, category="audit")


async def analyze_gap(current_skills: list, dream_role: str, experience: list, user_key: str = None) -> dict:
    prompt = GAP_ANALYSIS_PROMPT.format(
        current_skills=", ".join(current_skills),
        dream_role=dream_role,
        experience="\n".join(experience),
    )
    return await llm_generate_json(prompt, user_key=user_key, category="gap")


async def generate_roadmap(skills: list, dream_role: str, days: int = 30, user_key: str = None) -> dict:
    prompt = ROADMAP_PROMPT.format(
        skills=", ".join(skills),
        dream_role=dream_role,
        days=days,
    )
    if user_key:
        return await llm_generate_json(prompt, user_key=user_key, category="roadmap")
    key = _cache_key("roadmap", sorted(s.lower() for s in skills), dream_role.lower(), days)
    return await get_or_compute(key, _CACHE_TTL_SECONDS, lambda: llm_generate_json(prompt, category="roadmap"))


async def generate_interview_questions(resume_text: str, role: str, skills: list = None, user_key: str = None) -> dict:
    skills_str = ", ".join(skills) if skills else "not specified"
    prompt = INTERVIEW_SIM_PROMPT.format(role=role, skills=skills_str, resume_text=resume_text[:3000])
    return await llm_generate_json(prompt, user_key=user_key, category="interview")


async def get_market_demand(skills: list, user_key: str = None) -> dict:
    prompt = MARKET_DEMAND_PROMPT.format(skills=", ".join(skills))
    if user_key:
        return await llm_generate_json(prompt, user_key=user_key, category="market")
    key = _cache_key("market_demand", sorted(s.lower() for s in skills))
    return await get_or_compute(key, _CACHE_TTL_SECONDS, lambda: llm_generate_json(prompt, category="market"))


async def enhance_bullet(original: str, role_context: str = "", user_key: str = None) -> dict:
    prompt = f"""Transform this weak resume bullet into a powerful, quantified achievement.
Role context: {role_context or "Software Engineering"}
Original: "{original}"

Return JSON: {{
  "enhanced": "the improved bullet point",
  "reasoning": "why this is better"
}}
Use strong action verbs, add implied metrics if reasonable, show impact."""
    return await llm_generate_json(prompt, user_key=user_key, category="bullet")
