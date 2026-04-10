"""
AI Evaluation Agent — grades submitted assessment answers.
MCQ/True-False: exact match. Short Answer + Code: LLM semantic grading.
Uses unified llm_client (Gemini pool → Groq fallback).
"""

import json, asyncio
from services.llm_client import llm_generate_json

PASS_THRESHOLD = 70  # %


def _extract_mcq_letter(answer: str) -> str:
    """
    Normalize MCQ answer to a single letter (A/B/C/D).
    Handles:
      - "A"         → "A"
      - "A) Python…" → "A"
      - "A. Python…" → "A"
      - "a"          → "A"
      - Full option text with no letter prefix → left as-is (LLM will handle)
    """
    s = str(answer or "").strip().upper()
    if not s:
        return s
    # "A)" or "A." or "A " prefix
    if len(s) >= 2 and s[0] in "ABCD" and s[1] in ") . ":
        return s[0]
    # Just the letter
    if len(s) == 1 and s in "ABCD":
        return s
    return s


def _evaluate_mcq(question: dict, answer: str) -> dict:
    correct = _extract_mcq_letter(str(question.get("correct_answer", "")))
    given   = _extract_mcq_letter(str(answer or ""))

    is_correct = bool(given and given == correct)
    score = question.get("points", 10) if is_correct else 0

    return {
        "questionId":     str(question["id"]),
        "score":          score,
        "maxScore":       question.get("points", 10),
        "isCorrect":      is_correct,
        "studentAnswer":  answer,
        "correctAnswer":  question.get("correct_answer", ""),
        "feedback":       question.get("explanation", ""),
        "type":           "mcq",
    }


def _evaluate_true_false(question: dict, answer: str) -> dict:
    correct = str(question.get("correct_answer", "")).strip().lower()
    given   = str(answer or "").strip().lower()
    # Normalize "true"/"false" variants
    if given in ("yes", "1", "t"):  given = "true"
    if given in ("no",  "0", "f"):  given = "false"

    is_correct = bool(given and given == correct)
    score = question.get("points", 5) if is_correct else 0

    return {
        "questionId":    str(question["id"]),
        "score":         score,
        "maxScore":      question.get("points", 5),
        "isCorrect":     is_correct,
        "studentAnswer": answer,
        "correctAnswer": question.get("correct_answer", ""),
        "feedback":      question.get("explanation", ""),
        "type":          "true_false",
    }


async def _evaluate_short_answer(question: dict, answer: str) -> dict:
    if not answer or len(answer.strip()) < 5:
        return {
            "questionId":    str(question["id"]),
            "score":         0,
            "maxScore":      question.get("points", 10),
            "isCorrect":     False,
            "studentAnswer": answer,
            "correctAnswer": question.get("model_answer", ""),
            "feedback":      "No answer provided.",
            "type":          "short_answer",
        }

    prompt = f"""Evaluate this student's short answer strictly and fairly.

Question: {question['question']}
Model Answer: {question.get('model_answer', 'N/A')}
Key Points to Cover: {question.get('key_points', [])}
Student's Answer: {answer}
Max Points: {question.get('points', 10)}

Return JSON only:
{{
  "score": <integer 0 to {question.get('points', 10)}>,
  "isCorrect": <true if score >= 60% of max>,
  "feedback": "<one concise sentence of constructive feedback>",
  "correctAnswer": "<brief ideal answer in 1-2 sentences>",
  "missedPoints": ["<key point missed 1>", "<key point missed 2>"]
}}"""

    try:
        result = await llm_generate_json(prompt)
        return {
            "questionId":    str(question["id"]),
            "score":         min(int(result.get("score", 0)), question.get("points", 10)),
            "maxScore":      question.get("points", 10),
            "isCorrect":     result.get("isCorrect", result.get("is_correct", False)),
            "studentAnswer": answer,
            "correctAnswer": result.get("correctAnswer") or question.get("model_answer", ""),
            "feedback":      result.get("feedback", ""),
            "missedPoints":  result.get("missedPoints", result.get("missed_points", [])),
            "type":          "short_answer",
        }
    except Exception:
        return {
            "questionId":    str(question["id"]),
            "score":         0,
            "maxScore":      question.get("points", 10),
            "isCorrect":     False,
            "studentAnswer": answer,
            "correctAnswer": question.get("model_answer", ""),
            "feedback":      "Could not evaluate answer automatically.",
            "type":          "short_answer",
        }


async def _evaluate_code(question: dict, answer: str) -> dict:
    if not answer or len(answer.strip()) < 5:
        return {
            "questionId":    str(question["id"]),
            "score":         0,
            "maxScore":      question.get("points", 15),
            "isCorrect":     False,
            "studentAnswer": answer,
            "correctAnswer": "A correct implementation was expected.",
            "feedback":      "No code submitted.",
            "type":          "code",
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

Return JSON only:
{{
  "score": <integer 0 to {question.get('points', 15)}>,
  "isCorrect": <true if score >= 70% of max>,
  "feedback": "<concise technical feedback: what works, what's wrong>",
  "correctAnswer": "<brief description of the correct approach>",
  "testCasesPassed": <number>,
  "testCasesTotal": {len(test_cases)},
  "issues": ["<issue 1>", "<issue 2>"]
}}"""

    try:
        result = await llm_generate_json(prompt)
        return {
            "questionId":       str(question["id"]),
            "score":            min(int(result.get("score", 0)), question.get("points", 15)),
            "maxScore":         question.get("points", 15),
            "isCorrect":        result.get("isCorrect", result.get("is_correct", False)),
            "studentAnswer":    answer,
            "correctAnswer":    result.get("correctAnswer", "See feedback"),
            "feedback":         result.get("feedback", ""),
            "testCasesPassed":  result.get("testCasesPassed", result.get("test_cases_passed", 0)),
            "issues":           result.get("issues", []),
            "type":             "code",
        }
    except Exception:
        return {
            "questionId":    str(question["id"]),
            "score":         0,
            "maxScore":      question.get("points", 15),
            "isCorrect":     False,
            "studentAnswer": answer,
            "correctAnswer": "",
            "feedback":      "Could not evaluate code automatically.",
            "type":          "code",
        }


async def evaluate_assessment(questions: list, answers: list) -> dict:
    # Build answer map: question_id (as string) → answer text
    answer_map = {str(a.get("question_id", a.get("questionId", ""))): a.get("answer", "") for a in answers}

    tasks = []
    for q in questions:
        qid = str(q.get("id", q.get("questionId", "")))
        ans = answer_map.get(qid, "")
        qtype = q.get("type", "mcq")
        if qtype == "mcq":
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

    total_score  = sum(r["score"] for r in results)
    total_points = sum(r["maxScore"] for r in results)
    percentage   = round((total_score / max(total_points, 1)) * 100, 1)

    return {
        "totalScore":     total_score,
        "totalPoints":    total_points,
        "percentage":     percentage,
        "passed":         percentage >= PASS_THRESHOLD,
        "passThreshold":  PASS_THRESHOLD,
        "results":        list(results),
        "correctCount":   sum(1 for r in results if r.get("isCorrect")),
        "totalQuestions": len(results),
    }
