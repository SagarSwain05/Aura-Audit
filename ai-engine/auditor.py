"""
Core auditor — orchestrates LLM calls for resume analysis, gap analysis,
market demand pulse, and interview simulation.
Uses unified llm_client (Gemini key pool → Groq fallback).
"""

from prompts import (
    RESUME_AUDITOR_PROMPT,
    GAP_ANALYSIS_PROMPT,
    ROADMAP_PROMPT,
    INTERVIEW_SIM_PROMPT,
    MARKET_DEMAND_PROMPT,
)
from services.llm_client import llm_generate_json


async def analyze_resume(resume_text: str) -> dict:
    prompt = f"{RESUME_AUDITOR_PROMPT}\n\nRESUME TEXT:\n{resume_text}"
    return await llm_generate_json(prompt)


async def analyze_gap(current_skills: list, dream_role: str, experience: list) -> dict:
    prompt = GAP_ANALYSIS_PROMPT.format(
        current_skills=", ".join(current_skills),
        dream_role=dream_role,
        experience="\n".join(experience),
    )
    return await llm_generate_json(prompt)


async def generate_roadmap(skills: list, dream_role: str, days: int = 30) -> dict:
    prompt = ROADMAP_PROMPT.format(
        skills=", ".join(skills),
        dream_role=dream_role,
        days=days,
    )
    return await llm_generate_json(prompt)


async def generate_interview_questions(resume_text: str, role: str) -> dict:
    prompt = INTERVIEW_SIM_PROMPT.format(role=role, resume_text=resume_text[:3000])
    return await llm_generate_json(prompt)


async def get_market_demand(skills: list) -> dict:
    prompt = MARKET_DEMAND_PROMPT.format(skills=", ".join(skills))
    return await llm_generate_json(prompt)


async def enhance_bullet(original: str, role_context: str = "") -> dict:
    prompt = f"""Transform this weak resume bullet into a powerful, quantified achievement.
Role context: {role_context or "Software Engineering"}
Original: "{original}"

Return JSON: {{
  "enhanced": "the improved bullet point",
  "reasoning": "why this is better"
}}
Use strong action verbs, add implied metrics if reasonable, show impact."""
    return await llm_generate_json(prompt)
