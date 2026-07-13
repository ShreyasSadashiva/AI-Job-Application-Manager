"""
ApplyFlow v2 — FastAPI backend
Features: Resume generation from gold points, job tracker, manual edit, ATS scoring
"""

import os
import logging
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("api")

from resume_generator import generate_resume, score_ats_standalone, analyze_jd
import supabase_client as db

app = FastAPI(title="ApplyFlow v2", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(db.DatabaseRequestError)
async def database_request_error_handler(_, exc: db.DatabaseRequestError):
    """Return a clear error to the UI when Supabase is slow or unavailable."""
    return JSONResponse(status_code=503, content={"detail": str(exc)})


# ── Request Models ────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    company_name: str
    position: str
    jd_text: str
    jd_url: Optional[str] = None


class ManualJobRequest(BaseModel):
    company_name: str
    position: str
    jd_text: str = ""
    jd_url: Optional[str] = None
    status: str = "not applied"
    ats_score: Optional[int] = None


class UpdateJobRequest(BaseModel):
    status: Optional[str] = None
    tex_content: Optional[str] = None
    ats_score: Optional[int] = None
    gap_analysis: Optional[str] = None
    got_interview: Optional[bool] = None
    is_favourite: Optional[bool] = None
    company_name: Optional[str] = None
    position: Optional[str] = None


class CompileRequest(BaseModel):
    tex_content: str


class AtsRequest(BaseModel):
    resume_tex: str
    jd_text: str


class FetchJDRequest(BaseModel):
    url: str


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}


# ── JD Fetch ──────────────────────────────────────────────────────────────────

@app.post("/api/fetch-jd")
async def fetch_jd(req: FetchJDRequest):
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                req.url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                },
            )
            resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        # Trim to 6000 chars
        return {"jd_text": text[:6000], "url": req.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch JD: {e}")


# ── Resume Generation ─────────────────────────────────────────────────────────

@app.post("/api/generate/resume")
async def generate(req: GenerateRequest):
    """
    Full AI pipeline: JD analysis → content generation from gold points → LaTeX → PDF → Supabase
    """
    if not req.jd_text.strip():
        raise HTTPException(status_code=400, detail="JD text is required")
    if not req.company_name.strip() or not req.position.strip():
        raise HTTPException(status_code=400, detail="Company name and position are required")

    try:
        result = await generate_resume(
            company_name=req.company_name,
            position=req.position,
            jd_text=req.jd_text,
            jd_url=req.jd_url,
        )
        return result
    except db.DatabaseRequestError:
        raise
    except Exception as e:
        logger.exception("Resume generation failed")
        raise HTTPException(status_code=500, detail=str(e))


# ── Save Generated Resume ─────────────────────────────────────────────────────

class SaveGeneratedRequest(BaseModel):
    company_name: str
    position: str
    jd_text: str = ""
    jd_url: Optional[str] = None
    jd_analysis: Optional[dict] = None
    tailored_content: Optional[dict] = None
    tex_content: str
    ats_score: Optional[int] = None
    gap_analysis: Optional[str] = None
    ideal_resume: Optional[dict] = None
    gap_report: Optional[dict] = None
    status: str = "not applied"


@app.post("/api/jobs/save-generated")
async def save_generated(req: SaveGeneratedRequest):
    """Persist a generated resume the user has accepted. Called from the Generate
    page's save buttons — generation itself no longer writes to the database."""
    if not req.tex_content.strip():
        raise HTTPException(status_code=400, detail="No resume content to save")
    if not req.company_name.strip() or not req.position.strip():
        raise HTTPException(status_code=400, detail="Company name and position are required")

    job = await db.insert_job(
        company_name=req.company_name,
        position=req.position,
        jd_text=req.jd_text,
        jd_url=req.jd_url,
        jd_analysis=req.jd_analysis,
        tailored_content=req.tailored_content,
        gap_analysis=req.gap_analysis,
        ats_score=req.ats_score,
        tex_content=req.tex_content,
        ideal_resume=req.ideal_resume,
        gap_report=req.gap_report,
        model_used="gemini-2.5-flash + gpt-5-mini benchmark",
        status=req.status,
    )
    return {"job": job}


# ── Job Applications CRUD ─────────────────────────────────────────────────────

@app.get("/api/jobs")
async def get_jobs(
    status: Optional[str] = None,
    has_resume: Optional[bool] = None,
):
    jobs = await db.get_all_jobs(status=status, has_resume=has_resume)
    return {"jobs": jobs, "total": len(jobs)}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    job = await db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/api/jobs/manual")
async def create_manual_job(req: ManualJobRequest):
    if not req.company_name.strip() or not req.position.strip():
        raise HTTPException(status_code=400, detail="Company name and position are required")
    job = await db.insert_job(
        company_name=req.company_name,
        position=req.position,
        jd_text=req.jd_text,
        jd_url=req.jd_url,
        ats_score=req.ats_score,
        status=req.status,
    )
    return {"job": job}


@app.patch("/api/jobs/{job_id}")
async def update_job(job_id: str, req: UpdateJobRequest):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    job = await db.update_job(job_id, updates)
    return {"job": job}


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    success = await db.delete_job(job_id)
    if not success:
        raise HTTPException(status_code=500, detail="Delete failed")
    return {"success": True}


# ── Insights ──────────────────────────────────────────────────────────────────

@app.get("/api/insights")
async def get_insights():
    """Aggregate job + gap-report data for the Insights page: counts, severity
    breakdown, most common skills to work on, and applications over time."""
    jobs = await db.get_all_jobs()

    status_counts: dict[str, int] = {}
    monthly_applications: dict[str, int] = {}
    severity_counts = {"critical": 0, "moderate": 0, "minor": 0}
    skill_counts: dict[str, int] = {}
    skill_labels: dict[str, str] = {}
    ats_scores: list[int] = []
    interviews = 0
    total_gaps = 0
    jobs_with_reports = 0

    for job in jobs:
        job_status = job.get("status") or "unknown"
        status_counts[job_status] = status_counts.get(job_status, 0) + 1

        if job.get("got_interview"):
            interviews += 1
        if isinstance(job.get("ats_score"), int):
            ats_scores.append(job["ats_score"])

        created = job.get("created_at") or ""
        if len(created) >= 7:
            month = created[:7]  # YYYY-MM
            monthly_applications[month] = monthly_applications.get(month, 0) + 1

        report = job.get("gap_report")
        if not isinstance(report, dict):
            continue
        jobs_with_reports += 1

        for gap in report.get("gaps", []):
            if not isinstance(gap, dict):
                continue
            total_gaps += 1
            severity = str(gap.get("severity", "moderate")).lower()
            if severity in severity_counts:
                severity_counts[severity] += 1

        for skill in report.get("skills_to_work_on", []):
            name = str(skill).strip()
            if name:
                key = name.lower()
                skill_labels.setdefault(key, name)
                skill_counts[key] = skill_counts.get(key, 0) + 1

    top_skills = [
        {"skill": skill_labels[k], "count": v}
        for k, v in sorted(skill_counts.items(), key=lambda kv: kv[1], reverse=True)[:15]
    ]

    return {
        "total_jobs": len(jobs),
        "status_counts": status_counts,
        "interviews": interviews,
        "avg_ats_score": round(sum(ats_scores) / len(ats_scores)) if ats_scores else None,
        "jobs_with_gap_reports": jobs_with_reports,
        "total_gaps": total_gaps,
        "severity_counts": severity_counts,
        "skills_to_work_on": top_skills,
        "monthly_applications": [
            {"month": m, "count": c} for m, c in sorted(monthly_applications.items())
        ],
    }


# ── ATS Scoring ───────────────────────────────────────────────────────────────

@app.post("/api/jobs/{job_id}/recalculate-ats")
async def recalculate_ats(job_id: str):
    """Re-score a saved job's resume against its stored JD using the formula-based
    ATS rubric (must-haves matched / total) and persist the new score."""
    job = await db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not (job.get("tex_content") or "").strip():
        raise HTTPException(status_code=400, detail="This job has no saved resume to score")
    if not (job.get("jd_text") or "").strip():
        raise HTTPException(status_code=400, detail="This job has no stored JD text to score against")

    result = await score_ats_standalone(job["tex_content"], job["jd_text"])
    if result.get("error"):
        raise HTTPException(status_code=500, detail=f"ATS scoring failed: {result['error']}")

    updated = await db.update_job(job_id, {"ats_score": result["ats_score"]})
    return {"job": updated, "ats_report": result}


@app.post("/api/ats/score")
async def score_ats(req: AtsRequest):
    if not req.resume_tex.strip():
        raise HTTPException(status_code=400, detail="Resume LaTeX is required")
    if not req.jd_text.strip():
        raise HTTPException(status_code=400, detail="JD text is required")

    try:
        result = await score_ats_standalone(req.resume_tex, req.jd_text)
        return result
    except Exception as e:
        logger.exception("ATS scoring failed")
        raise HTTPException(status_code=500, detail=str(e))


# ── JD Analysis (standalone) ──────────────────────────────────────────────────

@app.post("/api/analyze/jd")
async def analyze_jd_endpoint(req: dict):
    jd_text = req.get("jd_text", "")
    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="JD text is required")
    try:
        analyzed = await analyze_jd(jd_text)
        return analyzed.model_dump()
    except Exception as e:
        logger.exception("JD analysis failed")
        raise HTTPException(status_code=500, detail=str(e))


# ── Save Manual Resume ────────────────────────────────────────────────────────

class SaveResumeRequest(BaseModel):
    job_id: Optional[str] = None
    company_name: str
    position: str
    jd_text: str = ""
    jd_url: Optional[str] = None
    tex_content: str
    ats_score: Optional[int] = None
    gap_analysis: Optional[str] = None
    status: str = "not applied"


@app.post("/api/jobs/save-resume")
async def save_resume(req: SaveResumeRequest):
    """Save manually edited LaTeX to Supabase (tex_content column)."""
    if req.job_id:
        updates = {
            "tex_content": req.tex_content,
            "status": req.status,
        }
        if req.ats_score is not None:
            updates["ats_score"] = req.ats_score
        if req.gap_analysis:
            updates["gap_analysis"] = req.gap_analysis
        job = await db.update_job(req.job_id, updates)
    else:
        job = await db.insert_job(
            company_name=req.company_name,
            position=req.position,
            jd_text=req.jd_text,
            jd_url=req.jd_url,
            ats_score=req.ats_score,
            gap_analysis=req.gap_analysis,
            tex_content=req.tex_content,
            status=req.status,
            model_used="manual",
        )

    return {"job": job}
