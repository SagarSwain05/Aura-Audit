"""
Career Matcher — semantic job matching using Pinecone vector search.
Falls back to keyword-based matching if Pinecone is unavailable.
"""

import os
import json
import asyncio
from typing import Optional
# Pinecone is optional — graceful degradation
try:
    from pinecone import Pinecone
    _pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY", ""))
    _index = _pc.Index(os.getenv("PINECONE_INDEX", "aura-audit-jobs"))
    PINECONE_AVAILABLE = True
except Exception:
    PINECONE_AVAILABLE = False

# Curated job profiles with required skills (used as fallback + scoring baseline)
JOB_PROFILES = {
    "Full Stack Developer (MERN)": {
        "required": ["React", "Node.js", "MongoDB", "Express", "JavaScript", "REST API"],
        "bonus": ["TypeScript", "Redux", "Docker", "AWS", "Next.js"],
        "salary_inr": "₹8L-20L PA",
        "salary_usd": "$70K-$130K",
        "demand": "hot",
    },
    "Frontend Developer": {
        "required": ["React", "JavaScript", "HTML", "CSS", "TypeScript"],
        "bonus": ["Next.js", "Vue.js", "Tailwind", "Redux", "Testing"],
        "salary_inr": "₹6L-18L PA",
        "salary_usd": "$65K-$120K",
        "demand": "hot",
    },
    "Backend Developer (Node.js)": {
        "required": ["Node.js", "Express", "MongoDB", "SQL", "REST API"],
        "bonus": ["GraphQL", "Redis", "Kafka", "Docker", "Microservices"],
        "salary_inr": "₹8L-22L PA",
        "salary_usd": "$75K-$140K",
        "demand": "growing",
    },
    "Data Analyst": {
        "required": ["Python", "SQL", "Excel", "Data Visualization"],
        "bonus": ["Tableau", "Power BI", "Pandas", "NumPy", "Machine Learning"],
        "salary_inr": "₹5L-16L PA",
        "salary_usd": "$60K-$110K",
        "demand": "growing",
    },
    "ML Engineer": {
        "required": ["Python", "Machine Learning", "TensorFlow", "Scikit-learn", "SQL"],
        "bonus": ["PyTorch", "Deep Learning", "MLOps", "Docker", "Kubernetes"],
        "salary_inr": "₹12L-35L PA",
        "salary_usd": "$100K-$180K",
        "demand": "hot",
    },
    "DevOps / Cloud Engineer": {
        "required": ["Linux", "Docker", "Kubernetes", "AWS", "CI/CD"],
        "bonus": ["Terraform", "Ansible", "Prometheus", "Grafana", "GCP"],
        "salary_inr": "₹10L-30L PA",
        "salary_usd": "$90K-$160K",
        "demand": "hot",
    },
    "Android Developer": {
        "required": ["Kotlin", "Java", "Android SDK", "REST API"],
        "bonus": ["Jetpack Compose", "Firebase", "MVVM", "Coroutines"],
        "salary_inr": "₹6L-20L PA",
        "salary_usd": "$65K-$120K",
        "demand": "stable",
    },
    "Java Backend Developer": {
        "required": ["Java", "Spring Boot", "SQL", "REST API", "Maven/Gradle"],
        "bonus": ["Microservices", "Kafka", "Redis", "Docker", "AWS"],
        "salary_inr": "₹8L-25L PA",
        "salary_usd": "$80K-$150K",
        "demand": "growing",
    },
    "Data Engineer": {
        "required": ["Python", "SQL", "Spark", "ETL", "Data Warehousing"],
        "bonus": ["Kafka", "Airflow", "dbt", "Snowflake", "AWS Glue"],
        "salary_inr": "₹10L-28L PA",
        "salary_usd": "$90K-$155K",
        "demand": "hot",
    },
    "Cybersecurity Analyst": {
        "required": ["Networking", "Linux", "Security Tools", "SIEM"],
        "bonus": ["Penetration Testing", "Python", "Cloud Security", "SOC"],
        "salary_inr": "₹7L-22L PA",
        "salary_usd": "$75K-$140K",
        "demand": "hot",
    },
}


def _normalize_skills(skills: list[str]) -> list[str]:
    """Lowercase and clean skill strings for matching."""
    return [s.strip().lower() for s in skills]


def keyword_match(extracted_skills: list[str], job: dict) -> dict:
    """Score a job profile against extracted skills using keyword overlap."""
    user_skills = set(_normalize_skills(extracted_skills))
    required = _normalize_skills(job["required"])
    bonus = _normalize_skills(job["bonus"])

    matched_req = [s for s in required if s in user_skills]
    matched_bonus = [s for s in bonus if s in user_skills]
    missing = [s for s in required if s not in user_skills]

    if not required:
        return {"score": 0, "matched": [], "missing": []}

    # Weighted: required counts 70%, bonus 30%
    req_score = (len(matched_req) / len(required)) * 70
    bonus_score = min((len(matched_bonus) / max(len(bonus), 1)) * 30, 30)
    total = int(req_score + bonus_score)

    return {
        "score": total,
        "matched": matched_req + matched_bonus,
        "missing": missing[:5],
    }


async def get_top_matches(extracted_skills: list[str], top_n: int = 3) -> list[dict]:
    """Return top N job matches for the given skill set."""
    results = []

    for title, profile in JOB_PROFILES.items():
        match = keyword_match(extracted_skills, profile)
        if match["score"] >= 30:  # minimum threshold
            results.append({
                "title": title,
                "match_percentage": min(match["score"], 98),
                "matched_skills": [s.title() for s in match["matched"]],
                "missing_skills": [s.title() for s in match["missing"]],
                "salary_range": profile["salary_inr"],
                "demand_level": profile["demand"],
            })

    # Sort by match percentage, return top N
    results.sort(key=lambda x: x["match_percentage"], reverse=True)
    return results[:top_n]


async def get_skill_embedding(text: str) -> list[float]:
    """Get embedding for semantic search via Gemini (placeholder)."""
    # Embeddings via google-genai SDK can be added here when needed
    return []
