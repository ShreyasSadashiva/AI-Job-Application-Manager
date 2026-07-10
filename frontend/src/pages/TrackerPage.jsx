import { useState, useEffect, useCallback } from "react";
import {
  Trash2, Eye, ExternalLink, Plus, Search, Star, Download,
  Briefcase, FileText, TrendingUp, Award, X, ChevronDown, Copy, RefreshCw,
} from "lucide-react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

const STATUSES = ["not applied", "applied", "interviewing", "offered", "rejected", "withdrawn"];

function statusClass(s) {
  return "badge badge-" + (s || "applied").replace(/\s+/g, "-");
}

function AtsDisplay({ score }) {
  if (score == null) return <span className="ats-badge ats-none">—</span>;
  const cls = score >= 75 ? "high" : score >= 50 ? "mid" : "low";
  return <span className={`ats-badge ats-${cls}`}>{score}</span>;
}

function ModelBadge({ model }) {
  if (!model) return null;
  const short = model.includes("claude") ? "Claude" : model.includes("manual") ? "Manual" : "AI";
  return (
    <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--surface2)", padding: "2px 6px", borderRadius: 4 }}>
      {short}
    </span>
  );
}

// ── Job Detail Modal ─────────────────────────────────────────────────────────

function JobDetailModal({ job, onClose, onUpdate }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [tex, setTex] = useState(job.tex_content || "");
  const [pdfB64, setPdfB64] = useState(null);
  const [compiling, setCompiling] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [atsResult, setAtsResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (job.tex_content && activeTab === "resume") {
      // Auto-load PDF from storage
      setPdfB64(null);
    }
  }, [activeTab, job.tex_content]);

  async function compile() {
    if (!tex.trim()) return toast.error("No LaTeX content");
    setCompiling(true);
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

  async function scoreAts() {
    if (!tex.trim()) return toast.error("No LaTeX content");
    if (!job.jd_text) return toast.error("No JD text stored for this job");
    setScoring(true);
    try {
      const result = await api.scoreAts({ resume_tex: tex, jd_text: job.jd_text });
      setAtsResult(result);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setScoring(false);
    }
  }

  async function saveTex() {
    setSaving(true);
    try {
      await api.updateJob(job.id, { tex_content: tex });
      toast.success("Saved");
      onUpdate();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function downloadPdf() {
    if (!pdfB64) return;
    const a = document.createElement("a");
    a.href = `data:application/pdf;base64,${pdfB64}`;
    a.download = `Shreyas_Achary_CV_${job.company_name}_${job.position}.pdf`;
    a.click();
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    job.tex_content && { id: "resume", label: "Resume" },
    job.jd_analysis && { id: "jd", label: "JD Analysis" },
  ].filter(Boolean);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{job.company_name} — {job.position}</div>
            <div className="modal-subtitle">
              <span className={statusClass(job.status)}>{job.status || "applied"}</span>
              {job.ats_score != null && (
                <span style={{ marginLeft: 8 }}>ATS: <strong style={{ color: job.ats_score >= 75 ? "var(--success)" : job.ats_score >= 50 ? "var(--warning)" : "var(--red)" }}>{job.ats_score}</strong></span>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="tabs" style={{ margin: "0 0 16px" }}>
          {tabs.map((t) => (
            <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="flex-col gap-4">
            <div className="three-col">
              <div className="card" style={{ padding: 14 }}>
                <div className="stat-label">ATS Score</div>
                <div className="stat-value" style={{ fontSize: 32, color: job.ats_score >= 75 ? "var(--success)" : job.ats_score >= 50 ? "var(--warning)" : "var(--red)" }}>
                  {job.ats_score ?? "—"}
                </div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div className="stat-label">Model</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "var(--text)" }}>{job.model_used || "—"}</div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div className="stat-label">Created</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "var(--text)" }}>
                  {job.created_at ? new Date(job.created_at).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>

            {job.gap_analysis && (
              <div className="card" style={{ padding: 14 }}>
                <div className="card-title">Gap Analysis</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {job.gap_analysis}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {job.tex_content && (
                <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(job.tex_content); toast.success("LaTeX copied"); }}>
                  <Copy size={13} /> Copy LaTeX
                </button>
              )}
              {job.jd_url && (
                <a href={job.jd_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                  <ExternalLink size={13} /> View JD
                </a>
              )}
            </div>
          </div>
        )}

        {activeTab === "resume" && (
          <div>
            <div className="flex gap-2 mb-3" style={{ marginBottom: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={compile} disabled={compiling}>
                {compiling ? <span className="spinner" /> : null} Compile
              </button>
              <button className="btn btn-secondary btn-sm" onClick={scoreAts} disabled={scoring}>
                {scoring ? <span className="spinner" /> : null} Score ATS
              </button>
              <button className="btn btn-secondary btn-sm" onClick={saveTex} disabled={saving}>
                {saving ? <span className="spinner" /> : null} Save
              </button>
              {pdfB64 && (
                <button className="btn btn-secondary btn-sm" onClick={downloadPdf}>
                  <Download size={13} /> Download PDF
                </button>
              )}
            </div>

            {atsResult && (
              <div className="ats-result-card" style={{ marginBottom: 12 }}>
                <div className="flex items-center gap-3">
                  <div>
                    <div className={`ats-score-big ${atsResult.ats_score >= 75 ? "high" : atsResult.ats_score >= 50 ? "mid" : "low"}`}>
                      {atsResult.ats_score}
                    </div>
                    <div className="ats-label">ATS Score · {atsResult.must_have_matched}/{atsResult.must_have_total} must-haves</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {atsResult.true_gaps?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>TRUE GAPS</div>
                        {atsResult.true_gaps.map((g) => <span key={g} className="gap-tag gap-true">{g}</span>)}
                      </div>
                    )}
                    {atsResult.bridged_gaps?.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>BRIDGED</div>
                        {atsResult.bridged_gaps.map((g) => <span key={g} className="gap-tag gap-bridged">{g}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                {atsResult.improvement_suggestions?.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>IMPROVEMENTS</div>
                    {atsResult.improvement_suggestions.map((s, i) => (
                      <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>• {s}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="two-col" style={{ gap: 12 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 6 }}>LATEX</div>
                <textarea className="code-editor" value={tex} onChange={(e) => setTex(e.target.value)} />
              </div>
              <div>
                <div className="section-label" style={{ marginBottom: 6 }}>PDF PREVIEW</div>
                {pdfB64 ? (
                  <iframe
                    className="pdf-frame"
                    src={`data:application/pdf;base64,${pdfB64}`}
                    style={{ height: 500, border: "1px solid var(--border)", borderRadius: 6 }}
                  />
                ) : (
                  <div className="result-placeholder" style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div>
                      <FileText size={32} style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
                      <div style={{ fontSize: 12 }}>Click Compile to preview PDF</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "jd" && job.jd_analysis && (
          <div className="flex-col gap-3">
            <div className="card" style={{ padding: 14 }}>
              <div className="card-title">Role Overview</div>
              <div className="three-col" style={{ gap: 10 }}>
                <div>
                  <div className="section-label">JOB TITLE</div>
                  <div style={{ fontSize: 13, color: "var(--text)", marginTop: 4 }}>{job.jd_analysis.job_title}</div>
                </div>
                <div>
                  <div className="section-label">SENIORITY</div>
                  <div style={{ fontSize: 13, color: "var(--text)", marginTop: 4 }}>{job.jd_analysis.seniority_level}</div>
                </div>
                <div>
                  <div className="section-label">TONE</div>
                  <div style={{ fontSize: 13, color: "var(--text)", marginTop: 4 }}>{job.jd_analysis.tone}</div>
                </div>
              </div>
            </div>

            {job.jd_analysis.ats_keywords?.length > 0 && (
              <div className="card" style={{ padding: 14 }}>
                <div className="card-title">ATS Keywords</div>
                <div>{job.jd_analysis.ats_keywords.map((k) => <span key={k} className="keyword-chip chip-t1">{k}</span>)}</div>
              </div>
            )}

            {job.jd_analysis.requirements?.length > 0 && (
              <div className="card" style={{ padding: 14 }}>
                <div className="card-title">Requirements</div>
                <table className="table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Skill / Responsibility</th>
                      <th>Priority</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.jd_analysis.requirements.map((r, i) => (
                      <tr key={i}>
                        <td>{r.skill_or_responsibility}</td>
                        <td>
                          <span style={{ color: r.priority === "must-have" ? "var(--red)" : "var(--text-secondary)", fontSize: 11, fontWeight: 600 }}>
                            {r.priority}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>{r.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Job Modal ─────────────────────────────────────────────────────────────

function AddJobModal({ onClose, onAdded }) {
  const toast = useToast();
  const [form, setForm] = useState({ company_name: "", position: "", jd_url: "", jd_text: "", status: "not applied" });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.company_name.trim() || !form.position.trim()) return toast.error("Company and Position required");
    setLoading(true);
    try {
      const { job } = await api.createManualJob(form);
      toast.success(`Added ${job.company_name}`);
      onAdded(job);
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Job Manually</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="form-stack">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Company</label>
              <input className="input" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Google" />
            </div>
            <div className="form-group">
              <label className="form-label required">Position</label>
              <input className="input" value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="Senior Engineer" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">JD URL</label>
              <input className="input" value={form.jd_url} onChange={(e) => set("jd_url", e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Job Description</label>
            <textarea className="textarea" rows={4} value={form.jd_text} onChange={(e) => set("jd_text", e.target.value)} placeholder="Paste job description here..." />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <Plus size={14} />} Add Job
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main TrackerPage ──────────────────────────────────────────────────────────

export default function TrackerPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "resume"
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      const params = {};
      if (activeTab === "resume") params.has_resume = true;
      if (statusFilter) params.status = statusFilter;
      const { jobs: data } = await api.getJobs(params);
      setJobs(data || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchJobs();
  }, [fetchJobs]);

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return !q || j.company_name?.toLowerCase().includes(q) || j.position?.toLowerCase().includes(q);
  });

  const stats = {
    total: jobs.length,
    withResume: jobs.filter((j) => j.tex_content).length,
    applied: jobs.filter((j) => j.status === "applied").length,
    interviewing: jobs.filter((j) => j.status === "interviewing").length,
  };

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await api.deleteJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast.success("Deleted");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await api.updateJob(id, { status });
      setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status } : j));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleStar(id, current) {
    const next = !current;
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, is_favourite: next } : j));
    try {
      await api.updateJob(id, { is_favourite: next });
    } catch (e) {
      toast.error(e.message);
      setJobs((prev) => prev.map((j) => j.id === id ? { ...j, is_favourite: current } : j));
    }
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Job Tracker</h1>
          <p className="page-subtitle">Track every application and resume you've generated</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => { setLoading(true); fetchJobs(); }}>
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Applications</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-label">Resume Generated</div>
          <div className="stat-value">{stats.withResume}</div>
          <div className="stat-sub">with AI-tailored resume</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Applied</div>
          <div className="stat-value">{stats.applied}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Interviewing</div>
          <div className="stat-value">{stats.interviewing}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
          All Jobs <span className="tab-count">{jobs.length}</span>
        </button>
        <button className={`tab ${activeTab === "resume" ? "active" : ""}`} onClick={() => setActiveTab("resume")}>
          Resume Generated <span className="tab-count">{stats.withResume}</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={14} />
          <input
            className="search-input"
            placeholder="Search company or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select" style={{ width: 150 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading jobs...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <Briefcase size={32} />
            <div style={{ marginTop: 8, fontWeight: 600 }}>No jobs found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Add a job or generate a resume to get started</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th>Company / Role</th>
                <th>ATS</th>
                <th>Status</th>
                <th>Model</th>
                <th>Date</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onStar={handleStar}
                  onView={() => setSelectedJob(job)}
                  deleting={deletingId === job.id}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdate={() => { fetchJobs(); setSelectedJob(null); }}
        />
      )}
      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onAdded={(job) => setJobs((prev) => [job, ...prev])}
        />
      )}
    </div>
  );
}

function JobRow({ job, onDelete, onStatusChange, onStar, onView, deleting }) {
  const [status, setStatus] = useState(job.status || "not applied");
  const [statusOpen, setStatusOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  function changeStatus(s) {
    setStatus(s);
    setStatusOpen(false);
    onStatusChange(job.id, s);
  }

  const hasResume = Boolean(job.tex_content);

  return (
    <tr>
      <td>
        <button
          onClick={() => onStar(job.id, job.is_favourite)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 2,
            color: job.is_favourite ? "var(--warning)" : "var(--text-muted)",
          }}
        >
          <Star size={14} fill={job.is_favourite ? "currentColor" : "none"} />
        </button>
      </td>
      <td>
        <div className="company-cell">
          <div className="company-name">
            {job.company_name}
            {hasResume && (
              <span style={{ marginLeft: 6, fontSize: 10, color: "var(--red)", background: "var(--red-dim)", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                RESUME
              </span>
            )}
          </div>
          <div className="position-name">{job.position}</div>
        </div>
      </td>
      <td><AtsDisplay score={job.ats_score} /></td>
      <td>
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            className="flex items-center gap-1"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onClick={() => setStatusOpen((o) => !o)}
          >
            <span className={statusClass(status)}>{status}</span>
            <ChevronDown size={11} style={{ color: "var(--text-muted)" }} />
          </button>
          {statusOpen && (
            <div style={{
              position: "absolute", top: "100%", left: 0, zIndex: 10,
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 6, padding: 4, minWidth: 140, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: s === status ? "var(--red-dim)" : "none",
                    border: "none", padding: "6px 10px", cursor: "pointer",
                    fontSize: 12, color: s === status ? "var(--red)" : "var(--text)",
                    borderRadius: 4,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td><ModelBadge model={job.model_used} /></td>
      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
        {job.created_at ? new Date(job.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
      </td>
      <td>
        <div className="action-row">
          <button className="btn btn-ghost btn-icon" title="View details" onClick={onView}>
            <Eye size={14} />
          </button>
          {job.jd_url && (
            <a href={job.jd_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon" title="Open JD">
              <ExternalLink size={14} />
            </a>
          )}
          {confirmDel ? (
            <>
              <button className="btn btn-danger btn-sm" onClick={() => { onDelete(job.id); setConfirmDel(false); }} disabled={deleting}>
                {deleting ? <span className="spinner" style={{ borderTopColor: "var(--red)" }} /> : "Yes"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(false)}>No</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-icon" title="Delete" onClick={() => setConfirmDel(true)}>
              <Trash2 size={14} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
