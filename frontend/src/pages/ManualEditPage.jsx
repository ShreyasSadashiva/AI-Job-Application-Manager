import { useState, useEffect, useRef, useCallback } from "react";
import {
  PenLine, ExternalLink, Copy, CheckCircle, AlertCircle, X,
  Zap, Save, FileText, Search, ChevronRight, RefreshCw, Star,
  Clipboard, Check as CheckIcon, Upload,
} from "lucide-react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const LATEX_TEMPLATE = String.raw`\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage{hyperref}
\hypersetup{colorlinks=true,linkcolor=blue,filecolor=blue,urlcolor=blue,citecolor=blue}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\usepackage{geometry}

\geometry{margin=0.4in}
\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}
\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{\vspace{-6pt}\scshape\raggedright\large}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\newcommand{\resumeItem}[1]{\item\small{#1 \vspace{-2pt}}}
\newcommand{\resumeSubheading}[4]{
  \vspace{-1pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-5pt}
}
\newcommand{\resumeProject}[1]{\vspace{-1pt}\item\small{#1}\vspace{-5pt}}
\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}
\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}
\newcommand{\resumeSpace}{\vspace{6pt}}

\begin{document}

% ── HEADER ───────────────────────────────────────────────────────────────────
\begin{center}
    \textbf{\Huge \scshape Shreyas Achary} \\ \vspace{2pt}
    \small +353.089.977.4573 $|$
    \href{mailto:shreyasacharya8@gmail.com}{shreyasacharya8@gmail.com} $|$
    \href{https://linkedin.com/in/shreyas-achary}{linkedin.com/in/shreyas-achary} $|$
    \href{https://portfolio-three-rho-41.vercel.app/}{Portfolio}
\end{center}

% ── PROFESSIONAL SUMMARY ─────────────────────────────────────────────────────
\section{Professional Summary}
<40--55 word summary here>

% ── TECHNICAL SKILLS ─────────────────────────────────────────────────────────
\section{Technical Skills}
\begin{itemize}[leftmargin=0.15in, label={}]
  \small{\item{
    \textbf{Languages}: Python, SQL, ... \\
    \textbf{Frameworks \& Libraries}: ... \\
    \textbf{Cloud \& DevOps}: ... \\
    \textbf{Tools \& Platforms}: ... \\
    \textbf{Databases}: ... \\
    \textbf{Concepts}: ...
  }}
\end{itemize}

% ── EXPERIENCE ───────────────────────────────────────────────────────────────
\section{Experience}
\resumeSubHeadingListStart

  \resumeSubheading
    {<Job Title>}{<Start> -- <End>}
    {<Company>}{<Location>}
    \resumeItemListStart
      \resumeItem{Bullet one.}
      \resumeItem{Bullet two.}
    \resumeItemListEnd
    \resumeSpace

  \resumeSubheading
    {<Job Title>}{<Start> -- <End>}
    {<Company>}{<Location>}
    \resumeItemListStart
      \resumeItem{Bullet one.}
      \resumeItem{Bullet two.}
    \resumeItemListEnd

\resumeSubHeadingListEnd

% ── PROJECTS ─────────────────────────────────────────────────────────────────
\section{Projects}
\resumeSubHeadingListStart

  \resumeProject{\textbf{Project Name} $|$ \href{https://demo.url}{Demo} $|$ \href{https://github.url}{GitHub}}
  \resumeItemListStart
    \resumeItem{Bullet one.}
    \resumeItem{Bullet two.}
  \resumeItemListEnd
  \resumeSpace

  \resumeProject{\textbf{Project Name}}
  \resumeItemListStart
    \resumeItem{Bullet one.}
  \resumeItemListEnd

\resumeSubHeadingListEnd

% ── EDUCATION ────────────────────────────────────────────────────────────────
\section{Education}
\resumeSubHeadingListStart
  \resumeSubheading
    {University College Dublin}{Sep 2024 -- Sep 2025}
    {MSc in Data and Computational Science $|$ GPA: 2:1}{Dublin, Ireland}
    \resumeItemListStart
      \resumeItem{Relevant Modules: Statistical Machine Learning \& AI, Modern Regression Analysis, Multivariate Analysis.}
    \resumeItemListEnd
  \resumeSubheading
    {NMAM Institute of Technology}{Aug 2017 -- Jul 2021}
    {Bachelor of Engineering in Electronics and Communication Engineering}{Karnataka, India}
\resumeSubHeadingListEnd

\end{document}`;


const CANDIDATE_CONTEXT = `## Candidate Experience Index

This is a navigation index only — use it to understand what experience exists and where to find the relevant facts. Do NOT write bullets from this index. For each section you decide to include, refer to the detailed facts in the source documents provided above.

### Tepiche International — Data Analyst Intern (Sep 2025 – Feb 2026)
International trade/commerce company. Remote role. Key workstreams: data analysis, reporting, and analytics for business operations.

### LTIMindtree — Software Engineer (Aug 2021 – Aug 2024)
Global IT services and consulting firm. 3 years across software engineering, data engineering, and analytics for enterprise clients.

### Projects available

**Auto Doc Generator (RepoDoc AI)** — Demo: https://auto-doc-generator.streamlit.app/
- End-to-end LangGraph pipeline: GitHub URL → shallow clone → AST-based chunk extraction → FAISS embeddings → RAG documentation generation → LLM-judge validates citations → optional revise loop → Markdown + Word export
- Dual-vector retrieval using two FAISS indexes (TEXT vs CODE); MMR retrieval for diversity
- LangGraph state machine with quality gate ≥ 0.75, citation validation, hallucination check, max 2 revision retries

**ApplyFlow** — AI resume tailoring engine
- Multi-pass pipeline: JD analysis (Gemini) → gold-point selection → LaTeX assembly → GPT benchmark → gap analysis
- Semantic ATS scorer using OpenAI embeddings + cosine similarity with JD chunk-level gap detection

Pick the angle for each role that serves this specific JD. Write fresh bullets from the source CV facts — do not reproduce base CV bullets verbatim. Reframe to the relevant angle. Let the JD dictate section depth. Never drop a role entirely — compress less relevant ones.`;

const POWER_VERBS = `Development & Programming: Created, Engineered, Designed, Developed, Optimised, Implemented, Automated, Built, Deployed, Integrated, Launched, Refactored, Migrated, Architected, Configured, Modelled, Prototyped
Analysis & Data Science: Analysed, Forecasted, Predicted, Interpreted, Validated, Extracted, Modelled, Visualised, Synthesised, Evaluated, Computed, Aggregated, Quantified, Benchmarked
Project Management: Directed, Facilitated, Coordinated, Planned, Prioritised, Executed, Streamlined, Delivered, Accelerated, Consolidated
Extended: Adopted, Boosted, Calibrated, Consolidated, Debugged, Distributed, Enabled, Enhanced, Fine-Tuned, Initialised, Mapped, Merged, Overhauled, Packaged, Prevented, Processed, Rebuilt, Reconciled, Restored, Retrieved, Revamped, Rolled out, Scoped, Solved, Tested, Transitioned, Upgraded, Validated, Verified`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripLatex(tex) {
  if (!tex) return "";
  const start = tex.indexOf("\\begin{document}");
  if (start !== -1) tex = tex.slice(start + "\\begin{document}".length);
  return tex
    .replace(/%.*$/gm, "")
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, "$1")
    .replace(/\\[a-zA-Z]+\*?/g, " ")
    .replace(/[{}\[\]\\$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

// ── ATS Result ────────────────────────────────────────────────────────────────

function AtsResult({ result }) {
  if (!result) return null;
  const { ats_score, must_have_matched, must_have_total, matched_skills, true_gaps, bridged_gaps, improvement_suggestions, gap_analysis_report } = result;
  const cls = ats_score >= 75 ? "high" : ats_score >= 50 ? "mid" : "low";
  return (
    <div className="ats-result-card">
      <div className="flex items-center gap-4">
        <div style={{ textAlign: "center", minWidth: 80 }}>
          <div className={`ats-score-big ${cls}`}>{ats_score}</div>
          <div className="ats-label">ATS Score</div>
          {must_have_total > 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{must_have_matched}/{must_have_total} must-haves</div>}
        </div>
        <div style={{ flex: 1 }}>
          {matched_skills?.length > 0 && <div className="ats-gaps"><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>MATCHED</div>{matched_skills.slice(0, 8).map((g) => <span key={g} className="gap-tag gap-matched">{g}</span>)}{matched_skills.length > 8 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}> +{matched_skills.length - 8}</span>}</div>}
          {true_gaps?.length > 0 && <div className="ats-gaps"><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>TRUE GAPS</div>{true_gaps.map((g) => <span key={g} className="gap-tag gap-true">{g}</span>)}</div>}
          {bridged_gaps?.length > 0 && <div className="ats-gaps"><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>BRIDGED</div>{bridged_gaps.map((g) => <span key={g} className="gap-tag gap-bridged">{g}</span>)}</div>}
        </div>
      </div>
      {improvement_suggestions?.length > 0 && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>IMPROVEMENTS</div>
          {improvement_suggestions.map((s, i) => <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 5, display: "flex", gap: 6 }}><ChevronRight size={12} style={{ flexShrink: 0, marginTop: 2, color: "var(--red)" }} />{s}</div>)}
        </div>
      )}
      {gap_analysis_report && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>ANALYSIS</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>{gap_analysis_report}</div>
        </div>
      )}
    </div>
  );
}

// ── Keyword Gap Panel ─────────────────────────────────────────────────────────

function KeywordGap({ keywords, missingKeywords }) {
  const toast = useToast();
  if (!keywords) return null;
  const tiers = [
    { key: "tier1", label: "Core Skills (Tier 1)" },
    { key: "tier2", label: "Methods & Domain (Tier 2)" },
    { key: "tier3", label: "Soft Skills (Tier 3)" },
  ];
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="card-title" style={{ marginBottom: 10 }}>
        <Zap size={13} style={{ color: "var(--red)" }} /> Keyword Gap
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--warning)", fontWeight: 600 }}>
          {missingKeywords.length} missing
        </span>
      </div>
      {tiers.map(({ key, label }) => {
        const words = keywords[key] || [];
        if (!words.length) return null;
        return (
          <div key={key} style={{ marginBottom: 10 }}>
            <div className="stat-label" style={{ marginBottom: 5 }}>{label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {words.map((w) => {
                const missing = missingKeywords.some((m) => m.toLowerCase() === w.toLowerCase());
                return (
                  <span
                    key={w}
                    title={missing ? "Missing — click to copy" : "Present in CV"}
                    onClick={() => { if (missing) { copyText(w); toast.success(`Copied: ${w}`); } }}
                    style={{
                      fontSize: 11, padding: "2px 7px", borderRadius: 4, fontWeight: 500,
                      cursor: missing ? "pointer" : "default",
                      background: missing ? "var(--red-dim)" : "var(--success-dim)",
                      color: missing ? "var(--red)" : "var(--success)",
                      border: `1px solid ${missing ? "var(--red-border)" : "rgba(0,121,140,0.2)"}`,
                    }}
                  >
                    {missing ? "✗" : "✓"} {w}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
      {missingKeywords.length > 0 && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 6, fontSize: 11 }}
          onClick={() => { copyText(missingKeywords.join(", ")); toast.success("All missing keywords copied"); }}
        >
          <Copy size={11} /> Copy all missing
        </button>
      )}
    </div>
  );
}

// ── Build Prompt Button ───────────────────────────────────────────────────────

function BuildPromptButton({ targetCompany, targetPosition, targetJd, atsResult, similarJobs, starredJobs, selectedCvIds, cvRankings, recommendedProjects, onLoadBase, missingKeywords, directTex, disabled: externalDisabled }) {
  const toast = useToast();
  const [building, setBuilding] = useState(false);
  const [buildStatus, setBuildStatus] = useState("");
  const [promptText, setPromptText] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [copied, setCopied] = useState(false);

  function getTargetJobs() {
    if (selectedCvIds?.size > 0) {
      const fromSimilar = similarJobs.map((j, i) => ({ ...j, _idx: i })).filter((j) => selectedCvIds.has(j.id));
      const similarIds = new Set(fromSimilar.map((j) => j.id));
      const fromStarred = (starredJobs || [])
        .filter((j) => selectedCvIds.has(j.id) && !similarIds.has(j.id))
        .map((j) => ({ ...j, _idx: -1 }));
      return [...fromSimilar, ...fromStarred];
    }
    return similarJobs.slice(0, 3).map((j, i) => ({ ...j, _idx: i }));
  }

  function buildPrompt(enrichedJobs) {
    const lines = [];
    lines.push(`# CV Edit Session — ${targetPosition} at ${targetCompany}\n`);
    lines.push(`## Job Description\n${targetJd}\n`);

    if (atsResult) {
      lines.push(`## ATS Analysis`);
      lines.push(`**Score:** ${atsResult.ats_score}/100 | Must-haves: ${atsResult.must_have_matched}/${atsResult.must_have_total}`);
      if (atsResult.true_gaps?.length) lines.push(`**Missing keywords:** ${atsResult.true_gaps.join(", ")}`);
      if (atsResult.gap_analysis_report) lines.push(`\n**Gap Analysis:**\n${atsResult.gap_analysis_report}`);
      lines.push("");
    }

    if (missingKeywords?.length) {
      lines.push(`## Missing Keywords (inject these naturally where evidence exists)`);
      lines.push(missingKeywords.join(", "));
      lines.push("");
    }

    if (recommendedProjects?.length) {
      lines.push(`## Recommended Projects for this JD`);
      recommendedProjects.forEach((p) => lines.push(`- **${p.name}**: ${p.reason}`));
      lines.push("");
    }

    const hasPlainText = enrichedJobs.some((j) => !j.id);

    lines.push(`## Base CV(s) — work ONLY from these`);
    enrichedJobs.forEach((job) => {
      const rank = cvRankings?.[job._idx];
      const tag = rank ? ` [${rank.recommendation}]` : "";
      lines.push(`### ${job.company_name} — ${job.position}${tag}`);
      if (rank?.reason) lines.push(`*${rank.reason}*`);
      if (job.tex_content) {
        const fence = job.id ? "latex" : "text";
        lines.push(`\`\`\`${fence}\n${job.tex_content}\n\`\`\``);
      }
    });

    if (hasPlainText) {
      lines.push(`\n## LaTeX Template — output MUST match this structure exactly`);
      lines.push(`The base CV above is plain text extracted from a PDF. Reconstruct it as a full LaTeX CV using ONLY the template below. Do not deviate from the custom commands, section order, or formatting.`);
      lines.push(`\`\`\`latex\n${LATEX_TEMPLATE}\n\`\`\``);
    }

    lines.push(`\n## Power Verbs\n${POWER_VERBS}\n`);
    lines.push(`\n${CANDIDATE_CONTEXT}`);
    lines.push(`\n## Source Documents`);
    lines.push(`Two source documents are attached to this project: **professional_experience.docx** (full experience facts) and **projects.docx** (full project details with gold-standard bullet points).`);
    lines.push(`The base CV(s) above cover most of what you need. If the JD asks for something not clearly surfaced, search the source docs — the full facts are there.\n`);

    lines.push(`## Instructions`);
    lines.push(`- Follow the existing LaTeX structure exactly`);
    lines.push(`- Inject missing keywords naturally — only where genuine evidence exists`);
    lines.push(`- Do NOT invent experience, tools, or metrics`);
    lines.push(`- NEVER append tool qualifiers inline in bullets (e.g. "using Python") — put tools in Skills section`);
    lines.push(`- NEVER use em-dashes (—). British English. Exact years ("4 years", not "4+").`);
    lines.push(`- Every bullet: **Verb + thing you owned/built + measurable result**. Nothing more.`);
    lines.push(`- Vary action verbs — never repeat the same verb twice across the whole CV`);
    lines.push(`- Cut bullets irrelevant to this JD — 3 strong bullets beat 6 generic ones`);
    lines.push(`- Skills = tools, methods, technical capabilities only. No soft skills in the skills section.`);
    lines.push(`- Before adding any skill: (1) is it in the base CV? (2) does the JD ask for it? Both must be yes.`);
    lines.push(`- Impact must be explicit on every bullet — state the outcome, not just the action`);
    lines.push(`- Output full LaTeX CV ready to compile`);

    lines.push(`\n## Chain of Thought — complete BEFORE writing any LaTeX`);
    lines.push(`1. **Role analysis:** What does this role need? What is the company stage and core problem?`);
    lines.push(`2. **Keyword audit:** For each missing keyword — which existing bullet can be reframed? If no evidence, skip.`);
    lines.push(`3. **Skills audit:** Which skills in the base CV are relevant? What to keep vs cut?`);
    lines.push(`4. **Bullet plan:** For each role, strongest angle for this JD?`);
    lines.push(`5. **Gap check:** Any JD requirement with NO evidence in the CVs above? Ask me max 4 targeted questions BEFORE writing. If no gaps, proceed directly.`);

    return lines.join("\n");
  }

  function buildStrictPrompt(enrichedJobs) {
    const lines = [];
    lines.push(`# CV Strict Rewrite — ${targetPosition} at ${targetCompany}\n`);
    lines.push(`## Job Description\n${targetJd}\n`);

    if (missingKeywords?.length) {
      lines.push(`## Missing Keywords`);
      lines.push(missingKeywords.join(", "));
      lines.push("");
    }

    const hasPlainText = enrichedJobs.some((j) => !j.id);

    lines.push(`## Base CV(s) — ONLY rewrite what is already here`);
    enrichedJobs.forEach((job) => {
      lines.push(`### ${job.company_name} — ${job.position}`);
      if (job.tex_content) {
        const fence = job.id ? "latex" : "text";
        lines.push(`\`\`\`${fence}\n${job.tex_content}\n\`\`\``);
      }
    });

    if (hasPlainText) {
      lines.push(`\n## LaTeX Template — output MUST match this structure exactly`);
      lines.push(`The base CV above is plain text extracted from a PDF. Reconstruct it as a full LaTeX CV using ONLY the template below. Do not deviate from the custom commands, section order, or formatting.`);
      lines.push(`\`\`\`latex\n${LATEX_TEMPLATE}\n\`\`\``);
    }

    lines.push(`\n## Power Verbs\n${POWER_VERBS}\n`);

    lines.push(`## Strict Rules`);
    lines.push(`- Work ONLY from the base CV — no new experience, tools, metrics, or projects`);
    lines.push(`- You MAY reorder bullets, tighten language, swap synonyms, inject JD keywords into existing bullets`);
    lines.push(`- You MAY trim bullets irrelevant to this JD`);
    lines.push(`- No invented numbers or outcomes — only figures already in the CV`);
    lines.push(`- No tool qualifiers inline in bullets — put tools in Skills`);
    lines.push(`- No em-dashes. British English. Exact years ("4 years", not "4+")`);
    lines.push(`- Every bullet: **Verb + thing you owned/built + measurable result**. Nothing more.`);
    lines.push(`- One clear result per bullet — do not stack multiple outcomes`);
    lines.push(`- Vary verbs across all bullets`);
    lines.push(`- Flag any change that goes beyond rewording`);
    lines.push(`- Output full LaTeX CV ready to compile`);

    return lines.join("\n");
  }

  async function handleBuild(strict = false) {
    setBuilding(true);
    try {
      let targets = getTargetJobs();
      if (!targets.length) {
        if (directTex?.trim()) {
          targets = [{ id: null, company_name: targetCompany || "Base CV", position: targetPosition || "", tex_content: directTex, _idx: -1 }];
        } else {
          toast.error("No CVs selected — load starred CVs or run a similarity search first");
          return;
        }
      }
      setBuildStatus(`Fetching ${targets.length} CV(s)…`);
      const dbTargets = targets.filter((j) => j.id);
      let texMap = {};
      if (dbTargets.length) {
        const { jobs: texRows } = await api.getJobsBatchTex(dbTargets.map((j) => j.id));
        texMap = Object.fromEntries((texRows || []).map((r) => [r.id, r.tex_content]));
      }
      const enriched = targets.map((job) => ({ ...job, tex_content: job.id ? (texMap[job.id] || "") : (job.tex_content || "") }));
      setBuildStatus("Building…");
      const prompt = strict ? buildStrictPrompt(enriched) : buildPrompt(enriched);
      setPromptText(prompt);
      setShowEditor(true);
      if (!strict && onLoadBase) {
        let baseJob = null;
        if (cvRankings) {
          const entry = Object.entries(cvRankings).find(([, r]) => r.recommendation === "use_as_base");
          if (entry) baseJob = similarJobs[Number(entry[0])];
        }
        if (!baseJob) baseJob = enriched[0];
        if (baseJob?.id) onLoadBase(baseJob.id);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBuilding(false);
      setBuildStatus("");
    }
  }

  async function handleCopy() {
    await copyText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const label = selectedCvIds?.size > 0
    ? `Build Prompt (${selectedCvIds.size} CV${selectedCvIds.size > 1 ? "s" : ""})`
    : "Build Prompt (top 3)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-primary btn-sm" onClick={() => handleBuild(false)} disabled={building || externalDisabled}>
          {building ? <span className="spinner" style={{ borderTopColor: "#fff" }} /> : <Clipboard size={13} />}
          {building ? (buildStatus || "Building…") : label}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => handleBuild(true)} disabled={building || externalDisabled} title="Only reword what's already in the CV — no additions">
          {building ? <span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> : <Clipboard size={13} />}
          {building ? "" : "Strict Prompt"}
        </button>
      </div>

      {showEditor && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Prompt Editor — tweak before copying
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowEditor(false)}><X size={12} /></button>
          </div>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="code-editor"
            style={{ minHeight: 320 }}
          />
          <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }} onClick={handleCopy}>
            {copied ? <CheckIcon size={13} /> : <Clipboard size={13} />}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── CV Picker ─────────────────────────────────────────────────────────────────

function CvPicker({ onLoad, loadedJobId, targetJd, tex, selectedCvIds, onToggleSelect, onSimilarLoaded, onStarredLoaded, cvRankings, onAnalyseFit, analysingFit }) {
  const toast = useToast();
  const [tab, setTab] = useState("starred");
  const [starredJobs, setStarredJobs] = useState([]);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [fetchingStarred, setFetchingStarred] = useState(false);
  const [findingSimilar, setFindingSimilar] = useState(false);
  const [search, setSearch] = useState("");

  const loadStarred = useCallback(async () => {
    setFetchingStarred(true);
    try {
      const { jobs } = await api.getStarredJobs();
      setStarredJobs(jobs || []);
      onStarredLoaded?.(jobs || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFetchingStarred(false);
    }
  }, []);

  useEffect(() => { loadStarred(); }, [loadStarred]);

  async function findSimilar() {
    if (!targetJd.trim()) return toast.error("Paste a JD first");
    setFindingSimilar(true);
    try {
      const { jobs } = await api.similarJobs(targetJd, tex || "", 6);
      setSimilarJobs(jobs || []);
      onSimilarLoaded?.(jobs || []);
      setTab("semantic");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFindingSimilar(false);
    }
  }

  const displayJobs = tab === "starred" ? starredJobs : similarJobs;
  const filtered = displayJobs.filter((j) => {
    const q = search.toLowerCase();
    return !q || j.company_name?.toLowerCase().includes(q) || j.position?.toLowerCase().includes(q);
  });

  function toggleAll() {
    const allSelected = filtered.every((j) => selectedCvIds?.has(j.id));
    filtered.forEach((j) => {
      const selected = selectedCvIds?.has(j.id);
      if (allSelected ? selected : !selected) onToggleSelect?.(j.id);
    });
  }

  return (
    <div>
      <div className="flex gap-1" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 12 }}>
        <button className={`tab ${tab === "starred" ? "active" : ""}`} style={{ padding: "6px 14px" }} onClick={() => setTab("starred")}>
          <Star size={12} /> Starred
        </button>
        <button className={`tab ${tab === "semantic" ? "active" : ""}`} style={{ padding: "6px 14px" }} onClick={() => setTab("semantic")}>
          <Zap size={12} /> Similar
        </button>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={tab === "starred" ? loadStarred : findSimilar} disabled={fetchingStarred || findingSimilar}>
          {(fetchingStarred || findingSimilar) ? <span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> : <RefreshCw size={12} />}
          {tab === "starred" ? "Refresh" : "Find Similar"}
        </button>
      </div>

      {tab === "semantic" && !similarJobs.length && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 12 }}>
          Paste a JD above and click <strong>Find Similar</strong>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <div className="search-wrap" style={{ maxWidth: "100%", marginBottom: 8 }}>
            <Search size={13} />
            <input className="search-input" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every((j) => selectedCvIds?.has(j.id))}
              onChange={toggleAll}
              style={{ width: 14, height: 14, cursor: "pointer", accentColor: "var(--red)" }}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Select all ({filtered.length})</span>
            {selectedCvIds?.size > 0 && (
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--red)", fontWeight: 600 }}>
                {selectedCvIds.size} selected
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 280, overflowY: "auto", marginBottom: 10 }}>
            {filtered.map((job, i) => {
              const rank = tab === "semantic" ? cvRankings?.[i] : null;
              const isBase = rank?.recommendation === "use_as_base";
              const isRef = rank?.recommendation === "reference_only";
              return (
                <div
                  key={job.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${loadedJobId === job.id ? "var(--red)" : "var(--border)"}`,
                    background: loadedJobId === job.id ? "var(--red-dim)" : "var(--surface2)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCvIds?.has(job.id) || false}
                    onChange={() => onToggleSelect?.(job.id)}
                    style={{ width: 14, height: 14, flexShrink: 0, cursor: "pointer", accentColor: "var(--red)" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {job.company_name} — {job.position}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      ATS: {job.ats_score ?? "—"}
                      {tab === "semantic" && job.similarity != null && ` · ${Math.round(job.similarity * 100)}% match`}
                    </div>
                    {rank && (
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 999, fontWeight: 600, marginTop: 3, display: "inline-block",
                        background: isBase ? "var(--success-dim)" : isRef ? "var(--info-dim)" : "var(--surface3)",
                        color: isBase ? "var(--success)" : isRef ? "var(--info)" : "var(--text-muted)",
                      }}>
                        {isBase ? "✓ Use as base" : isRef ? "~ Reference" : "✗ Skip"}
                        {rank.reason && ` · ${rank.reason}`}
                      </span>
                    )}
                  </div>
                  <button
                    className={`btn btn-sm ${loadedJobId === job.id ? "btn-secondary" : "btn-primary"}`}
                    style={{ fontSize: 11, padding: "2px 10px", flexShrink: 0 }}
                    onClick={() => onLoad(job.id)}
                  >
                    {loadedJobId === job.id ? "Loaded ✓" : "Load"}
                  </button>
                </div>
              );
            })}
          </div>

          {tab === "semantic" && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onAnalyseFit?.(filtered)}
              disabled={analysingFit || !targetJd.trim()}
              title={!targetJd.trim() ? "Paste a JD first" : "Gemini ranks these CVs for this JD"}
            >
              {analysingFit ? <><span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> Analysing…</> : <><Zap size={12} /> Analyse Fit</>}
            </button>
          )}
        </>
      )}

      {tab === "starred" && !fetchingStarred && starredJobs.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "16px 0" }}>
          No starred jobs yet — star a job in the tracker to add it here.
        </div>
      )}
    </div>
  );
}

// ── Main ManualEditPage ───────────────────────────────────────────────────────

export default function ManualEditPage() {
  const toast = useToast();

  // Target role
  const [targetCompany, setTargetCompany] = useState("");
  const [targetPosition, setTargetPosition] = useState("");
  const [targetJd, setTargetJd] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [fetchingJd, setFetchingJd] = useState(false);

  // CV source
  const [source, setSource] = useState("load"); // "load" | "upload" | "paste"
  const [tex, setTex] = useState("");
  const [loadedJobId, setLoadedJobId] = useState(null);

  // CV picker state
  const [starredJobs, setStarredJobs] = useState([]);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [selectedCvIds, setSelectedCvIds] = useState(new Set());
  const [cvRankings, setCvRankings] = useState({});
  const [recommendedProjects, setRecommendedProjects] = useState(null);
  const [analysingFit, setAnalysingFit] = useState(false);

  // Keywords
  const [keywords, setKeywords] = useState(null);
  const [missingKeywords, setMissingKeywords] = useState([]);
  const [extractingKw, setExtractingKw] = useState(false);

  // Saved jobs (for dropdown)
  const [savedJobs, setSavedJobs] = useState([]);
  useEffect(() => {
    api.getJobs().then(({ jobs }) => setSavedJobs(jobs || [])).catch(() => {});
  }, []);

  // Results
  const [atsResult, setAtsResult] = useState(null);
  const [jobId, setJobId] = useState(null);

  // Tracker job context (set when a saved job is loaded or selected)
  const [trackerJobId, setTrackerJobId] = useState(null);
  const [originalTex, setOriginalTex] = useState("");

  // Loading
  const [scoring, setScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzingJD, setAnalyzingJD] = useState(false);
  const [jdAnalysis, setJdAnalysis] = useState(null);

  // Modals
  const [showLoadModal, setShowLoadModal] = useState(false);

  const fileInputRef = useRef(null);

  // ── Keyword gap ──────────────────────────────────────────────────────────────

  function computeMissing(kw, cvText) {
    const lower = cvText.toLowerCase();
    const all = [...(kw.tier1 || []), ...(kw.tier2 || []), ...(kw.tier3 || [])];
    setMissingKeywords(all.filter((k) => !lower.includes(k.toLowerCase())));
  }

  useEffect(() => {
    if (keywords && tex) computeMissing(keywords, stripLatex(tex));
  }, [tex, keywords]);

  useEffect(() => {
    if (!targetJd.trim()) { setKeywords(null); setMissingKeywords([]); return; }
    const timer = setTimeout(async () => {
      if (extractingKw) return;
      setExtractingKw(true);
      try {
        const kw = await api.extractKeywords(targetJd);
        setKeywords(kw);
        if (tex) computeMissing(kw, stripLatex(tex));
      } catch { /* non-critical */ } finally {
        setExtractingKw(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [targetJd]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function fetchJd() {
    if (!jdUrl.trim()) return toast.error("Enter a URL first");
    setFetchingJd(true);
    try {
      const { jd_text } = await api.fetchJD(jdUrl);
      setTargetJd(jd_text);
      toast.success("JD fetched");
    } catch (e) { toast.error(e.message); } finally { setFetchingJd(false); }
  }

  async function analyzeJD() {
    if (!targetJd.trim()) return toast.error("No JD text");
    setAnalyzingJD(true);
    try {
      const result = await api.analyzeJD(targetJd);
      setJdAnalysis(result);
      toast.success("JD analysed");
    } catch (e) { toast.error(e.message); } finally { setAnalyzingJD(false); }
  }

  async function loadJob(jobId) {
    try {
      const full = await api.getJob(jobId);
      setLoadedJobId(full.id);
      setTrackerJobId(full.id);
      const loadedTex = full.tex_content || "";
      setTex(loadedTex);
      setOriginalTex(loadedTex);
      if (!targetCompany) setTargetCompany(full.company_name || "");
      if (!targetPosition) setTargetPosition(full.position || "");
      if (!targetJd) setTargetJd(full.jd_text || "");
      setAtsResult(null);
      toast.success(`Loaded: ${full.company_name}`);
    } catch (e) { toast.error(e.message); }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { text } = await api.parsePdf(file);
      setTex(text);
      setSource("paste");
      toast.success("PDF parsed — text loaded into editor");
    } catch (e) { toast.error(e.message); }
  }

  async function handleAnalyseFit(jobs) {
    if (!targetJd.trim() || !jobs.length) return;
    setAnalysingFit(true);
    try {
      const { jobs: texRows } = await api.getJobsBatchTex(jobs.map((j) => j.id));
      const texMap = Object.fromEntries((texRows || []).map((r) => [r.id, r.tex_content]));
      const withTex = jobs.map((j) => ({ ...j, tex_content: texMap[j.id] || "" }));
      const { rankings, recommended_projects } = await api.analyseCvFit({ jd_text: targetJd, cv_jobs: withTex });
      const rankMap = {};
      const autoSelect = new Set();
      rankings?.forEach((r) => {
        rankMap[r.index] = r;
        if (r.recommendation !== "skip") autoSelect.add(jobs[r.index]?.id);
      });
      setCvRankings(rankMap);
      setSelectedCvIds(autoSelect);
      if (recommended_projects?.length) setRecommendedProjects(recommended_projects);
      toast.success("Fit analysis complete");
    } catch (e) { toast.error(e.message); } finally { setAnalysingFit(false); }
  }

  async function scoreAts() {
    if (!tex.trim()) return toast.error("No resume content");
    if (!targetJd.trim()) return toast.error("No JD text");
    setScoring(true);
    try {
      const result = await api.scoreAts({ resume_tex: tex, jd_text: targetJd });
      setAtsResult(result);
      toast.success(`ATS score: ${result.ats_score}`);
    } catch (e) { toast.error(e.message); } finally { setScoring(false); }
  }

  async function save(status = "not applied") {
    if (!targetCompany.trim() || !targetPosition.trim()) return toast.error("Company and position required");
    if (!tex.trim()) return toast.error("No resume content to save");
    setSaving(true);
    try {
      const texChanged = tex.trim() !== originalTex.trim();
      const hasLatex = tex.includes("\\documentclass") || tex.includes("\\begin{document}");
      const atsUpdated = !!atsResult;
      const shouldUpdateTracker = trackerJobId && ((texChanged && hasLatex) || atsUpdated);

      if (jobId) {
        await api.updateJob(jobId, { tex_content: tex, status, ats_score: atsResult?.ats_score });
        toast.success("Updated");
      } else if (shouldUpdateTracker) {
        await api.updateJob(trackerJobId, { tex_content: tex, status, ats_score: atsResult?.ats_score });
        setOriginalTex(tex);
        toast.success("Tracker job updated");
      } else {
        const { job } = await api.saveResume({
          company_name: targetCompany,
          position: targetPosition,
          jd_text: targetJd,
          jd_url: jdUrl || undefined,
          tex_content: tex,
          ats_score: atsResult?.ats_score,
          gap_analysis: atsResult?.gap_analysis_report,
          status,
        });
        setJobId(job.id);
        toast.success("Saved to tracker");
      }
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  }

  function toggleCvSelection(id) {
    setSelectedCvIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function reset() {
    setTargetCompany(""); setTargetPosition(""); setTargetJd(""); setJdUrl("");
    setTex(""); setLoadedJobId(null); setSource("load");
    setStarredJobs([]); setSimilarJobs([]); setSelectedCvIds(new Set()); setCvRankings({}); setRecommendedProjects(null);
    setKeywords(null); setMissingKeywords([]); setAtsResult(null); setJobId(null); setJdAnalysis(null);
    setTrackerJobId(null); setOriginalTex("");
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Manual Edit</h1>
          <p className="page-subtitle">Target role → find best base CV → build prompt → score ATS → save</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={reset}><RefreshCw size={13} /> New Job</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Left panel ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Step 1: Target role */}
          <div className="card" style={{ padding: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>
              <PenLine size={13} style={{ color: "var(--red)" }} /> 1. Target Role
            </div>

            <div className="form-stack">
              {savedJobs.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Pull from saved job</label>
                  <select
                    className="select"
                    value=""
                    onChange={async (e) => {
                      const id = e.target.value;
                      if (!id) return;
                      try {
                        const full = await api.getJob(id);
                        if (full.company_name) setTargetCompany(full.company_name);
                        if (full.position) setTargetPosition(full.position);
                        if (full.jd_text) setTargetJd(full.jd_text);
                        if (full.jd_url) setJdUrl(full.jd_url);
                        setTrackerJobId(id);
                        setOriginalTex(full.tex_content || "");
                      } catch (e) { toast.error(e.message); }
                    }}
                  >
                    <option value="">— select a saved job to fill JD —</option>
                    {[...savedJobs]
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                      .map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.company_name} — {j.position}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input className="input" value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} placeholder="Google" />
                </div>
                <div className="form-group">
                  <label className="form-label">Position</label>
                  <input className="input" value={targetPosition} onChange={(e) => setTargetPosition(e.target.value)} placeholder="Senior Engineer" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">JD URL</label>
                <div className="flex gap-2">
                  <input className="input" style={{ flex: 1 }} value={jdUrl} onChange={(e) => setJdUrl(e.target.value)} placeholder="https://..." />
                  <button className="btn btn-secondary btn-sm" onClick={fetchJd} disabled={fetchingJd}>
                    {fetchingJd ? <span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> : <ExternalLink size={13} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <label className="form-label">Job Description</label>
                  <div className="flex gap-1">
                    {extractingKw && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>extracting keywords…</span>}
                    <button className="btn btn-ghost btn-sm" onClick={analyzeJD} disabled={analyzingJD || !targetJd.trim()}>
                      {analyzingJD ? <span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> : <Zap size={11} />}
                      Analyse JD
                    </button>
                  </div>
                </div>
                <textarea className="textarea" rows={7} value={targetJd} onChange={(e) => setTargetJd(e.target.value)} placeholder="Paste job description here…" style={{ minHeight: 140 }} />
              </div>
            </div>
          </div>

          {/* JD Analysis */}
          {jdAnalysis && (
            <div className="card" style={{ padding: 14 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>JD Analysis · {jdAnalysis.job_title}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div className="keyword-label">ATS KEYWORDS</div>
                  {jdAnalysis.ats_keywords?.slice(0, 10).map((k) => <span key={k} className="keyword-chip chip-t1">{k}</span>)}
                </div>
                <div>
                  <div className="keyword-label">TECHNICAL SKILLS</div>
                  {jdAnalysis.technical_skills?.slice(0, 10).map((k) => <span key={k} className="keyword-chip chip-t3">{k}</span>)}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: CV Source */}
          <div className="card" style={{ padding: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>
              <FileText size={13} style={{ color: "var(--red)" }} /> 2. Resume Source
            </div>

            <div className="flex gap-2" style={{ marginBottom: 12 }}>
              {[["load", "Load from tracker"], ["upload", "Upload PDF"], ["paste", "Paste LaTeX"]].map(([val, lbl]) => (
                <button
                  key={val}
                  className={`btn btn-sm ${source === val ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setSource(val)}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {source === "load" && (
              <CvPicker
                onLoad={loadJob}
                loadedJobId={loadedJobId}
                targetJd={targetJd}
                tex={tex}
                selectedCvIds={selectedCvIds}
                onToggleSelect={toggleCvSelection}
                onSimilarLoaded={(jobs) => setSimilarJobs(jobs)}
                onStarredLoaded={(jobs) => setStarredJobs(jobs)}
                cvRankings={cvRankings}
                onAnalyseFit={handleAnalyseFit}
                analysingFit={analysingFit}
              />
            )}

            {source === "upload" && (
              <div>
                <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFileUpload} />
                <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => fileInputRef.current.click()}>
                  <Upload size={14} /> Choose PDF
                </button>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  Text will be extracted and loaded into the editor
                </div>
              </div>
            )}

            {source === "paste" && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Paste your LaTeX directly into the editor on the right.
              </div>
            )}
          </div>

          {/* Keyword gap */}
          {keywords && <KeywordGap keywords={keywords} missingKeywords={missingKeywords} />}
        </div>

        {/* ── Right panel ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Prompt builder */}
          <div className="card" style={{ padding: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>
              <Clipboard size={13} style={{ color: "var(--red)" }} /> Prompt Builder
            </div>
            <BuildPromptButton
              targetCompany={targetCompany}
              targetPosition={targetPosition}
              targetJd={targetJd}
              atsResult={atsResult}
              similarJobs={similarJobs}
              starredJobs={starredJobs}
              selectedCvIds={selectedCvIds}
              cvRankings={cvRankings}
              recommendedProjects={recommendedProjects}
              onLoadBase={loadJob}
              missingKeywords={missingKeywords}
              directTex={tex}
              disabled={!targetJd.trim()}
            />
          </div>

          {/* LaTeX editor */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                LaTeX Editor
                {jobId && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--success)" }}><CheckCircle size={11} style={{ display: "inline", marginRight: 3 }} />Saved</span>}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(tex); toast.success("Copied"); }} disabled={!tex}>
                  <Copy size={12} /> Copy
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setTex("")} disabled={!tex}>
                  <X size={12} /> Clear
                </button>
              </div>
            </div>
            <div style={{ padding: 12 }}>
              <textarea
                className="code-editor"
                value={tex}
                onChange={(e) => setTex(e.target.value)}
                style={{ minHeight: 480 }}
                placeholder="Load a CV from the left panel, upload a PDF, or paste your LaTeX here…"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="card" style={{ padding: 14 }}>
            <div className="section-label" style={{ marginBottom: 10 }}>ACTIONS</div>
            <div className="flex gap-2 flex-wrap">
              <button className="btn btn-secondary" onClick={scoreAts} disabled={scoring || !tex.trim() || !targetJd.trim()}>
                {scoring ? <span className="spinner" style={{ borderTopColor: "var(--red)" }} /> : <Zap size={14} />}
                Score ATS
              </button>
              <div style={{ width: "100%", height: 1, background: "var(--border)", margin: "4px 0" }} />
              <button className="btn btn-secondary" onClick={() => save("not applied")} disabled={saving || !tex.trim()}>
                {saving ? <span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> : <Save size={14} />}
                Save to Tracker
              </button>
              <button className="btn btn-primary" onClick={() => save("applied")} disabled={saving || !tex.trim()}>
                {saving ? <span className="spinner" /> : <CheckCircle size={14} />}
                Save & Mark Applied
              </button>
            </div>
          </div>

          {/* ATS Result */}
          {atsResult && (
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>ATS ANALYSIS</div>
              <AtsResult result={atsResult} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
