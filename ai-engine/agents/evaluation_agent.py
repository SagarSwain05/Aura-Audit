"""
AI Evaluation Agent — grades submitted assessment answers.
MCQ/True-False: exact match. Short Answer + Code: LLM semantic grading.
Uses unified llm_client (Gemini pool → Groq fallback).
"""

import json, asyncio
from services.llm_client import llm_generate_json

PASS_THRESHOLD = 70  # %


def _evaluate_mcq(question: dict, answer: str) -> dict:
    correct = str(question.get("correct_answer", "")).strip().upper()
    given = str(answer or "").strip().upper()
    # Match full answer or first char (A/B/C/D)
    is_correct = given == correct or (len(correct) > 1 and given == correct[0])
    score = question.get("points", 10) if is_correct else 0
    return {
        "question_id": question["id"],
        "score": score,
        "max_score": question.get("points", 10),
        "is_correct": is_correct,
        "student_answer": answer,
        "correct_answer": question.get("correct_answer"),
        "feedback": question.get("explanation", ""),
    }


def _evaluate_true_false(question: dict, answer: str) -> dict:
    correct = str(question.get("correct_answer", "")).strip().lower()
    given = str(answer or "").strip().lower()
    is_correct = given == correct
    score = question.get("points", 5) if is_correct else 0
    return {
        "question_id": question["id"],
        "score": score,
        "max_score": question.get("points", 5),
        "is_correct": is_correct,
        "student_answer": answer,
        "correct_answer": question.get("correct_answer"),
        "feedback": question.get("explanation", ""),
    }


async def _evaluate_short_answer(question: dict, answer: str) -> dict:
    if not answer or len(answer.strip()) < 5:
        return {
            "question_id": question["id"],
            "score": 0,
            "max_score": question.get("points", 10),
            "is_correct": False,
            "student_answer": answer,
            "correct_answer": question.get("model_answer", ""),
            "feedback": "No answer provided.",
        }

    prompt = f"""Evaluate this student's short answer strictly and fairly.

Question: {question['question']}
Model Answer: {question.get('model_answer', 'N/A')}
Key Points to Cover: {question.get('key_points', [])}
Student's Answer: {answer}
Max Points: {question.get('points', 10)}

Return JSON:
{{
  "score": <integer 0 to {question.get('points', 10)}>,
  "is_correct": <true if score >= 60% of max>,
  "feedback": "<one sentence of constructive feedback>",
  "missed_points": ["<key point missed>"]
}}"""

    try:
        result = await llm_generate_json(prompt)
        return {
            "question_id": question["id"],
            "score": min(int(result.get("score", 0)), question.get("points", 10)),
            "max_score": question.get("points", 10),
            "is_correct": result.get("is_correct", False),
            "student_answer": answer,
            "correct_answer": question.get("model_answer", ""),
            "feedback": result.get("feedback", ""),
            "missed_points": result.get("missed_points", []),
        }
    except Exception:
        return {
            "question_id": question["id"],
            "score": 0,
            "max_score": question.get("points", 10),
            "is_correct": False,
            "student_answer": answer,
            "correct_answer": question.get("model_answer", ""),
            "feedback": "Could not evaluate answer.",
        }


async def _evaluate_code(question: dict, answer: str) -> dict:
    if not answer or len(answer.strip()) < 5:
        return {
            "question_id": question["id"],
            "score": 0,
            "max_score": question.get("points", 15),
            "is_correct": False,
            "student_answer": answer,
            "correct_answer": "Correct implementation varies",
            "feedback": "No code submitted.",
        }

    test_cases = question.get("test_cases", [])
    prompt = f"""Evaluate this code submission. Check logic, correctness, and test case coverage.

Question: {question['question']}
Test Cases: {json.dumps(test_cases)}
Student Code:
```
{answer}
```
Max Points: {question.get('points', 15)}

Return JSON:
{{
  "score": <integer 0 to {question.get('points', 15)}>,
  "is_correct": <true if score >= 70% of max>,
  "feedback": "<concise technical feedback>",
  "test_cases_passed": <number>,
  "test_cases_total": {len(test_cases)},
  "issues": ["<issue 1>"]
}}"""

    try:
        result = await llm_generate_json(prompt)
        return {
            "question_id": question["id"],
            "score": min(int(result.get("score", 0)), question.get("points", 15)),
            "max_score": question.get("points", 15),
            "is_correct": result.get("is_correct", False),
            "student_answer": answer,
            "correct_answer": "See feedback",
            "feedback": result.get("feedback", ""),
            "test_cases_passed": result.get("test_cases_passed", 0),
            "issues": result.get("issues", []),
        }
    except Exception:
        return {
            "question_id": question["id"],
            "score": 0,
            "max_score": question.get("points", 15),
            "is_correct": False,
            "student_answer": answer,
            "correct_answer": "",
            "feedback": "Could not evaluate code.",
        }


async def evaluate_assessment(questions: list, answers: list) -> dict:
    answer_map = {str(a["question_id"]): a.get("answer", "") for a in answers}

    tasks = []
    for q in questions:
        qid = str(q["id"])
        ans = answer_map.get(qid, "")
        qtype = q.get("type", "mcq")
        if qtype == "mcq":
            # Run sync function in thread pool to avoid blocking
            tasks.append(asyncio.get_event_loop().run_in_executor(None, _evaluate_mcq, q, ans))
        elif qtype == "true_false":
            tasks.append(asyncio.get_event_loop().run_in_executor(None, _evaluate_true_false, q, ans))
        elif qtype in ("short_answer", "essay"):
            tasks.append(_evaluate_short_answer(q, ans))
        elif qtype in ("code", "coding"):
            tasks.append(_evaluate_code(q, ans))
        else:
            tasks.append(_evaluate_short_answer(q, ans))

    results = await asyncio.gather(*tasks)

    total_score = sum(r["score"] for r in results)
    total_points = sum(r["max_score"] for r in results)
    percentage = round((total_score / max(total_points, 1)) * 100, 1)

    return {
        "total_score": total_score,
        "total_points": total_points,
        "percentage": percentage,
        "passed": percentage >= PASS_THRESHOLD,
        "pass_threshold": PASS_THRESHOLD,
        "results": list(results),
        "correct_count": sum(1 for r in results if r.get("is_correct")),
        "total_questions": len(results),
    }
