"""
ApplyFlow v2 — FastAPI backend
Features: Resume generation from gold points, job tracker, manual edit, ATS scoring
"""

import asyncio
import io
import math
import os
import logging
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("api")

from resume_generator import generate_resume, generate_resume_v3, score_ats_standalone, analyze_jd
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


class GenerateV3Request(BaseModel):
    company_name: str
    position: str
    jd_text: str
    candidate_voice: str
    jd_url: Optional[str] = None


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


# ── V3 Three-Pass Generation ──────────────────────────────────────────────────

@app.post("/api/generate/resume-v3")
async def generate_v3(req: GenerateV3Request):
    if not req.jd_text.strip():
        raise HTTPException(status_code=400, detail="JD text is required")
    if not req.company_name.strip() or not req.position.strip():
        raise HTTPException(status_code=400, detail="Company name and position are required")
    if not req.candidate_voice.strip():
        raise HTTPException(status_code=400, detail="Candidate voice description is required")
    try:
        result = await generate_resume_v3(
            company_name=req.company_name,
            position=req.position,
            jd_text=req.jd_text,
            candidate_voice=req.candidate_voice,
            jd_url=req.jd_url,
        )
        return result
    except Exception as e:
        logger.exception("V3 resume generation failed")
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


# ── Semantic ATS Scoring (embedding-based) ───────────────────────────────────

def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x ** 2 for x in a))
    norm_b = math.sqrt(sum(x ** 2 for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def _embed_single(text: str, client) -> list[float]:
    resp = await client.embeddings.create(model="text-embedding-3-small", input=text[:15000])
    return resp.data[0].embedding


async def _embed_batch(texts: list[str], client) -> list[list[float]]:
    resp = await client.embeddings.create(model="text-embedding-3-small", input=texts)
    return [d.embedding for d in sorted(resp.data, key=lambda x: x.index)]


_GAP_PROMPT = """\
You are an expert resume coach and ATS specialist.

A candidate's resume was compared against a job description using semantic embeddings (overall match: {score}/100).

The embedding comparison identified these JD requirements as LOW similarity to the resume — the candidate is likely missing or under-representing them:
{gap_lines}

These JD requirements had HIGH similarity — already well covered:
{matched_lines}

Using the low-similarity requirements as your primary evidence, respond with JSON only (no markdown fences):
{{
  "matched_areas": ["3-5 short phrases the resume covers well, grounded in the high-similarity list"],
  "missing_keywords": ["5-8 specific skills, tools, or phrases extracted directly from the low-similarity requirements"],
  "bridge_suggestions": ["4-5 concrete, actionable resume edits that directly address the low-similarity gaps — be specific about what to add or reword"],
  "summary": "2-3 sentence assessment grounded in the specific gaps found above"
}}
"""


async def _gap_analysis(gap_chunks: list[str], matched_chunks: list[str], score: int, client) -> dict:
    import json as _json
    gap_lines = "\n".join(f"• {c}" for c in gap_chunks) or "• (none identified)"
    matched_lines = "\n".join(f"• {c}" for c in matched_chunks) or "• (none identified)"
    prompt = _GAP_PROMPT.format(score=score, gap_lines=gap_lines, matched_lines=matched_lines)
    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    raw = resp.choices[0].message.content or "{}"
    try:
        return _json.loads(raw)
    except Exception:
        return {}


@app.post("/api/ats/semantic")
async def semantic_ats_score(
    file: UploadFile = File(...),
    job_id: Optional[str] = Form(None),
    jd_text: Optional[str] = Form(None),
):
    """Embed a PDF resume and a JD, compute cosine similarity, then run gap analysis."""
    from pypdf import PdfReader
    from openai import AsyncOpenAI

    if not job_id and not (jd_text and jd_text.strip()):
        raise HTTPException(status_code=400, detail="Provide job_id or jd_text")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        reader = PdfReader(io.BytesIO(content))
        resume_text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse PDF: {e}")

    if not resume_text:
        raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")

    if job_id and not jd_text:
        job = await db.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        jd_text = job.get("jd_text") or ""
        if not jd_text.strip():
            raise HTTPException(status_code=400, detail="This job has no stored JD text")

    # Chunk the JD into individual requirements (non-trivial lines only)
    jd_chunks = [l.strip() for l in jd_text.splitlines() if len(l.strip()) > 25][:30]

    try:
        oai = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        # One batch call for [full JD] + all chunks; one call for the resume — run in parallel
        resume_emb, batch_embs = await asyncio.gather(
            _embed_single(resume_text, oai),
            _embed_batch([jd_text[:15000]] + jd_chunks, oai),
        )
    except Exception as e:
        logger.exception("Embedding failed")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

    jd_full_emb = batch_embs[0]
    chunk_embs = batch_embs[1:]

    similarity = _cosine_similarity(resume_emb, jd_full_emb)
    score = round(similarity * 100)

    # Score every JD chunk against the resume to surface real gaps
    chunk_scores = sorted(
        [(chunk, _cosine_similarity(resume_emb, emb)) for chunk, emb in zip(jd_chunks, chunk_embs)],
        key=lambda x: x[1],
    )
    gap_chunks = [c for c, _ in chunk_scores[:10]]        # lowest similarity = likely missing
    matched_chunks = [c for c, _ in chunk_scores[-6:]]    # highest similarity = already covered

    try:
        gap = await _gap_analysis(gap_chunks, matched_chunks, score, oai)
    except Exception:
        logger.warning("Gap analysis failed; returning score only")
        gap = {}

    return {
        "semantic_score": score,
        "similarity": round(similarity, 4),
        "resume_chars": len(resume_text),
        "jd_chars": len(jd_text),
        "gap_analysis": gap,
    }


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
