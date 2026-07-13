import { useState } from "react";
import { Zap, Copy, CheckCircle, ExternalLink, FileText, AlertCircle, TrendingUp, GitCompare, User, ChevronDown, ChevronRight, Gauge, ListTree, Calculator, Save, Send } from "lucide-react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

const STEPS = [
  { id: "jd", crumb: "Analyse JD", label: "Analysing job description..." },
  { id: "content", crumb: "Tailor content", label: "Generating tailored bullets from gold points..." },
  { id: "latex", crumb: "Assemble LaTeX", label: "Assembling LaTeX resume..." },
  { id: "benchmark", crumb: "Benchmark", label: "ChatGPT is building the ideal-candidate benchmark..." },
  { id: "compare", crumb: "Compare", label: "Comparing your resume against the benchmark..." },
];

function ProgressView({ currentStep }) {
  const idx = STEPS.findIndex((s) => s.id === currentStep);
  return (
    <div className="card">
      <div className="progress-breadcrumb">
        {STEPS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={s.id} className="crumb-wrap">
              <div className={`crumb ${active ? "active" : done ? "done" : ""}`}>
                {done ? (
                  <CheckCircle size={13} />
                ) : active ? (
                  <span className="spinner" style={{ borderTopColor: "var(--red)", width: 12, height: 12, borderWidth: 2 }} />
                ) : (
                  <span className="crumb-dot" />
                )}
                {s.crumb}
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={13} className="crumb-sep" />}
            </div>
          );
        })}
      </div>
      <div className="progress-caption">{STEPS[idx]?.label}</div>
    </div>
  );
}

function Accordion({ title, icon, defaultOpen = false, children }) {
  return (
    <details className="accordion" open={defaultOpen}>
      <summary className="accordion-summary">
        <span className="accordion-title">{icon}{title}</span>
        <ChevronDown size={15} className="accordion-chevron" />
      </summary>
      <div className="accordion-body">{children}</div>
    </details>
  );
}

const SEVERITY_ORDER = { critical: 0, moderate: 1, minor: 2 };

function BenchmarkResume({ ideal }) {
  return (
    <div>
      {ideal.candidate_title && <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{ideal.candidate_title}</div>}
      {ideal.summary && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, marginTop: 6 }}>{ideal.summary}</div>}

      {ideal.skills_data && Object.keys(ideal.skills_data).length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="section-label">SKILLS</div>
          {Object.entries(ideal.skills_data).map(([cat, skills]) => (
            <div key={cat} className="keyword-group">
              <div className="keyword-label">{cat}</div>
              <div>{(Array.isArray(skills) ? skills : []).map((s) => <span key={s} className="keyword-chip chip-t3">{s}</span>)}</div>
            </div>
          ))}
        </div>
      )}

      {ideal.experience?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="section-label">EXPERIENCE</div>
          {ideal.experience.map((exp, i) => (
            <div key={i} style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                {exp.title}{exp.company ? ` · ${exp.company}` : ""}{exp.duration ? ` · ${exp.duration}` : ""}
              </div>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {(exp.bullets || []).map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {ideal.projects?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="section-label">PROJECTS</div>
          {ideal.projects.map((proj, i) => (
            <div key={i} style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{proj.name}</div>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {(proj.bullets || []).map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {ideal.certifications?.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text)" }}>Certifications:</strong> {ideal.certifications.join(", ")}
        </div>
      )}
      {ideal.education && (
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text)" }}>Education:</strong> {ideal.education}
        </div>
      )}
    </div>
  );
}

function GapReportContent({ gapReport }) {
  const gaps = [...(gapReport.gaps || [])].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 1) - (SEVERITY_ORDER[b.severity] ?? 1)
  );
  const counts = gaps.reduce((acc, g) => ({ ...acc, [g.severity]: (acc[g.severity] || 0) + 1 }), {});

  return (
    <div>
      <div className="gap-counts">
        {gapReport.match_score != null && (
          <span className="gap-pill" style={{ borderColor: "var(--border2)" }}>
            <strong>{gapReport.match_score}</strong>/100 benchmark match
          </span>
        )}
        <span className="gap-pill critical"><strong>{counts.critical || 0}</strong> critical</span>
        <span className="gap-pill moderate"><strong>{counts.moderate || 0}</strong> moderate</span>
        <span className="gap-pill minor"><strong>{counts.minor || 0}</strong> minor</span>
      </div>

      {gapReport.summary && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 14 }}>
          {gapReport.summary}
        </div>
      )}

      {gaps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {gaps.map((gap, i) => (
            <div key={i} className="gap-row">
              <span className={`gap-severity ${gap.severity}`}>{gap.severity}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{gap.skill}</div>
                {gap.detail && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{gap.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {gapReport.skills_to_work_on?.length > 0 && (
        <div className="keyword-group">
          <div className="keyword-label">Skills to work on</div>
          <div>{gapReport.skills_to_work_on.map((s) => <span key={s} className="keyword-chip chip-t3">{s}</span>)}</div>
        </div>
      )}

      {gapReport.matched_strengths?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="section-label">WHERE YOU MATCH THE BENCHMARK</div>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            {gapReport.matched_strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function ResultSections({ result }) {
  const toast = useToast();
  const { tex_content, tailored_content, gap_report, ideal_resume, analyzed_jd, request } = result;
  const [atsReport, setAtsReport] = useState(result.ats_report?.ats_score ? result.ats_report : null);
  const [recalcing, setRecalcing] = useState(false);
  const [savedJob, setSavedJob] = useState(null);
  const [saving, setSaving] = useState(null); // "not applied" | "applied" while a save is in flight
  const score = atsReport?.ats_score || tailored_content?.ats_score;
  const jdText = request?.jd_text || analyzed_jd?.clean_text || "";

  async function recalculateAts() {
    setRecalcing(true);
    try {
      if (savedJob?.id) {
        // Already stored — persist the fresh score on the saved row too.
        const { ats_report } = await api.recalculateAts(savedJob.id);
        setAtsReport(ats_report);
      } else {
        const report = await api.scoreAts({ resume_tex: tex_content, jd_text: jdText });
        setAtsReport(report);
      }
      toast.success("ATS recalculated");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRecalcing(false);
    }
  }

  async function saveToDb(status) {
    setSaving(status);
    try {
      const { job } = await api.saveGenerated({
        company_name: request?.company_name || "",
        position: request?.position || "",
        jd_text: jdText,
        jd_url: request?.jd_url || null,
        jd_analysis: analyzed_jd,
        tailored_content,
        tex_content,
        ats_score: score ?? null,
        gap_analysis: gap_report?.summary || atsReport?.gap_analysis_report || tailored_content?.gap_analysis_report || null,
        ideal_resume: ideal_resume || null,
        gap_report: gap_report && !gap_report.error ? gap_report : null,
        status,
      });
      setSavedJob(job);
      toast.success(`Saved to tracker as "${status}"`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex-col gap-3">
      {/* Actions */}
      <div className="flex gap-2 items-center">
        {tex_content && (
          <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(tex_content); toast.success("LaTeX copied"); }}>
            <Copy size={14} /> Copy LaTeX
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: savedJob ? "var(--success)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          {savedJob
            ? <><CheckCircle size={14} /> Saved to tracker · {savedJob.status}</>
            : <><AlertCircle size={14} /> Not saved yet</>}
        </span>
      </div>

      {/* 1. Generated LaTeX — the only section open by default */}
      {tex_content && (
        <Accordion title="Generated LaTeX" icon={<FileText size={14} />} defaultOpen>
          <textarea
            className="code-editor"
            readOnly
            value={tex_content}
            style={{ minHeight: 400, width: "100%" }}
          />
        </Accordion>
      )}

      {/* 2. Ideal-candidate benchmark resume, rendered as formatted text */}
      {ideal_resume && (
        <Accordion title="Ideal Candidate Resume (Benchmark)" icon={<User size={14} />}>
          <BenchmarkResume ideal={ideal_resume} />
        </Accordion>
      )}

      {/* 3. Gap analysis */}
      {gap_report && !gap_report.error && (
        <Accordion title="Gap Analysis vs Ideal Candidate" icon={<GitCompare size={14} />}>
          <GapReportContent gapReport={gap_report} />
        </Accordion>
      )}
      {gap_report?.error && (
        <Accordion title="Gap Analysis vs Ideal Candidate" icon={<AlertCircle size={14} style={{ color: "var(--warning)" }} />} defaultOpen>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            The ideal-candidate comparison failed for this run ({gap_report.error}). Your resume was generated and saved normally.
          </div>
        </Accordion>
      )}
      {!gap_report && tailored_content?.gap_analysis_report && (
        <Accordion title="Gap Analysis" icon={<AlertCircle size={14} />}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {tailored_content.gap_analysis_report}
          </div>
        </Accordion>
      )}

      {/* 4. Overview & score */}
      <Accordion title="Overview & ATS Score" icon={<Gauge size={14} />}>
        <div className="flex items-center gap-4">
          {score != null && (
            <div style={{ textAlign: "center", minWidth: 90 }}>
              <div className={`ats-score-big ${score >= 75 ? "high" : score >= 50 ? "mid" : "low"}`}>{score}</div>
              <div className="ats-label">
                ATS Score
                {atsReport?.must_have_total > 0 && (
                  <> · {atsReport.must_have_matched}/{atsReport.must_have_total} must-haves</>
                )}
              </div>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              {tailored_content?.target_title || request?.position}
            </div>
            {tailored_content?.summary && (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {tailored_content.summary}
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-secondary btn-sm" onClick={recalculateAts} disabled={recalcing}>
            {recalcing ? <span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> : <Calculator size={13} />}
            {recalcing ? "Recalculating..." : "Recalculate ATS"}
          </button>
          <span style={{ marginLeft: 10, fontSize: 11, color: "var(--text-muted)" }}>
            Must-have skills matched ÷ total must-haves × 100
          </span>
        </div>
      </Accordion>

      {/* 5. Skills selected */}
      {tailored_content?.skills_data && Object.keys(tailored_content.skills_data).length > 0 && (
        <Accordion title="Skills Selected" icon={<TrendingUp size={14} />}>
          {Object.entries(tailored_content.skills_data).map(([cat, skills]) => (
            <div key={cat} className="keyword-group">
              <div className="keyword-label">{cat}</div>
              <div>{skills.map((s) => <span key={s} className="keyword-chip chip-t3">{s}</span>)}</div>
            </div>
          ))}
        </Accordion>
      )}

      {/* 6. Bullet reasoning */}
      {tailored_content?.bullet_reasoning && Object.keys(tailored_content.bullet_reasoning).length > 0 && (
        <Accordion title="Bullet Reasoning" icon={<ListTree size={14} />}>
          {Object.entries(tailored_content.bullet_reasoning).map(([role, reasons]) => (
            <div key={role} style={{ marginBottom: 12 }}>
              <div className="section-label">{role.toUpperCase()}</div>
              {(Array.isArray(reasons) ? reasons : []).map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, paddingLeft: 8, borderLeft: "2px solid var(--border)" }}>
                  {r}
                </div>
              ))}
            </div>
          ))}
        </Accordion>
      )}

      {/* Save to database — nothing is stored until one of these is pressed */}
      <div className="card">
        {savedJob ? (
          <div style={{ fontSize: 12, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle size={14} /> Saved to tracker as "{savedJob.status}". Recalculating ATS now updates the saved row too.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 12 }}>
              Happy with the resume and the ATS score? Recalculate as often as you like — nothing is stored until you save.
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={() => saveToDb("applied")} disabled={saving !== null}>
                {saving === "applied" ? <span className="spinner" /> : <Send size={14} />}
                Add to Tracker as Applied
              </button>
              <button className="btn btn-secondary" onClick={() => saveToDb("not applied")} disabled={saving !== null}>
                {saving === "not applied" ? <span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> : <Save size={14} />}
                Save for Later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function GeneratePage() {
  const toast = useToast();
  const [form, setForm] = useState({ company_name: "", position: "", jd_text: "", jd_url: "" });
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [result, setResult] = useState(null);
  const [fetchingJD, setFetchingJD] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function fetchJD() {
    if (!form.jd_url.trim()) return toast.error("Enter a URL first");
    setFetchingJD(true);
    try {
      const { jd_text } = await api.fetchJD(form.jd_url);
      set("jd_text", jd_text);
      toast.success("JD fetched successfully");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFetchingJD(false);
    }
  }

  async function generate() {
    if (!form.company_name.trim() || !form.position.trim()) return toast.error("Company and position required");
    if (!form.jd_text.trim()) return toast.error("Job description required");

    setLoading(true);
    setResult(null);

    // Simulate step progression
    const stepIds = STEPS.map((s) => s.id);
    let stepIdx = 0;
    setCurrentStep(stepIds[0]);

    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, stepIds.length - 1);
      setCurrentStep(stepIds[stepIdx]);
    }, 8000); // advance every 8s (generation takes ~30s)

    try {
      const data = await api.generateResume({
        company_name: form.company_name,
        position: form.position,
        jd_text: form.jd_text,
        jd_url: form.jd_url || null,
      });
      clearInterval(stepTimer);
      setResult({ ...data, request: { ...form }, generated_at: Date.now() });
      toast.success(`Resume generated for ${form.company_name} — review it, then save`);
    } catch (e) {
      clearInterval(stepTimer);
      toast.error(e.message);
    } finally {
      setLoading(false);
      setCurrentStep(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Generate Resume</h1>
        <p className="page-subtitle">AI-tailored resume from your gold points, shaped for the specific job description</p>
      </div>

      <div className="generate-centered flex-col gap-3">
        {/* Progress — above the form while generating */}
        {loading && currentStep && <ProgressView currentStep={currentStep} />}

        {/* Form */}
        <div className="card">
          <div className="card-title"><Zap size={14} style={{ color: "var(--red)" }} /> Job Details</div>
          <div className="form-stack">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Company</label>
                <input className="input" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Google" disabled={loading} />
              </div>
              <div className="form-group">
                <label className="form-label required">Position</label>
                <input className="input" value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="Senior Data Engineer" disabled={loading} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">JD URL (optional)</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={form.jd_url}
                  onChange={(e) => set("jd_url", e.target.value)}
                  placeholder="https://linkedin.com/jobs/..."
                  disabled={loading}
                />
                <button className="btn btn-secondary btn-sm" onClick={fetchJD} disabled={fetchingJD || loading}>
                  {fetchingJD ? <span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> : <ExternalLink size={13} />}
                  Fetch
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Job Description</label>
              <textarea
                className="textarea"
                rows={10}
                value={form.jd_text}
                onChange={(e) => set("jd_text", e.target.value)}
                placeholder="Paste the full job description here..."
                disabled={loading}
                style={{ minHeight: 220 }}
              />
            </div>

            <button className="btn btn-primary btn-lg w-full" onClick={generate} disabled={loading}>
              {loading ? <span className="spinner" /> : <Zap size={16} />}
              {loading ? "Generating..." : "Generate Resume"}
            </button>
          </div>
        </div>

        {/* Results — under the form */}
        {result && !loading && <ResultSections key={result.generated_at} result={result} />}

        {/* Info box — only while idle with no result */}
        {!result && !loading && (
          <div style={{
            background: "var(--red-dim)",
            border: "1px solid var(--red-border)",
            borderRadius: "var(--radius)",
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>How it works</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              1. Gemini analyses the JD for must-have skills and keywords<br />
              2. Reads your gold points (professional experience + projects)<br />
              3. Generates tailored bullets and assembles the LaTeX resume<br />
              4. ChatGPT builds the ideal candidate's resume from the JD alone<br />
              5. Your resume is compared against it — gaps listed, resume untouched<br />
              6. Review the result, recalculate ATS if you like, then save it yourself
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
