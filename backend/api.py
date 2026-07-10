"""
ApplyFlow v2 — FastAPI backend
Features: Resume generation from gold points, job tracker, manual edit, ATS scoring
"""

import os
import base64
import logging
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
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
    except Exception as e:
        logger.exception("Resume generation failed")
        raise HTTPException(status_code=500, detail=str(e))


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


# ── LaTeX Compile ─────────────────────────────────────────────────────────────

@app.post("/api/compile/latex")
async def compile_latex(req: CompileRequest):
    if not req.tex_content.strip():
        raise HTTPException(status_code=400, detail="LaTeX content is required")

    from pdf_compiler import compile_latex_to_pdf
    pdf_bytes = compile_latex_to_pdf(req.tex_content)
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="LaTeX compilation failed. Check pdflatex is installed.")

    return {"pdf_b64": base64.b64encode(pdf_bytes).decode()}


# ── ATS Scoring ───────────────────────────────────────────────────────────────

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
    """
    Save manually edited LaTeX to Supabase (tex_content column).
    Compiles PDF locally and returns it as base64 for the browser preview — not stored.
    """
    from pdf_compiler import compile_latex_to_pdf

    # Compile for in-browser preview only
    pdf_bytes = compile_latex_to_pdf(req.tex_content)
    pdf_b64 = base64.b64encode(pdf_bytes).decode() if pdf_bytes else None

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

    return {"job": job, "pdf_b64": pdf_b64}
