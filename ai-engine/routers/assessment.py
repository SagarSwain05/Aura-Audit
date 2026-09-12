from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from agents.question_generator import generate_questions
from agents.evaluation_agent import evaluate_assessment
from agents.feedback_agent import generate_feedback

router = APIRouter(prefix="/assessment", tags=["Assessment"])


class GenerateRequest(BaseModel):
    skill: str
    current_level: str = "beginner"
    target_level: str = "intermediate"


class EvaluateRequest(BaseModel):
    questions: list[dict]
    answers: list[dict]
    skill: str
    current_level: str = "beginner"
    target_level: str = "intermediate"


@router.post("/generate")
async def generate(
    req: GenerateRequest,
    x_user_gemini_key: Optional[str] = Header(default=None, alias="x-user-gemini-key"),
):
    try:
        data = await generate_questions(req.skill, req.current_level, req.target_level, user_key=x_user_gemini_key or None)
        return {"success": True, **data}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/evaluate")
async def evaluate(
    req: EvaluateRequest,
    x_user_gemini_key: Optional[str] = Header(default=None, alias="x-user-gemini-key"),
):
    user_key = x_user_gemini_key or None
    try:
        result = await evaluate_assessment(req.questions, req.answers, user_key=user_key)
        # Extract weak areas from results (evaluation_agent now returns camelCase)
        weak = [
            r.get("missedPoints", [r.get("feedback", "")[:40]])
            for r in result.get("results", [])
            if not r.get("isCorrect")
        ]
        flat_weak = [item for sub in weak for item in (sub if isinstance(sub, list) else [sub])][:5]

        feedback = await generate_feedback(
            skill=req.skill,
            current_level=req.current_level,
            target_level=req.target_level,
            evaluation_result=result,
            weak_areas=flat_weak,
            user_key=user_key,
        )
        return {"success": True, "evaluation": result, "feedback": feedback}
    except Exception as e:
        raise HTTPException(500, str(e))
