"""
Supabase database client for v2 ApplyFlow.
Uses the job_applications table. LaTeX is stored as text in tex_content — no file storage bucket needed.
"""

import os
import logging
import asyncio
from typing import Optional
from datetime import datetime

logger = logging.getLogger("supabase_client")

_client = None


def _get_client():
    global _client
    if _client is None:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in environment")
        _client = create_client(url, key)
    return _client


def _run_sync(fn):
    """Run a sync supabase call in an executor."""
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(None, fn)


# ── Job Applications ──────────────────────────────────────────────────────────

async def insert_job(
    company_name: str,
    position: str,
    jd_text: str,
    jd_url: Optional[str] = None,
    jd_analysis: Optional[dict] = None,
    tailored_content: Optional[dict] = None,
    gap_analysis: Optional[str] = None,
    ats_score: Optional[int] = None,
    tex_content: Optional[str] = None,
    model_used: Optional[str] = None,
    status: str = "applied",
) -> dict:
    client = _get_client()
    row = {
        "company_name": company_name,
        "position": position,
        "jd_text": jd_text,
        "status": status,
    }
    if jd_url:
        row["jd_url"] = jd_url
    if jd_analysis:
        row["jd_analysis"] = jd_analysis
    if tailored_content:
        row["tailored_content"] = tailored_content
    if gap_analysis:
        row["gap_analysis"] = gap_analysis
    if ats_score is not None:
        row["ats_score"] = ats_score
    if tex_content:
        row["tex_content"] = tex_content
    if model_used:
        row["model_used"] = model_used

    def _call():
        return client.table("job_applications").insert(row).execute()

    result = await _run_sync(_call)
    return result.data[0] if result.data else {}


async def get_job(job_id: str) -> Optional[dict]:
    client = _get_client()

    def _call():
        return client.table("job_applications").select("*").eq("id", job_id).single().execute()

    try:
        result = await _run_sync(_call)
        return result.data
    except Exception as e:
        logger.error(f"get_job {job_id}: {e}")
        return None


async def get_all_jobs(
    status: Optional[str] = None,
    has_resume: Optional[bool] = None,
) -> list[dict]:
    client = _get_client()

    def _call():
        q = client.table("job_applications").select(
            "id, company_name, position, jd_url, ats_score, status, model_used, "
            "created_at, updated_at, is_favourite, got_interview, "
            "tex_content, gap_analysis"
        ).order("created_at", desc=True)
        if status:
            q = q.eq("status", status)
        if has_resume is True:
            q = q.not_.is_("tex_content", "null")
        elif has_resume is False:
            q = q.is_("tex_content", "null")
        return q.execute()

    try:
        result = await _run_sync(_call)
        return result.data or []
    except Exception as e:
        logger.error(f"get_all_jobs: {e}")
        return []


async def update_job(job_id: str, updates: dict) -> dict:
    client = _get_client()
    updates["updated_at"] = datetime.utcnow().isoformat()

    def _call():
        return client.table("job_applications").update(updates).eq("id", job_id).execute()

    result = await _run_sync(_call)
    return result.data[0] if result.data else {}


async def delete_job(job_id: str) -> bool:
    client = _get_client()

    def _call():
        return client.table("job_applications").delete().eq("id", job_id).execute()

    try:
        await _run_sync(_call)
        return True
    except Exception as e:
        logger.error(f"delete_job {job_id}: {e}")
        return False


