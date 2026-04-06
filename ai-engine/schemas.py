from pydantic import BaseModel, Field
from typing import Optional


class ResumeAnalysisRequest(BaseModel):
    resume_text: str
    dream_role: Optional[str] = None
    user_id: str


class RedlineItem(BaseModel):
    original: str
    suggestion: str
    reason: str
    category: str  # "action_verb" | "quantification" | "keyword" | "impact"
    severity: str  # "critical" | "warning" | "improvement"
    line_index: int


class AuraScoreBreakdown(BaseModel):
    technical_density: int       # 0-100
    impact_quotient: int         # 0-100
    formatting_health: int       # 0-100
    ats_compatibility: int       # 0-100
    overall: int                 # weighted average


class JobMatch(BaseModel):
    title: str
    match_percentage: int
    matched_skills: list[str]
    missing_skills: list[str]
    salary_range: str
    demand_level: str  # "hot" | "growing" | "stable"


class SkillGap(BaseModel):
    skill: str
    importance: str   # "critical" | "high" | "medium"
    category: str     # "technical" | "tools" | "soft"
    transferable_from: Optional[str] = None  # e.g. "Your React → React Native"


class GapAnalysis(BaseModel):
    dream_role: str
    readiness_score: int
    gaps: list[SkillGap]
    strengths: list[str]
    transferable_skills: list[str]


class LearningResource(BaseModel):
    title: str
    url: str
    platform: str   # "youtube" | "coursera" | "docs" | "project"
    duration: str
    thumbnail: Optional[str] = None
    type: str       # "video" | "course" | "article" | "project_idea"


class RoadmapDay(BaseModel):
    day: int
    topic: str
    goal: str
    resources: list[LearningResource]
    project_idea: Optional[str] = None


class LearningRoadmap(BaseModel):
    skill: str
    total_days: int
    days: list[RoadmapDay]


class InterviewQuestion(BaseModel):
    question: str
    category: str    # "technical" | "behavioral" | "project"
    difficulty: str  # "easy" | "medium" | "hard"
    hint: str


class ResumeAnalysisResponse(BaseModel):
    user_id: str
    aura_score: AuraScoreBreakdown
    redlines: list[RedlineItem]
    job_matches: list[JobMatch]
    gap_analysis: Optional[GapAnalysis] = None
    extracted_skills: list[str]
    extracted_experience: list[str]
    interview_questions: list[InterviewQuestion]
    market_demand: dict  # skill -> demand %


class RoadmapRequest(BaseModel):
    skills: list[str]
    dream_role: str
    days: int = 30


class InterviewSimRequest(BaseModel):
    resume_text: str
    role: str
