"""
LLM prompts for v2 resume generation pipeline.
"""

JD_ANALYZER_PROMPT = """You are an expert recruiter and ATS specialist. Deeply analyze this Job Description.

**Your task:**
1. Identify job title, company name, seniority level.
2. Extract EVERY requirement categorized by:
   - Priority: "must-have" or "nice-to-have"
   - Category: "technical", "soft-skill", "domain", "tool", or "certification"
3. Extract: technical skills, soft skills, domain knowledge, action verbs, ATS keywords, tone.

**IMPORTANT:** Be exhaustive. ATS keywords must be the EXACT phrases from the JD.

---

**JOB DESCRIPTION:**
{job_description}

---

Return ONLY a valid JSON object:
{{
  "job_title": "string",
  "company_name": "string or null",
  "seniority_level": "string",
  "requirements": [
    {{
      "skill_or_responsibility": "string",
      "priority": "must-have | nice-to-have",
      "category": "technical | soft-skill | domain | tool | certification"
    }}
  ],
  "technical_skills": ["Python", "RAG", ...],
  "soft_skills": ["Communication", ...],
  "domain_knowledge": ["Healthcare Data", ...],
  "key_action_verbs": ["string"],
  "ats_keywords": ["string"],
  "tone": "string"
}}

Use British English only (optimised, analysed, modelled).
"""


ACTION_VERBS = r"""
## SENIORITY-TIERED ACTION VERBS

### TIER 2 — MID-LEVEL (LTIMindtree: Software Engineer, Oct 2021 – Aug 2024)
**Development & Delivery:** Built, Developed, Automated, Implemented, Deployed, Engineered, Created, Integrated, Migrated, Containerized, Shipped, Launched
**Data & Analysis:** Modelled, Trained, Tuned, Validated, Extracted, Transformed, Quantified, Forecasted
**Operations:** Reduced, Streamlined, Consolidated, Eliminated, Standardised, Accelerated, Documented
**Also permitted (early-tenure bullets):** Delivered, Optimised, Improved, Supported, Maintained, Resolved, Contributed
**BANNED:** Led, Architected, Drove, Directed, Orchestrated, Established, Owned, Pioneered, Strategised, Championed

### TIER 1 — JUNIOR (Tepiche International: Data Analyst Intern, Sep 2025 – Feb 2026)
**Execution & Delivery:** Delivered, Optimised, Improved, Wrote, Completed, Prepared, Generated, Processed, Updated, Performed
**Support & Maintenance:** Supported, Maintained, Monitored, Resolved, Troubleshot, Handled, Diagnosed, Fixed, Tested, Reviewed, Identified, Contributed, Refined
**BANNED:** Led, Architected, Drove, Directed, Built (system-level), Engineered, Designed (architecture-level), Spearheaded

## GLOBAL RULES
1. NEVER reuse the same starting verb across any two bullets
2. Career growth must be visible: Tier 1 (execution) → Tier 2 (building)
3. BANNED filler: "scalable", "robust", "cutting-edge", "actionable insights", "data-driven decisions"
4. Every bullet must contain at least one specific technology, method, or metric
5. NEVER use the ~ symbol. Write ranges as "X--Y" instead.
"""


MASTER_RESUME_PROMPT = r"""
You are a senior resume writer and ATS specialist who writes like a human editor who has spent an hour with the candidate.

You have EVERYTHING in front of you:
- The full job description analysis
- The candidate's complete experience narratives
- The candidate's complete project narratives
- The action verbs lexicon with seniority tiers

Write from this full picture. Use them as a complete source of truth. Never invent facts.

---

## INPUTS

JD ANALYSIS:
{jd_analysis}

EXPERIENCE NARRATIVES:
{experience_text}

PROJECT NARRATIVES:
{project_text}

ACTION VERBS LEXICON:
{action_verbs}

---

## THE BULLET PHILOSOPHY

A great bullet answers: WHAT was delivered + HOW BIG + WHY it mattered. In 15--25 words.

**Rules:**
- British English only: optimised, analysed, modelled, prioritised, standardised
- Implied first person — never write I, me, my, we, our
- NEVER use the ~ symbol
- Never invent metrics. Use exact figures from narratives or honest ranges (e.g., "20--25%")
- Never add tools not present in narratives

---

## STEPS

**STEP 1 — TARGET TITLE**
Format: "[Seniority] [Role] | [Specialisation]"
Match JD seniority. Candidate has ~4 years — do not claim Staff or Principal.

**STEP 2 — PROFESSIONAL SUMMARY**
- Sentence 1: Mirror the JD's role title and top 2 must-have requirements
- Sentence 2: Frame your experience as the solution to the company's problem
- Sentence 3: Drop in 1--2 must-have keywords missing from bullets
- 40--55 words total. No metrics. No filler.

**STEP 3 — TEPICHE INTERNATIONAL BULLETS** (Sep 2025 – Feb 2026, Data Analyst Intern)
- 3--4 bullets using TIER 1 verbs only
- Each bullet: named deliverable + tool/concept + metric + outcome

**STEP 4 — LTIMINDTREE BULLETS** (Oct 2021 – Aug 2024, Software Engineer)
- 4--5 bullets using TIER 2 verbs (Tier 1 for early-tenure bullets)
- Each bullet: named deliverable + tool/concept + metric + outcome

**STEP 5 — PROJECT SELECTION**
- Only include projects if they fill a specific JD gap not covered by professional work
- If professional experience already covers the JD, skip projects or include max 2
- 2--4 bullets per project using WHAT + METRIC + OUTCOME
- Extract demo_url, github_url from narratives if present

**STEP 6 — SKILLS SECTION**
- Categories: Languages | Frameworks & Libraries | Cloud & DevOps | Tools & Platforms | Databases | Concepts
- 12--20 skills total. Only defensible skills from narratives. Prioritise JD-matching skills.

**STEP 7 — GAP ANALYSIS**
- ATS Score = (Must-have skills matched) / (Total must-have skills) × 100
- Identify true gaps (missing entirely) vs bridged gaps (transferable equivalent)
- Write a 3--5 sentence gap analysis report

---

## OUTPUT FORMAT

Return ONE valid JSON object only. No preamble, no commentary outside JSON.

{{
  "target_title": "string",
  "summary": "string (40--55 words)",
  "skills_data": {{ "Category": ["Skill", ...] }},
  "tepiche_title": "string",
  "tepiche_bullets": ["string", ...],
  "ltimindtree_title": "string",
  "ltimindtree_bullets": ["string", ...],
  "bullet_reasoning": {{
    "tepiche": ["why each bullet chosen"],
    "ltimindtree": ["why each bullet chosen"]
  }},
  "selected_projects": [
    {{
      "name": "string",
      "demo_url": "string or null",
      "github_url": "string or null",
      "bullets": ["string", ...],
      "reasoning": "why this project"
    }}
  ],
  "gap_analysis_report": "string",
  "ats_score": 0
}}
"""


ATS_SCORER_PROMPT = """You are an ATS (Applicant Tracking System) specialist. Score this resume against the job description.

JOB DESCRIPTION:
{jd_text}

RESUME (plain text extracted from LaTeX):
{resume_text}

Analyse:
1. Which must-have requirements from the JD are matched in the resume?
2. Which must-have requirements are completely missing (true gaps)?
3. Which requirements have transferable equivalents (bridged gaps)?
4. What are the top 3 improvements the candidate could make?

Return ONLY valid JSON:
{{
  "ats_score": <integer 0-100>,
  "must_have_total": <integer>,
  "must_have_matched": <integer>,
  "matched_skills": ["skill1", "skill2", ...],
  "true_gaps": ["missing skill", ...],
  "bridged_gaps": ["JD skill → CV equivalent", ...],
  "improvement_suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "gap_analysis_report": "3--5 sentences summarising the gaps and what would strengthen this application"
}}
"""
