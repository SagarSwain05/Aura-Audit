"""
AI Assessment Question Generator Agent.
Uses unified llm_client (Gemini pool → Groq fallback).
"""

import json, re, asyncio
from services.llm_client import llm_generate_json

PROMPT_TEMPLATE = """You are an expert technical interviewer and educator.
Generate EXACTLY 10 assessment questions for the skill: "{skill}"
Current level: {current_level} → Target level: {target_level}

Question distribution (STRICT):
- 3 MCQ (10 pts each = 30 pts)
- 2 Coding challenges (15 pts each = 30 pts)
- 2 True/False (5 pts each = 10 pts)
- 3 Short Answer (10 pts each = 30 pts)
Total: 100 pts

Rules:
- Questions must be PRACTICAL and test real-world understanding
- Coding questions must include test cases
- MCQ must have exactly 4 options (A/B/C/D)
- Include explanation for every correct answer
- Scale difficulty from {current_level} to {target_level}

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "id": 1,
      "type": "mcq",
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "explanation": "...",
      "points": 10
    }},
    {{
      "id": 2,
      "type": "code",
      "question": "Write a function that...",
      "starter_code": "def solve(input): # your code here",
      "test_cases": [{{"input": "...", "output": "..."}}],
      "explanation": "...",
      "points": 15
    }},
    {{
      "id": 3,
      "type": "true_false",
      "question": "...",
      "correct_answer": "true",
      "explanation": "...",
      "points": 5
    }},
    {{
      "id": 4,
      "type": "short_answer",
      "question": "...",
      "model_answer": "...",
      "key_points": ["point1", "point2"],
      "explanation": "...",
      "points": 10
    }}
  ],
  "total_points": 100,
  "skill": "{skill}",
  "target_level": "{target_level}"
}}"""


async def generate_questions(skill: str, current_level: str, target_level: str) -> dict:
    prompt = PROMPT_TEMPLATE.format(
        skill=skill, current_level=current_level, target_level=target_level
    )
    data = await llm_generate_json(prompt)
    questions = data.get("questions", [])[:10]
    for i, q in enumerate(questions):
        q["id"] = i + 1
    data["questions"] = questions
    data["total_points"] = sum(q.get("points", 10) for q in questions)
    return data
