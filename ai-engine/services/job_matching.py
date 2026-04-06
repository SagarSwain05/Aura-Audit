"""
Hybrid job-matching engine.
Combines semantic (ChromaDB cosine similarity) + keyword overlap + metadata scoring.
"""

import re
from typing import Optional
from .embeddings import generate_embedding, prepare_student_text, prepare_job_text
from .vector_store import search_jobs, index_job


# ── Career domain knowledge base ──────────────────────────────────────────────
CAREER_DOMAINS = {
    "Full Stack Developer": {
        "required": ["JavaScript", "React", "Node.js", "MongoDB", "Express", "HTML", "CSS"],
        "bonus": ["TypeScript", "Next.js", "Redux", "Docker", "AWS", "GraphQL"],
        "trendScore": 92, "hiringGrowth": "+25% YoY",
        "topCompanies": ["Google", "Amazon", "Microsoft", "Meta", "Flipkart"],
        "emerging": ["Next.js 15", "TypeScript", "tRPC"],
        "avgPackage": "₹8L–22L", "futureProof": 88,
        "description": "Build complete web applications — front to back.",
    },
    "Frontend Developer": {
        "required": ["React", "JavaScript", "HTML", "CSS", "TypeScript"],
        "bonus": ["Next.js", "Vue.js", "Tailwind", "Redux", "Figma"],
        "trendScore": 88, "hiringGrowth": "+20% YoY",
        "topCompanies": ["Swiggy", "Zomato", "Razorpay", "CRED", "Atlassian"],
        "emerging": ["React Server Components", "Framer Motion", "Astro"],
        "avgPackage": "₹7L–18L", "futureProof": 82,
        "description": "Craft pixel-perfect, performant user interfaces.",
    },
    "Backend Developer (Node.js)": {
        "required": ["Node.js", "Express", "MongoDB", "REST API", "SQL"],
        "bonus": ["GraphQL", "Redis", "Kafka", "Docker", "Microservices"],
        "trendScore": 85, "hiringGrowth": "+22% YoY",
        "topCompanies": ["PayU", "PhonePe", "Paytm", "TCS", "Infosys"],
        "emerging": ["Bun.js", "Hono", "tRPC"],
        "avgPackage": "₹8L–20L", "futureProof": 84,
        "description": "Design scalable APIs and backend services.",
    },
    "Data Scientist": {
        "required": ["Python", "Machine Learning", "Statistics", "SQL", "Pandas", "NumPy"],
        "bonus": ["TensorFlow", "PyTorch", "Tableau", "Spark", "Deep Learning"],
        "trendScore": 95, "hiringGrowth": "+35% YoY",
        "topCompanies": ["Google", "Microsoft", "Amazon", "Tiger Analytics", "Mu Sigma"],
        "emerging": ["LLM fine-tuning", "MLOps", "AutoML"],
        "avgPackage": "₹10L–30L", "futureProof": 95,
        "description": "Extract actionable insights from complex datasets.",
    },
    "ML Engineer": {
        "required": ["Python", "TensorFlow", "Scikit-learn", "SQL", "Machine Learning"],
        "bonus": ["PyTorch", "MLflow", "Docker", "Kubernetes", "Airflow"],
        "trendScore": 96, "hiringGrowth": "+40% YoY",
        "topCompanies": ["Google", "Meta", "OpenAI", "Nvidia", "Anthropic"],
        "emerging": ["LLMOps", "RLHF", "RAG pipelines"],
        "avgPackage": "₹15L–40L", "futureProof": 97,
        "description": "Build and deploy production-grade ML models.",
    },
    "DevOps / Cloud Engineer": {
        "required": ["Linux", "Docker", "Kubernetes", "AWS", "CI/CD"],
        "bonus": ["Terraform", "Ansible", "Prometheus", "Grafana", "GCP"],
        "trendScore": 91, "hiringGrowth": "+30% YoY",
        "topCompanies": ["Amazon", "Microsoft", "IBM", "Wipro", "HCL"],
        "emerging": ["Platform Engineering", "FinOps", "GitOps"],
        "avgPackage": "₹10L–28L", "futureProof": 92,
        "description": "Automate infrastructure and enable continuous delivery.",
    },
    "Data Engineer": {
        "required": ["Python", "SQL", "Spark", "ETL", "Data Warehousing"],
        "bonus": ["Kafka", "Airflow", "dbt", "Snowflake", "AWS Glue"],
        "trendScore": 90, "hiringGrowth": "+32% YoY",
        "topCompanies": ["Flipkart", "Ola", "Uber", "Freshworks", "Dunzo"],
        "emerging": ["Apache Iceberg", "dbt Cloud", "Databricks"],
        "avgPackage": "₹10L–26L", "futureProof": 91,
        "description": "Design reliable data pipelines and warehouses.",
    },
    "Android Developer": {
        "required": ["Kotlin", "Java", "Android SDK", "REST API", "MVVM"],
        "bonus": ["Jetpack Compose", "Firebase", "Coroutines", "Dagger/Hilt"],
        "trendScore": 80, "hiringGrowth": "+15% YoY",
        "topCompanies": ["Samsung", "Ola", "Paytm", "Dream11", "ShareChat"],
        "emerging": ["Compose Multiplatform", "KMP", "CameraX"],
        "avgPackage": "₹7L–18L", "futureProof": 78,
        "description": "Build native Android apps used by millions.",
    },
    "Cybersecurity Analyst": {
        "required": ["Networking", "Linux", "Security Tools", "SIEM", "Python"],
        "bonus": ["Penetration Testing", "Cloud Security", "OWASP", "SOC"],
        "trendScore": 93, "hiringGrowth": "+38% YoY",
        "topCompanies": ["Palo Alto", "CrowdStrike", "KPMG", "Deloitte", "Wipro"],
        "emerging": ["AI-driven threat detection", "Zero Trust", "SASE"],
        "avgPackage": "₹8L–22L", "futureProof": 93,
        "description": "Protect systems from modern cyber threats.",
    },
    "Java Backend Developer": {
        "required": ["Java", "Spring Boot", "SQL", "REST API", "Maven"],
        "bonus": ["Microservices", "Kafka", "Redis", "Docker", "AWS"],
        "trendScore": 83, "hiringGrowth": "+18% YoY",
        "topCompanies": ["TCS", "Infosys", "Wipro", "Capgemini", "JP Morgan"],
        "emerging": ["GraalVM", "Quarkus", "Project Loom"],
        "avgPackage": "₹7L–22L", "futureProof": 80,
        "description": "Build enterprise-grade Java microservices.",
    },
}


def _skill_match_score(student_skills: list[str], required: list[str], bonus: list[str]) -> dict:
    """Keyword-based skill overlap scoring."""
    student_lower = {s.lower() for s in student_skills}
    req_lower = [r.lower() for r in required]
    bon_lower = [b.lower() for b in bonus]

    matched_req = [r for r in req_lower if r in student_lower]
    matched_bon = [b for b in bon_lower if b in student_lower]
    missing = [r for r in required if r.lower() not in student_lower]

    req_score = (len(matched_req) / max(len(req_lower), 1)) * 70
    bon_score = min((len(matched_bon) / max(len(bon_lower), 1)) * 30, 30)

    return {
        "score": min(int(req_score + bon_score), 100),
        "matched": [s.title() for s in matched_req + matched_bon],
        "missing": missing[:6],
    }


def recommend_careers(student_skills: list[dict], cgpa: float = 0.0, top_n: int = 3) -> list[dict]:
    """
    Pure career-domain recommendation (no jobs needed).
    Returns top N career paths with readiness scores, gaps, and roadmap hints.
    """
    skill_names = [s.get("name", "") for s in student_skills]
    results = []

    for domain, profile in CAREER_DOMAINS.items():
        km = _skill_match_score(skill_names, profile["required"], profile["bonus"])

        # CGPA bonus (max 5 pts)
        cgpa_bonus = min((cgpa / 10) * 5, 5) if cgpa else 0
        final_score = min(int(km["score"] + cgpa_bonus), 100)

        readiness = (
            "excellent" if final_score >= 80 else
            "good" if final_score >= 60 else
            "fair" if final_score >= 40 else
            "needs_work"
        )

        results.append({
            "domain": domain,
            "readiness_score": final_score,
            "readiness_label": readiness,
            "matched_skills": km["matched"],
            "missing_skills": km["missing"],
            "trend_score": profile["trendScore"],
            "hiring_growth": profile["hiringGrowth"],
            "top_companies": profile["topCompanies"],
            "emerging_tech": profile["emerging"],
            "avg_package": profile["avgPackage"],
            "future_proof": profile["futureProof"],
            "description": profile["description"],
        })

    results.sort(key=lambda x: (x["readiness_score"], x["trend_score"]), reverse=True)
    return results[:top_n]


async def match_jobs_for_student(
    student_skills: list[dict],
    cgpa: float = 0.0,
    min_score: int = 30,
    limit: int = 20,
) -> list[dict]:
    """
    Hybrid semantic + keyword job matching from vector store.
    Falls back gracefully if vector store is empty.
    """
    from .vector_store import collection_count
    if collection_count() == 0:
        return []

    student_text = prepare_student_text(student_skills)
    embedding = generate_embedding(student_text)
    raw = search_jobs(embedding, top_k=limit * 2)

    results = []
    skill_names = [s.get("name", "") for s in student_skills]

    for item in raw:
        meta = item["metadata"]
        semantic_score = item["similarity_score"]

        job_skills = meta.get("skills", "").split(",") if meta.get("skills") else []
        km = _skill_match_score(skill_names, job_skills, [])

        # Hybrid: 60% semantic + 30% keyword + 10% cgpa
        cgpa_score = min((cgpa / 10) * 100, 100) if cgpa else 50
        hybrid = round(
            0.60 * semantic_score +
            0.30 * km["score"] +
            0.10 * cgpa_score
        )

        if hybrid < min_score:
            continue

        results.append({
            "job_id": item["id"],
            "match_score": min(hybrid, 98),
            "match_quality": (
                "excellent" if hybrid >= 80 else
                "good" if hybrid >= 60 else
                "fair" if hybrid >= 40 else
                "poor"
            ),
            "matched_skills": km["matched"],
            "missing_skills": km["missing"],
            "semantic_score": round(semantic_score, 1),
            "keyword_score": km["score"],
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results[:limit]


def index_job_document(job_id: str, title: str, skills: list[str], description: str = "", requirements: list[str] = [], **meta) -> None:
    """Index a job into ChromaDB for semantic search."""
    text = prepare_job_text(title, skills, description, requirements)
    embedding = generate_embedding(text)
    metadata = {
        "title": title,
        "skills": ",".join(skills),
        "description": description[:500],
        **meta,
    }
    index_job(job_id, embedding, metadata)
