"""
Resume generation pipeline:
  Pass 1 — Analyze JD → AnalyzedJD
  Pass 2 — Generate tailored content using gold points → TailoredContent
  Assemble LaTeX → Compile PDF → Save to Supabase
"""

import json
import logging
import re
from typing import Optional

from models import AnalyzedJD, TailoredContent, Requirement
from prompts import (
    JD_ANALYZER_PROMPT,
    MASTER_RESUME_PROMPT,
    ACTION_VERBS,
    ATS_SCORER_PROMPT,
    RESUME_JUDGE_SYSTEM_PROMPT,
    RESUME_JUDGE_PROMPT,
    RESUME_REFINEMENT_PROMPT,
    RESUME_REFINEMENT_SYSTEM_PROMPT,
)
from llm_client import call_gemini, call_gemini_text, call_openai_json
from gold_points import read_experience, read_projects
from latex_template import build_latex
import supabase_client as db

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


async def generate_content(analyzed_jd: AnalyzedJD) -> TailoredContent:
    """Pass 2: Generate tailored resume content using gold points."""
    experience_text = read_experience()
    project_text = read_projects()

    jd_analysis_str = json.dumps(analyzed_jd.model_dump(), indent=2)

    prompt = MASTER_RESUME_PROMPT.format(
        jd_analysis=jd_analysis_str,
        experience_text=experience_text[:8000],
        project_text=project_text[:4000],
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


def _normalise_quality_review(review: dict) -> dict:
    """Keep the judge output predictable for storage, the UI, and Gemini's next pass."""
    def _score(name: str) -> int:
        try:
            return max(0, min(100, int(review.get(name, 0))))
        except (TypeError, ValueError):
            return 0

    def _items(name: str) -> list[str]:
        value = review.get(name, [])
        return [str(item) for item in value] if isinstance(value, list) else []

    return {
        "overall_score": _score("overall_score"),
        "ats_score": _score("ats_score"),
        "matched_strengths": _items("matched_strengths"),
        "true_gaps": _items("true_gaps"),
        "bridged_gaps": _items("bridged_gaps"),
        "improvement_suggestions": _items("improvement_suggestions"),
        "gap_analysis_report": str(review.get("gap_analysis_report", "")),
        "refinement_instructions": str(review.get("refinement_instructions", "")),
    }


async def judge_and_refine_resume(jd_text: str, tex_content: str) -> tuple[str, dict]:
    """Have ChatGPT assess the draft, then let Gemini apply defensible improvements."""
    logger.info("Quality review: assessing draft with ChatGPT...")
    raw_review = await call_openai_json(
        instructions=RESUME_JUDGE_SYSTEM_PROMPT,
        prompt=RESUME_JUDGE_PROMPT.format(jd_text=jd_text[:6000], tex_content=tex_content),
    )
    if not isinstance(raw_review, dict):
        raise RuntimeError("ChatGPT quality review did not return a JSON object.")
    review = _normalise_quality_review(raw_review)

    if not review["refinement_instructions"]:
        raise RuntimeError("ChatGPT quality review returned no refinement instructions.")

    logger.info("Quality review: refining draft with Gemini...")
    refined_tex = await call_gemini_text(
        RESUME_REFINEMENT_PROMPT.format(
            jd_text=jd_text[:6000],
            tex_content=tex_content,
        ),
        max_tokens=16384,
        system_instruction=RESUME_REFINEMENT_SYSTEM_PROMPT.format(
            refinement_instructions=review["refinement_instructions"],
        ),
    )
    refined_tex = re.sub(r"^```(?:latex|tex)?\s*|\s*```$", "", refined_tex.strip()).strip()
    if "\\begin{document}" not in refined_tex or "\\end{document}" not in refined_tex:
        raise RuntimeError("Gemini refinement did not return a complete LaTeX document.")

    return refined_tex, review


async def generate_resume(
    company_name: str,
    position: str,
    jd_text: str,
    jd_url: Optional[str] = None,
) -> dict:
    """
    Full pipeline: JD analysis → content generation → LaTeX assembly → DB save.
    Returns LaTeX as text; no PDF compilation.
    """
    # Pass 1
    analyzed_jd = await analyze_jd(jd_text)

    # Pass 2
    tailored = await generate_content(analyzed_jd)

    # Assemble LaTeX
    logger.info("Assembling LaTeX...")
    tex_content = build_latex(analyzed_jd, tailored)

    # ChatGPT judges the generated draft, then Gemini refines it from that review.
    tex_content, quality_review = await judge_and_refine_resume(jd_text, tex_content)

    # Save job + refined LaTeX to Supabase
    logger.info("Saving to Supabase...")
    job = await db.insert_job(
        company_name=company_name,
        position=position,
        jd_text=jd_text,
        jd_url=jd_url,
        jd_analysis=analyzed_jd.model_dump(),
        tailored_content=tailored.model_dump(),
        gap_analysis=quality_review["gap_analysis_report"] or tailored.gap_analysis_report,
        ats_score=quality_review["ats_score"] or tailored.ats_score,
        tex_content=tex_content,
        model_used="gemini-2.5-flash + gpt-5-mini judge",
        status="not applied",
    )

    logger.info(f"Resume generated for {company_name} — {position}")
    return {
        "job": job,
        "tex_content": tex_content,
        "analyzed_jd": analyzed_jd.model_dump(),
        "tailored_content": tailored.model_dump(),
        "quality_review": quality_review,
    }
