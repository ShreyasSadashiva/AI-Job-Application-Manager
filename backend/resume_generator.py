"""
Resume generation pipeline:
  Pass 1 — Analyze JD → AnalyzedJD
  Pass 2 — Generate tailored content using gold points → TailoredContent
  Assemble LaTeX → Compile PDF → Save to Supabase
"""

import asyncio
import json
import logging
import re
from typing import Optional

from models import AnalyzedJD, TailoredContent, Requirement
from prompts import (
    JD_ANALYZER_PROMPT,
    VOICE_ANALYZER_PROMPT,
    MASTER_RESUME_PROMPT,
    CRITIQUE_REWRITE_PROMPT,
    ACTION_VERBS,
    ATS_SCORER_PROMPT,
    IDEAL_RESUME_SYSTEM_PROMPT,
    IDEAL_RESUME_PROMPT,
    RESUME_GAP_COMPARISON_SYSTEM_PROMPT,
    RESUME_GAP_COMPARISON_PROMPT,
)
from llm_client import call_gemini, call_openai_json
from gold_points import read_experience, read_projects
from latex_template import build_latex

logger = logging.getLogger("resume_generator")


def _strip_latex(tex: str) -> str:
    """Strip LaTeX markup to plain text for ATS scoring."""
    text = re.sub(r"\\[a-zA-Z]+\*?(\[.*?\])?(\{.*?\})?", " ", tex)
    text = re.sub(r"[{}\\]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def analyze_jd(jd_text: str) -> AnalyzedJD:
    """Pass 1: Analyze job description using Gemini."""
    prompt = JD_ANALYZER_PROMPT.format(job_description=jd_text[:6000])
    logger.info("Pass 1: Analyzing JD...")

    raw = await call_gemini(prompt)

    # Parse requirements
    requirements = []
    for r in raw.get("requirements", []):
        try:
            requirements.append(Requirement(
                skill_or_responsibility=r.get("skill_or_responsibility", ""),
                priority=r.get("priority", "nice-to-have"),
                category=r.get("category", "technical"),
            ))
        except Exception:
            pass

    return AnalyzedJD(
        job_title=raw.get("job_title", "Software Engineer"),
        company_name=raw.get("company_name"),
        seniority_level=raw.get("seniority_level", "mid-level"),
        requirements=requirements,
        technical_skills=raw.get("technical_skills", []),
        soft_skills=raw.get("soft_skills", []),
        domain_knowledge=raw.get("domain_knowledge", []),
        key_action_verbs=raw.get("key_action_verbs", []),
        ats_keywords=raw.get("ats_keywords", []),
        tone=raw.get("tone", "professional"),
        clean_text=jd_text,
    )


def _default_voice_profile() -> dict:
    return {
        "roles": {},
        "overall_narrative": "A professional with extensive experience in data science, risk, and AI.",
        "strongest_achievement": "Demonstrated impact across multiple roles in regulated environments.",
    }


async def analyze_voice(candidate_voice: str) -> dict:
    """Pass 0: Extract signals about ownership, confidence, and significance."""
    if not candidate_voice.strip():
        return _default_voice_profile()
    logger.info("Pass 0: Analyzing candidate voice...")
    try:
        return await call_gemini(
            VOICE_ANALYZER_PROMPT.format(candidate_voice=candidate_voice)
        )
    except Exception as exc:
        logger.error("Voice analysis failed; using the parent fallback profile: %s", exc)
        return _default_voice_profile()


async def generate_content(analyzed_jd: AnalyzedJD, voice_profile: dict) -> TailoredContent:
    """Pass 2: Generate tailored resume content using gold points."""
    experience_text = read_experience()
    project_text = read_projects()

    jd_analysis_str = json.dumps(analyzed_jd.model_dump(), indent=2)

    prompt = MASTER_RESUME_PROMPT.format(
        jd_analysis=jd_analysis_str,
        experience_text=experience_text,
        project_text=project_text,
        voice_profile=json.dumps(voice_profile, indent=2),
        action_verbs=ACTION_VERBS,
    )

    logger.info("Pass 2: Generating tailored content...")
    raw = await call_gemini(prompt)

    # Parse selected_projects safely
    projects = []
    for p in raw.get("selected_projects", []):
        if isinstance(p, dict):
            projects.append({
                "name": p.get("name", ""),
                "demo_url": p.get("demo_url"),
                "report_url": p.get("report_url"),
                "github_url": p.get("github_url"),
                "bullets": p.get("bullets", []),
                "reasoning": p.get("reasoning", ""),
            })

    return TailoredContent(
        target_title=raw.get("target_title"),
        summary=raw.get("summary"),
        skills_data=raw.get("skills_data", {}),
        tepiche_title=raw.get("tepiche_title"),
        tepiche_bullets=raw.get("tepiche_bullets", []),
        ltimindtree_title=raw.get("ltimindtree_title"),
        ltimindtree_bullets=raw.get("ltimindtree_bullets", []),
        bullet_reasoning=raw.get("bullet_reasoning", {}),
        selected_projects=projects,
        gap_analysis_report=raw.get("gap_analysis_report"),
        ats_score=raw.get("ats_score"),
        validation_checks=raw.get("validation_checks"),
    )


async def critique_rewrite(
    tailored: TailoredContent,
    analyzed_jd: AnalyzedJD,
    voice_profile: dict,
) -> TailoredContent:
    """Pass 3: Review all bullets and replace only those rated weak."""
    bullets_to_review = {
        "tepiche": tailored.tepiche_bullets,
        "ltimindtree": tailored.ltimindtree_bullets,
        "projects": [
            {"project_name": p.get("name"), "bullets": p.get("bullets", [])}
            for p in tailored.selected_projects
        ],
    }
    prompt = CRITIQUE_REWRITE_PROMPT.format(
        bullets_json=json.dumps(bullets_to_review, indent=2),
        jd_analysis=json.dumps(analyzed_jd.model_dump(), indent=2),
        voice_profile=json.dumps(voice_profile, indent=2),
    )
    logger.info("Pass 3: Critiquing and selectively rewriting bullets...")
    try:
        review = await call_gemini(prompt)
    except Exception as exc:
        logger.error("Critique pass failed; retaining original bullets: %s", exc)
        return tailored

    def merge_role(role_key: str, bullets: list[str]) -> list[str]:
        rewrites = {
            item.get("original", "").strip(): item.get("rewritten")
            for item in review.get("reviewed_bullets", {}).get(role_key, [])
            if item.get("rating") == "WEAK" and item.get("rewritten")
        }
        return [rewrites.get(bullet.strip(), bullet) for bullet in bullets]

    tailored.tepiche_bullets = merge_role("tepiche", tailored.tepiche_bullets)
    tailored.ltimindtree_bullets = merge_role("ltimindtree", tailored.ltimindtree_bullets)

    project_rewrites = {}
    for project in review.get("projects", []):
        project_rewrites[project.get("project_name")] = {
            item.get("original", "").strip(): item.get("rewritten")
            for item in project.get("bullets", [])
            if item.get("rating") == "WEAK" and item.get("rewritten")
        }
    for project in tailored.selected_projects:
        rewrites = project_rewrites.get(project.get("name"), {})
        project["bullets"] = [
            rewrites.get(bullet.strip(), bullet)
            for bullet in project.get("bullets", [])
        ]
    return tailored


async def score_ats_standalone(resume_tex: str, jd_text: str) -> dict:
    """Score a resume against a JD using Gemini."""
    resume_text = _strip_latex(resume_tex)[:4000]
    prompt = ATS_SCORER_PROMPT.format(
        jd_text=jd_text[:3000],
        resume_text=resume_text,
    )
    logger.info("Scoring ATS...")
    try:
        raw = await call_gemini(prompt)
        return {
            "ats_score": raw.get("ats_score", 0),
            "must_have_total": raw.get("must_have_total", 0),
            "must_have_matched": raw.get("must_have_matched", 0),
            "matched_skills": raw.get("matched_skills", []),
            "true_gaps": raw.get("true_gaps", []),
            "bridged_gaps": raw.get("bridged_gaps", []),
            "improvement_suggestions": raw.get("improvement_suggestions", []),
            "gap_analysis_report": raw.get("gap_analysis_report", ""),
        }
    except Exception as e:
        logger.error(f"ATS scoring failed: {e}")
        return {"ats_score": 0, "error": str(e)}


_GAP_SEVERITIES = {"critical", "moderate", "minor"}


def _normalise_gap_report(report: dict) -> dict:
    """Keep the comparison output predictable for storage, the UI, and insights."""
    def _score(name: str) -> int:
        try:
            return max(0, min(100, int(report.get(name, 0))))
        except (TypeError, ValueError):
            return 0

    def _items(name: str) -> list[str]:
        value = report.get(name, [])
        return [str(item) for item in value] if isinstance(value, list) else []

    gaps = []
    raw_gaps = report.get("gaps", [])
    for gap in raw_gaps if isinstance(raw_gaps, list) else []:
        if not isinstance(gap, dict):
            continue
        severity = str(gap.get("severity", "moderate")).lower()
        gaps.append({
            "skill": str(gap.get("skill", "")),
            "severity": severity if severity in _GAP_SEVERITIES else "moderate",
            "detail": str(gap.get("detail", "")),
        })

    return {
        "match_score": _score("match_score"),
        "matched_strengths": _items("matched_strengths"),
        "gaps": gaps,
        "skills_to_work_on": _items("skills_to_work_on"),
        "summary": str(report.get("summary", "")),
    }


async def build_ideal_resume(jd_text: str) -> dict:
    """Have ChatGPT write the ideal candidate's resume from the JD alone."""
    logger.info("Benchmark: building ideal-candidate resume with ChatGPT...")
    ideal = await call_openai_json(
        instructions=IDEAL_RESUME_SYSTEM_PROMPT,
        prompt=IDEAL_RESUME_PROMPT.format(jd_text=jd_text[:6000]),
    )
    if not isinstance(ideal, dict) or not ideal.get("summary"):
        raise RuntimeError("ChatGPT did not return a usable ideal-candidate resume.")
    return ideal


async def compare_against_ideal(jd_text: str, ideal_resume: dict, tex_content: str) -> dict:
    """Have ChatGPT list what the ideal candidate has that this resume lacks."""
    logger.info("Benchmark: comparing generated resume against the ideal candidate...")
    raw_report = await call_openai_json(
        instructions=RESUME_GAP_COMPARISON_SYSTEM_PROMPT,
        prompt=RESUME_GAP_COMPARISON_PROMPT.format(
            jd_text=jd_text[:6000],
            ideal_resume=json.dumps(ideal_resume, indent=2),
            tex_content=tex_content,
        ),
    )
    if not isinstance(raw_report, dict):
        raise RuntimeError("ChatGPT gap comparison did not return a JSON object.")
    return _normalise_gap_report(raw_report)


async def benchmark_resume_gaps(jd_text: str, tex_content: str) -> tuple[dict, dict]:
    """Build the ideal-candidate benchmark, then compare the finished resume against it.

    Read-only with respect to the resume: the ideal resume is generated from the JD
    alone and the comparison never feeds back into the Gemini draft.
    """
    ideal_resume = await build_ideal_resume(jd_text)
    gap_report = await compare_against_ideal(jd_text, ideal_resume, tex_content)
    return ideal_resume, gap_report


async def generate_resume(
    company_name: str,
    position: str,
    jd_text: str,
    jd_url: Optional[str] = None,
    candidate_voice: str = "",
) -> dict:
    """
    Full pipeline: JD analysis → content generation → LaTeX assembly → DB save.
    Returns LaTeX as text; no PDF compilation.
    """
    # Pass 0 and Pass 1 are independent.
    voice_profile, analyzed_jd = await asyncio.gather(
        analyze_voice(candidate_voice),
        analyze_jd(jd_text),
    )

    # Pass 2
    tailored = await generate_content(analyzed_jd, voice_profile)

    # Pass 3
    tailored = await critique_rewrite(tailored, analyzed_jd, voice_profile)

    # Assemble LaTeX — this is the final resume; nothing below modifies it.
    logger.info("Assembling LaTeX...")
    tex_content = build_latex(analyzed_jd, tailored)

    # Two independent, read-only assessments of the finished resume:
    #  - formula-based ATS score (must-haves matched / total, same rubric as parent ApplyFlow)
    #  - ChatGPT ideal-candidate benchmark with gap analysis
    # Both are advisory: a failure in either must never block the resume itself.
    ideal_resume: Optional[dict] = None
    ats_report, bench_outcome = await asyncio.gather(
        score_ats_standalone(tex_content, jd_text),
        benchmark_resume_gaps(jd_text, tex_content),
        return_exceptions=True,
    )
    if isinstance(ats_report, BaseException):
        logger.error(f"ATS scoring failed: {ats_report}")
        ats_report = {"ats_score": 0, "error": str(ats_report)}
    if isinstance(bench_outcome, BaseException):
        logger.error(f"Benchmark comparison failed; continuing without gap report: {bench_outcome}")
        gap_report: Optional[dict] = {"error": str(bench_outcome)}
    else:
        ideal_resume, gap_report = bench_outcome

    # Nothing is saved here — the user decides in the UI whether to store the
    # result (and with which status) once they are happy with the ATS score.
    logger.info(f"Resume generated for {company_name} — {position}")
    return {
        "tex_content": tex_content,
        "analyzed_jd": analyzed_jd.model_dump(),
        "tailored_content": tailored.model_dump(),
        "ideal_resume": ideal_resume,
        "gap_report": gap_report,
        "ats_report": ats_report,
    }
