import { useState, useEffect } from "react";
import {
  PenLine, ExternalLink, Copy, Download, CheckCircle, AlertCircle, X,
  Zap, Save, FileText, Search, ChevronRight,
} from "lucide-react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

// ── ATS Result Display ────────────────────────────────────────────────────────

function AtsResult({ result }) {
  if (!result) return null;
  const { ats_score, must_have_matched, must_have_total, matched_skills, true_gaps, bridged_gaps, improvement_suggestions, gap_analysis_report } = result;
  const cls = ats_score >= 75 ? "high" : ats_score >= 50 ? "mid" : "low";

  return (
    <div className="ats-result-card">
      <div className="flex items-center gap-4">
        <div style={{ textAlign: "center" }}>
          <div className={`ats-score-big ${cls}`}>{ats_score}</div>
          <div className="ats-label">ATS Score</div>
          {must_have_total > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {must_have_matched}/{must_have_total} must-haves
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          {matched_skills?.length > 0 && (
            <div className="ats-gaps">
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>MATCHED</div>
              {matched_skills.slice(0, 8).map((g) => <span key={g} className="gap-tag gap-matched">{g}</span>)}
              {matched_skills.length > 8 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}> +{matched_skills.length - 8}</span>}
            </div>
          )}
          {true_gaps?.length > 0 && (
            <div className="ats-gaps">
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>TRUE GAPS</div>
              {true_gaps.map((g) => <span key={g} className="gap-tag gap-true">{g}</span>)}
            </div>
          )}
          {bridged_gaps?.length > 0 && (
            <div className="ats-gaps">
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>BRIDGED</div>
              {bridged_gaps.map((g) => <span key={g} className="gap-tag gap-bridged">{g}</span>)}
            </div>
          )}
        </div>
      </div>

      {improvement_suggestions?.length > 0 && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>IMPROVEMENTS</div>
          {improvement_suggestions.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 5, display: "flex", gap: 6 }}>
              <ChevronRight size={12} style={{ flexShrink: 0, marginTop: 2, color: "var(--red)" }} />
              {s}
            </div>
          ))}
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

// ── Load from Tracker Modal ───────────────────────────────────────────────────

function LoadJobModal({ onClose, onLoad }) {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getJobs({ has_resume: true })
      .then(({ jobs }) => setJobs(jobs || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return !q || j.company_name?.toLowerCase().includes(q) || j.position?.toLowerCase().includes(q);
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Load from Tracker</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="search-wrap" style={{ marginBottom: 14 }}>
          <Search size={14} />
          <input className="search-input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="loading-state" style={{ padding: 30 }}>
            <div className="spinner" style={{ borderTopColor: "var(--red)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", fontSize: 13 }}>
            No jobs with resume found
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
            {filtered.map((j) => (
              <button
                key={j.id}
                onClick={() => onLoad(j)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 6, padding: "10px 14px", cursor: "pointer",
                  textAlign: "left", transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--red)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{j.company_name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{j.position}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {j.ats_score != null && (
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                      background: j.ats_score >= 75 ? "var(--success-dim)" : j.ats_score >= 50 ? "var(--warning-dim)" : "var(--red-dim)",
                      color: j.ats_score >= 75 ? "var(--success)" : j.ats_score >= 50 ? "var(--warning)" : "var(--red)",
                    }}>
                      {j.ats_score}
                    </span>
                  )}
                  <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ManualEditPage ───────────────────────────────────────────────────────

export default function ManualEditPage() {
  const toast = useToast();

  // Job context
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [jobId, setJobId] = useState(null);

  // Editor
  const [tex, setTex] = useState("");

  // State
  const [fetchingJD, setFetchingJD] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzingJD, setAnalyzingJD] = useState(false);

  // Results
  const [pdfB64, setPdfB64] = useState(null);
  const [atsResult, setAtsResult] = useState(null);
  const [jdAnalysis, setJdAnalysis] = useState(null);

  // Modals
  const [showLoadModal, setShowLoadModal] = useState(false);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleFetchJD() {
    if (!jdUrl.trim()) return toast.error("Enter a URL");
    setFetchingJD(true);
    try {
      const { jd_text } = await api.fetchJD(jdUrl);
      setJdText(jd_text);
      toast.success("JD fetched");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFetchingJD(false);
    }
  }

  async function handleAnalyzeJD() {
    if (!jdText.trim()) return toast.error("No JD text");
    setAnalyzingJD(true);
    try {
      const result = await api.analyzeJD(jdText);
      setJdAnalysis(result);
      toast.success("JD analysed");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAnalyzingJD(false);
    }
  }

  async function handleCompile() {
    if (!tex.trim()) return toast.error("No LaTeX content");
    setCompiling(true);
    setPdfB64(null);
    try {
      const { pdf_b64 } = await api.compileLatex(tex);
      setPdfB64(pdf_b64);
      toast.success("Compiled successfully");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCompiling(false);
    }
  }

  async function handleScoreAts() {
    if (!tex.trim()) return toast.error("No LaTeX content");
    if (!jdText.trim()) return toast.error("No JD text — paste the JD above");
    setScoring(true);
    try {
      const result = await api.scoreAts({ resume_tex: tex, jd_text: jdText });
      setAtsResult(result);
      toast.success(`ATS score: ${result.ats_score}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setScoring(false);
    }
  }

  async function handleCompileAndScore() {
    if (!tex.trim()) return toast.error("No LaTeX content");
    if (!jdText.trim()) return toast.error("No JD text");
    setCompiling(true);
    setScoring(true);
    setPdfB64(null);
    try {
      const [compileRes, scoreRes] = await Promise.all([
        api.compileLatex(tex),
        api.scoreAts({ resume_tex: tex, jd_text: jdText }),
      ]);
      setPdfB64(compileRes.pdf_b64);
      setAtsResult(scoreRes);
      toast.success(`Done · ATS: ${scoreRes.ats_score}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCompiling(false);
      setScoring(false);
    }
  }

  async function handleSave(status = "not applied") {
    if (!tex.trim()) return toast.error("No LaTeX to save");
    if (!companyName.trim() || !position.trim()) return toast.error("Company and position required");
    setSaving(true);
    try {
      const { job } = await api.saveResume({
        job_id: jobId || undefined,
        company_name: companyName,
        position,
        jd_text: jdText,
        jd_url: jdUrl || undefined,
        tex_content: tex,
        ats_score: atsResult?.ats_score,
        gap_analysis: atsResult?.gap_analysis_report,
        status,
      });
      setJobId(job.id);
      toast.success(`Saved${job.id !== jobId ? " — new job created" : ""}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleLoadJob(job) {
    setJobId(job.id);
    setCompanyName(job.company_name || "");
    setPosition(job.position || "");
    setJdUrl(job.jd_url || "");
    setShowLoadModal(false);
    // Fetch full job for tex_content and jd_text
    api.getJob(job.id).then((full) => {
      setTex(full.tex_content || "");
      setJdText(full.jd_text || "");
      if (full.jd_analysis) setJdAnalysis(full.jd_analysis);
      toast.success(`Loaded: ${job.company_name}`);
    }).catch((e) => toast.error(e.message));
  }

  function downloadPdf() {
    if (!pdfB64) return;
    const a = document.createElement("a");
    a.href = `data:application/pdf;base64,${pdfB64}`;
    a.download = `Shreyas_Achary_CV_${companyName || "Resume"}_${position || ""}.pdf`;
    a.click();
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Manual Edit</h1>
          <p className="page-subtitle">Edit LaTeX, score ATS, compile PDF — full control over your resume</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowLoadModal(true)}>
          <Search size={13} /> Load from Tracker
        </button>
      </div>

      {/* Top: Job context */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title"><PenLine size={14} style={{ color: "var(--red)" }} /> Job Context</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label">Company</label>
            <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Google" />
          </div>
          <div className="form-group">
            <label className="form-label">Position</label>
            <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Senior Engineer" />
          </div>
          <div className="form-group">
            <label className="form-label">JD URL</label>
            <div className="flex gap-2">
              <input className="input" value={jdUrl} onChange={(e) => setJdUrl(e.target.value)} placeholder="https://..." style={{ flex: 1 }} />
              <button className="btn btn-secondary btn-sm" onClick={handleFetchJD} disabled={fetchingJD}>
                {fetchingJD ? <span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> : <ExternalLink size={13} />}
              </button>
            </div>
          </div>
          {jobId && (
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 1 }}>
              <span style={{ fontSize: 11, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
                <CheckCircle size={12} /> Linked
              </span>
            </div>
          )}
        </div>

        <div className="form-group">
          <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
            <label className="form-label">Job Description</label>
            <button className="btn btn-ghost btn-sm" onClick={handleAnalyzeJD} disabled={analyzingJD || !jdText.trim()}>
              {analyzingJD ? <span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> : <Zap size={12} />}
              Analyse JD
            </button>
          </div>
          <textarea className="textarea" rows={5} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste job description here..." />
        </div>
      </div>

      {/* JD Analysis keywords (if available) */}
      {jdAnalysis && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 10 }}>JD Analysis · {jdAnalysis.job_title}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <div className="keyword-label">ATS KEYWORDS</div>
              {jdAnalysis.ats_keywords?.slice(0, 12).map((k) => <span key={k} className="keyword-chip chip-t1">{k}</span>)}
            </div>
            <div>
              <div className="keyword-label">TECHNICAL SKILLS</div>
              {jdAnalysis.technical_skills?.slice(0, 10).map((k) => <span key={k} className="keyword-chip chip-t3">{k}</span>)}
            </div>
            <div>
              <div className="keyword-label">ACTION VERBS</div>
              {jdAnalysis.key_action_verbs?.slice(0, 10).map((k) => <span key={k} className="keyword-chip chip-t2">{k}</span>)}
            </div>
          </div>
        </div>
      )}

      {/* Main editor area */}
      <div className="edit-layout">
        {/* LaTeX Editor */}
        <div className="edit-left">
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>LaTeX Editor</div>
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
                style={{ minHeight: 520 }}
                placeholder="Paste your LaTeX resume here, or load from tracker / generate a resume first..."
                spellCheck={false}
              />
            </div>
          </div>

          {/* Action bar */}
          <div className="card" style={{ padding: 14 }}>
            <div className="section-label" style={{ marginBottom: 10 }}>ACTIONS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="btn btn-primary" onClick={handleCompile} disabled={compiling || !tex.trim()}>
                {compiling ? <span className="spinner" /> : <FileText size={14} />}
                Compile PDF
              </button>
              <button className="btn btn-secondary" onClick={handleScoreAts} disabled={scoring || !tex.trim() || !jdText.trim()}>
                {scoring ? <span className="spinner" style={{ borderTopColor: "var(--red)" }} /> : <Zap size={14} />}
                Score ATS
              </button>
              <button className="btn btn-secondary" onClick={handleCompileAndScore} disabled={compiling || scoring || !tex.trim() || !jdText.trim()}>
                {(compiling || scoring) ? <span className="spinner" style={{ borderTopColor: "var(--red)" }} /> : <Zap size={14} />}
                Compile + Score
              </button>
              <div style={{ height: 1, background: "var(--border)", width: "100%", margin: "4px 0" }} />
              <button className="btn btn-secondary" onClick={() => handleSave("not applied")} disabled={saving || !tex.trim()}>
                {saving ? <span className="spinner" style={{ borderTopColor: "var(--red)" }} /> : <Save size={14} />}
                Save to Tracker
              </button>
              <button className="btn btn-primary" onClick={() => handleSave("applied")} disabled={saving || !tex.trim()}>
                {saving ? <span className="spinner" /> : <CheckCircle size={14} />}
                Save & Mark Applied
              </button>
            </div>
          </div>
        </div>

        {/* Right — PDF + ATS */}
        <div className="edit-right">
          {/* PDF Preview */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>PDF Preview</div>
              {pdfB64 && (
                <button className="btn btn-secondary btn-sm" onClick={downloadPdf}>
                  <Download size={12} /> Download
                </button>
              )}
            </div>
            {pdfB64 ? (
              <iframe
                src={`data:application/pdf;base64,${pdfB64}`}
                className="pdf-frame"
                style={{ height: 550, border: "none" }}
              />
            ) : (
              <div className="result-placeholder" style={{ height: 550, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 0 }}>
                <div>
                  <FileText size={32} style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
                  <div style={{ fontSize: 12 }}>Click "Compile PDF" to preview</div>
                </div>
              </div>
            )}
          </div>

          {/* ATS Result */}
          {atsResult && (
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>ATS ANALYSIS</div>
              <AtsResult result={atsResult} />
            </div>
          )}

          {!atsResult && (
            <div className="card" style={{ padding: 14 }}>
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)" }}>
                <AlertCircle size={28} style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
                <div style={{ fontSize: 12 }}>ATS analysis will appear here after scoring</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLoadModal && (
        <LoadJobModal onClose={() => setShowLoadModal(false)} onLoad={handleLoadJob} />
      )}
    </div>
  );
}
