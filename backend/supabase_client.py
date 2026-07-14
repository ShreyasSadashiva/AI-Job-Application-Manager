"""
Supabase database client for v2 ApplyFlow.
Uses the v2_job_applications table. LaTeX is stored as text in tex_content — no file storage bucket needed.
"""

import os
import logging
import asyncio
from typing import Optional
from datetime import datetime

logger = logging.getLogger("supabase_client")

_client = None
DB_TIMEOUT_SECONDS = 20


class DatabaseRequestError(RuntimeError):
    """A database request could not be completed in a useful amount of time."""


def _get_client():
    global _client
    if _client is None:
        from supabase import ClientOptions, create_client
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
        if not url or not key:
            raise DatabaseRequestError("Database is not configured. Set SUPABASE_URL and SUPABASE_KEY.")
        _client = create_client(
            url,
            key,
            options=ClientOptions(postgrest_client_timeout=DB_TIMEOUT_SECONDS),
        )
    return _client


async def _run_sync(fn, operation: str):
    """Run a sync Supabase call without allowing a request to hang the API."""
    loop = asyncio.get_running_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, fn),
            timeout=DB_TIMEOUT_SECONDS + 2,
        )
    except asyncio.TimeoutError as exc:
        message = f"Database {operation} timed out after {DB_TIMEOUT_SECONDS} seconds. Please try again."
        logger.error(message)
        raise DatabaseRequestError(message) from exc
    except Exception as exc:
        logger.exception("Database %s failed", operation)
        raise DatabaseRequestError(f"Database {operation} failed: {exc}") from exc


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
    ideal_resume: Optional[dict] = None,
    gap_report: Optional[dict] = None,
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
    if ideal_resume:
        row["ideal_resume"] = ideal_resume
    if gap_report:
        row["gap_report"] = gap_report
    if model_used:
        row["model_used"] = model_used

    def _call():
        return client.table("v2_job_applications").insert(row).execute()

    result = await _run_sync(_call, "save")
    return result.data[0] if result.data else {}


async def get_job(job_id: str) -> Optional[dict]:
    client = _get_client()

    def _call():
        return client.table("v2_job_applications").select("*").eq("id", job_id).single().execute()

    try:
        result = await _run_sync(_call, "lookup")
        return result.data
    except Exception as e:
        logger.error(f"get_job {job_id}: {e}")
        return None


async def get_all_jobs(
    status: Optional[str] = None,
    has_resume: Optional[bool] = None,
    starred: Optional[bool] = None,
) -> list[dict]:
    client = _get_client()
    base_columns = (
        "id, company_name, position, jd_url, ats_score, status, model_used, "
        "created_at, updated_at, is_favourite, got_interview, "
        "tex_content, gap_analysis"
    )

    def _make_call(columns):
        def _call():
            q = client.table("v2_job_applications").select(columns).order("created_at", desc=True)
            if status:
                q = q.eq("status", status)
            if starred is True:
                q = q.eq("is_favourite", True)
            if has_resume is True:
                q = q.not_.is_("tex_content", "null")
            elif has_resume is False:
                q = q.is_("tex_content", "null")
            return q.execute()
        return _call

    try:
        result = await _run_sync(_make_call(base_columns + ", gap_report"), "list")
        return result.data or []
    except Exception as e:
        # gap_report column may not exist until the migration in SETUP.md runs.
        logger.warning(f"get_all_jobs with gap_report failed, retrying without: {e}")
    try:
        result = await _run_sync(_make_call(base_columns), "list")
        return result.data or []
    except Exception as e:
        logger.error(f"get_all_jobs: {e}")
        return []


async def get_jobs_by_ids(ids: list[str]) -> list[dict]:
    if not ids:
        return []
    client = _get_client()

    def _call():
        return (
            client.table("v2_job_applications")
            .select("id, company_name, position, tex_content, ats_score, is_favourite, created_at")
            .in_("id", ids)
            .execute()
        )

    try:
        result = await _run_sync(_call, "batch-fetch")
        return result.data or []
    except Exception as e:
        logger.error(f"get_jobs_by_ids: {e}")
        return []


async def update_job(job_id: str, updates: dict) -> dict:
    client = _get_client()
    updates["updated_at"] = datetime.utcnow().isoformat()

    def _call():
        return client.table("v2_job_applications").update(updates).eq("id", job_id).execute()

    result = await _run_sync(_call, "update")
    return result.data[0] if result.data else {}


async def delete_job(job_id: str) -> bool:
    client = _get_client()

    def _call():
        return client.table("v2_job_applications").delete().eq("id", job_id).execute()

    try:
        await _run_sync(_call, "delete")
        return True
    except Exception as e:
        logger.error(f"delete_job {job_id}: {e}")
        return False

