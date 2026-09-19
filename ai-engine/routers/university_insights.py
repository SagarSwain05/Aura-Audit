"""
AI Cohort Insights — analyzes a university's aggregate placement/readiness
data and produces prioritized, actionable recommendations for the TPO
(which departments need intervention, which skills to run workshops on,
how urgent the at-risk cohort is). Deliberately takes only AGGREGATE
numbers, never individual student PII, since this is cohort-level analysis.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional

from services.llm_client import llm_generate_json

router = APIRouter(tags=["university-insights"])


class DeptStat(BaseModel):
    department: str
    count: int
    avgScore: float
    placed: int


class InsightsRequest(BaseModel):
    universityName: str
    totalStudents: int
    placedStudents: int
    avgScore: float
    atRiskCount: int
    departmentStats: List[DeptStat] = []
    topSkillGaps: List[str] = []


PROMPT_TEMPLATE = """You are an expert career-services advisor analyzing a college placement cell's cohort data.

University: {university_name}
Total students: {total_students}
Placed: {placed_students} ({placement_rate}%)
Average career readiness score: {avg_score}/100
Students currently at risk of remaining unplaced: {at_risk_count}

Department breakdown:
{dept_breakdown}

Most under-represented skills in this cohort (skill gaps):
{skill_gaps}

Based ONLY on this real data, write a concise situation summary (2-3 sentences,
plain and direct, no fluff) and 3-5 specific, prioritized action items the
placement cell should take THIS WEEK. Each action must reference the actual
numbers/departments/skills given above — do not invent data not provided.
Order actions by urgency/impact. Keep each action to one sentence.

Respond ONLY in this exact JSON format:
{{
  "summary": "...",
  "actions": [
    {{"priority": "high", "action": "...", "reason": "..."}},
    {{"priority": "medium", "action": "...", "reason": "..."}}
  ]
}}"""


@router.post("/university/insights")
async def get_university_insights(
    req: InsightsRequest,
    x_user_gemini_key: Optional[str] = Header(default=None, alias="x-user-gemini-key"),
):
    placement_rate = round((req.placedStudents / req.totalStudents) * 100) if req.totalStudents else 0
    dept_breakdown = "\n".join(
        f"- {d.department}: {d.count} students, avg readiness {round(d.avgScore)}%, {d.placed} placed"
        for d in req.departmentStats
    ) or "No department data available."
    skill_gaps = ", ".join(req.topSkillGaps) if req.topSkillGaps else "None identified."

    prompt = PROMPT_TEMPLATE.format(
        university_name=req.universityName,
        total_students=req.totalStudents,
        placed_students=req.placedStudents,
        placement_rate=placement_rate,
        avg_score=round(req.avgScore),
        at_risk_count=req.atRiskCount,
        dept_breakdown=dept_breakdown,
        skill_gaps=skill_gaps,
    )

    try:
        data = await llm_generate_json(prompt, user_key=x_user_gemini_key, category="university")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI engine unavailable: {e}")

    return {
        "summary": data.get("summary", ""),
        "actions": data.get("actions", []),
    }
