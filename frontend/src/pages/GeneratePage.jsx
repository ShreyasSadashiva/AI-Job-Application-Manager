import { useState } from "react";
import { Zap, Copy, CheckCircle, ExternalLink, FileText, AlertCircle, TrendingUp } from "lucide-react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

const STEPS = [
  { id: "jd", label: "Analysing job description..." },
  { id: "content", label: "Generating tailored bullets from gold points..." },
  { id: "latex", label: "Assembling LaTeX resume..." },
  { id: "review", label: "ChatGPT is reviewing quality and gaps..." },
  { id: "refine", label: "Gemini is refining the resume..." },
  { id: "save", label: "Saving to database..." },
];

function ProgressView({ currentStep }) {
  return (
    <div className="card">
      <div className="card-title">
        <span className="spinner" style={{ borderTopColor: "var(--red)", width: 16, height: 16, borderWidth: 2 }} />
        Generating your resume...
      </div>
      <div className="progress-steps">
        {STEPS.map((s, i) => {
          const idx = STEPS.findIndex((st) => st.id === currentStep);
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={s.id} className={`progress-step ${active ? "active" : done ? "done" : ""}`}>
              {done ? (
                <CheckCircle size={16} className="step-icon" style={{ color: "var(--success)" }} />
              ) : active ? (
                <span className="spinner step-icon" style={{ borderTopColor: "var(--red)", width: 16, height: 16, borderWidth: 2 }} />
              ) : (
                <span className="step-icon" style={{ width: 16, height: 16, border: "2px solid var(--border)", borderRadius: "50%", display: "inline-block" }} />
              )}
              {s.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultPanel({ result }) {
  const toast = useToast();
  const { job, tex_content, tailored_content, quality_review } = result;
  const score = quality_review?.ats_score ?? tailored_content?.ats_score ?? job?.ats_score;

  return (
    <div className="flex-col gap-3">
      {/* Score + summary */}
      <div className="card">
        <div className="flex items-center gap-4">
          {score != null && (
            <div style={{ textAlign: "center", minWidth: 80 }}>
              <div className={`ats-score-big ${score >= 75 ? "high" : score >= 50 ? "mid" : "low"}`}>{score}</div>
              <div className="ats-label">ATS Score</div>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              {tailored_content?.target_title || job?.position}
            </div>
            {tailored_content?.summary && (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {tailored_content.summary}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 items-center">
        {tex_content && (
          <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(tex_content); toast.success("LaTeX copied"); }}>
            <Copy size={14} /> Copy LaTeX
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
          <CheckCircle size={14} /> Saved to tracker
        </span>
      </div>

      {/* LaTeX output */}
      {tex_content && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div className="card-title" style={{ marginBottom: 0 }}><FileText size={14} /> Generated LaTeX</div>
          </div>
          <textarea
            className="code-editor"
            readOnly
            value={tex_content}
            style={{ minHeight: 400, borderRadius: 0, border: "none" }}
          />
        </div>
      )}

      {/* Skills */}
      {tailored_content?.skills_data && Object.keys(tailored_content.skills_data).length > 0 && (
        <div className="card">
          <div className="card-title"><TrendingUp size={14} /> Skills Selected</div>
          {Object.entries(tailored_content.skills_data).map(([cat, skills]) => (
            <div key={cat} className="keyword-group">
              <div className="keyword-label">{cat}</div>
              <div>{skills.map((s) => <span key={s} className="keyword-chip chip-t3">{s}</span>)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Final quality review */}
      {(quality_review?.gap_analysis_report || tailored_content?.gap_analysis_report) && (
        <div className="card">
          <div className="card-title"><AlertCircle size={14} /> Final Quality Review & Gap Analysis</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {quality_review?.gap_analysis_report || tailored_content?.gap_analysis_report}
          </div>
          {quality_review?.improvement_suggestions?.length > 0 && (
            <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              {quality_review.improvement_suggestions.map((suggestion, i) => <li key={i}>{suggestion}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Bullet reasoning */}
      {tailored_content?.bullet_reasoning && Object.keys(tailored_content.bullet_reasoning).length > 0 && (
        <div className="card">
          <div className="card-title">Bullet Reasoning</div>
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
        </div>
      )}
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
      setResult(data);
      toast.success(`Resume generated for ${form.company_name}!`);
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

      <div className="generate-layout">
        {/* Left — Input */}
        <div className="left-panel">
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
                  rows={14}
                  value={form.jd_text}
                  onChange={(e) => set("jd_text", e.target.value)}
                  placeholder="Paste the full job description here..."
                  disabled={loading}
                  style={{ minHeight: 280 }}
                />
              </div>

              <button className="btn btn-primary btn-lg w-full" onClick={generate} disabled={loading}>
                {loading ? <span className="spinner" /> : <Zap size={16} />}
                {loading ? "Generating..." : "Generate Resume"}
              </button>
            </div>
          </div>

          {/* Info box */}
          <div style={{
            background: "var(--red-dim)",
            border: "1px solid var(--red-border)",
            borderRadius: "var(--radius)",
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>How it works</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              1. Claude analyses the JD for must-have skills and keywords<br />
              2. Reads your gold points (professional experience + projects)<br />
              3. Generates tailored bullets aligned to the role's seniority tier<br />
              4. Assembles LaTeX and compiles PDF<br />
              5. Saves everything to your tracker with ATS score
            </div>
          </div>
        </div>

        {/* Right — Results */}
        <div className="right-panel">
          {loading && currentStep && <ProgressView currentStep={currentStep} />}

          {!loading && !result && (
            <div className="result-placeholder">
              <FileText size={40} />
              <div style={{ fontWeight: 600, marginTop: 12 }}>Your resume will appear here</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Fill in the job details and click Generate</div>
            </div>
          )}

          {result && !loading && <ResultPanel result={result} />}
        </div>
      </div>
    </div>
  );
}
