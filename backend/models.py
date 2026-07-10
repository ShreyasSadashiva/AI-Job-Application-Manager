"""
Data models for v2 resume generation pipeline.
"""

from pydantic import BaseModel, Field
from typing import Optional


class Requirement(BaseModel):
    skill_or_responsibility: str
    priority: str = Field(description="must-have or nice-to-have")
    category: str = Field(description="technical, soft-skill, domain, tool, or certification")


class AnalyzedJD(BaseModel):
    job_title: str
    company_name: Optional[str] = None
    seniority_level: str
    requirements: list[Requirement]
    technical_skills: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    domain_knowledge: list[str] = Field(default_factory=list)
    clean_text: Optional[str] = ""
    key_action_verbs: list[str] = Field(default_factory=list)
    ats_keywords: list[str] = Field(default_factory=list)
    tone: str = "professional"


class TailoredContent(BaseModel):
    target_title: Optional[str] = None
    summary: Optional[str] = None
    validation_checks: Optional[dict] = None
    skills_data: dict[str, list[str]] = Field(default_factory=dict)
    skills_section: Optional[str] = None
    tepiche_title: Optional[str] = None
    tepiche_bullets: list[str] = Field(default_factory=list)
    ltimindtree_title: Optional[str] = None
    ltimindtree_bullets: list[str] = Field(default_factory=list)
    bullet_reasoning: dict = Field(default_factory=dict)
    selected_projects: list[dict] = Field(default_factory=list)
    interview_prep: dict = Field(default_factory=dict)
    certifications: list[str] = Field(default_factory=list)
    gap_analysis_report: Optional[str] = None
    ats_score: Optional[int] = None
