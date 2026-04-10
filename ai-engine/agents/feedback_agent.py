"""
AI Feedback Agent — generates personalized learning feedback post-assessment.
Uses unified llm_client (Gemini pool → Groq fallback).
"""

from services.llm_client import llm_generate_json

FEEDBACK_PROMPT = """You are a caring, expert career mentor. Generate personalized, actionable feedback
for a student who just completed a technical assessment.

Skill: {skill}
Level progression: {current_level} → {target_level}
Score: {score}% ({total_score}/{total_points} points)
Passed: {passed}
Questions correct: {correct}/{total}
Weak areas: {weak_areas}

Return ONLY valid JSON:
{{
  "personalizedMessage": "<2-3 sentences warm and specific>",
  "strengths": ["strength1", "strength2", "strength3"],
  "areasForImprovement": ["area1", "area2"],
  "recommendations": [
    {{"topic": "...", "resource_type": "video|article|project|course", "description": "...", "priority": "high|medium|low"}}
  ],
  "nextSteps": ["step1", "step2", "step3"],
  "estimatedReadinessDays": 30,
  "motivationalQuote": "<relevant short quote>"
}}"""


async def generate_feedback(skill, current_level, target_level, evaluation_result, weak_areas=None):
    if weak_areas is None:
        weak_areas = []
    prompt = FEEDBACK_PROMPT.format(
        skill=skill, current_level=current_level, target_level=target_level,
        score=evaluation_result.get("percentage", 0),
        total_score=evaluation_result.get("totalScore", evaluation_result.get("total_score", 0)),
        total_points=evaluation_result.get("totalPoints", evaluation_result.get("total_points", 100)),
        passed=evaluation_result.get("passed", False),
        correct=evaluation_result.get("correctCount", evaluation_result.get("correct_count", 0)),
        total=evaluation_result.get("totalQuestions", evaluation_result.get("total_questions", 10)),
        weak_areas=weak_areas or ["general improvement needed"],
    )
    try:
        result = await llm_generate_json(prompt)
        # Normalize: support both camelCase and snake_case from LLM
        return {
            "personalizedMessage": result.get("personalizedMessage") or result.get("personalized_message", ""),
            "strengths": result.get("strengths", []),
            "areasForImprovement": result.get("areasForImprovement") or result.get("areas_for_improvement", []),
            "recommendations": result.get("recommendations", []),
            "nextSteps": result.get("nextSteps") or result.get("next_steps", []),
            "estimatedReadinessDays": result.get("estimatedReadinessDays") or result.get("estimated_readiness_days", 30),
            "motivationalQuote": result.get("motivationalQuote") or result.get("motivational_quote", ""),
        }
    except Exception:
        return {
            "personalizedMessage": f"You scored {evaluation_result.get('percentage', 0)}% on {skill}. Keep practicing!",
            "strengths": ["Attempted all questions", "Shows initiative"],
            "areasForImprovement": weak_areas or ["Practice more problems"],
            "recommendations": [{"topic": skill, "resource_type": "video", "description": f"Watch tutorials on {skill}", "priority": "high"}],
            "nextSteps": [f"Review {skill} fundamentals", "Practice on LeetCode", "Build a small project"],
            "estimatedReadinessDays": 30,
            "motivationalQuote": "Every expert was once a beginner.",
        }
