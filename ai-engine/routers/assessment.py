from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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
async def generate(req: GenerateRequest):
    try:
        data = await generate_questions(req.skill, req.current_level, req.target_level)
        return {"success": True, **data}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/evaluate")
async def evaluate(req: EvaluateRequest):
    try:
        result = await evaluate_assessment(req.questions, req.answers)
        # Extract weak areas from results
        weak = [
            r.get("missed_points", [r.get("feedback", "")[:40]])
            for r in result.get("results", [])
            if not r.get("is_correct")
        ]
        flat_weak = [item for sub in weak for item in (sub if isinstance(sub, list) else [sub])][:5]

        feedback = await generate_feedback(
            skill=req.skill,
            current_level=req.current_level,
            target_level=req.target_level,
            evaluation_result=result,
            weak_areas=flat_weak,
        )
        return {"success": True, "evaluation": result, "feedback": feedback}
    except Exception as e:
        raise HTTPException(500, str(e))
