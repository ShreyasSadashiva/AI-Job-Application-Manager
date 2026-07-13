import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, FileText, Search, X, CheckCircle, AlertCircle, Minus } from "lucide-react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

const STATUSES = ["saved", "applied", "not applied", "interviewing", "offered", "rejected", "withdrawn"];

function ScoreRing({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const filled = score == null ? 0 : (score / 100) * circumference;
  const color = score == null ? "var(--border2)" : score >= 70 ? "var(--success)" : score >= 45 ? "var(--warning)" : "var(--red)";
  const label = score == null ? "—" : score >= 70 ? "Strong match" : score >= 45 ? "Moderate match" : "Weak match";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: 132, height: 132 }}>
        <svg width={132} height={132} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={66} cy={66} r={radius} fill="none" stroke="var(--surface3)" strokeWidth={10} />
          <circle
            cx={66} cy={66} r={radius} fill="none"
            stroke={color} strokeWidth={10}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: score == null ? 32 : 36, fontWeight: 700, color, letterSpacing: -1 }}>
            {score == null ? "—" : score}
          </div>
          {score != null && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>/ 100</div>}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function DropZone({ file, onFile, onClear }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") onFile(dropped);
  }

  return (
    <div
      onClick={() => !file && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? "var(--red)" : file ? "var(--success)" : "var(--border2)"}`,
        borderRadius: "var(--radius)",
        padding: "32px 24px",
        textAlign: "center",
        cursor: file ? "default" : "pointer",
        transition: "border-color 0.15s ease",
        background: dragging ? "var(--red-dim)" : file ? "var(--success-dim)" : "var(--surface)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      {file ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <FileText size={20} style={{ color: "var(--success)" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{file.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); inputRef.current.value = ""; onClear(); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", marginLeft: 4 }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div>
          <Upload size={24} style={{ color: "var(--text-muted)", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Drop your resume PDF here</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>or click to browse</div>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 14px",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${selected ? "var(--red)" : "var(--border)"}`,
        background: selected ? "var(--red-dim)" : "var(--surface2)",
        cursor: "pointer",
        transition: "all 0.12s ease",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {job.company_name}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {job.position}
        </div>
      </div>
      {selected && <CheckCircle size={14} style={{ color: "var(--red)", flexShrink: 0 }} />}
    </div>
  );
}

export default function ATSPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [file, setFile] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState(null);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const { jobs: data } = await api.getJobs();
      setJobs(data || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return !q || j.company_name?.toLowerCase().includes(q) || j.position?.toLowerCase().includes(q);
  });

  async function selectJob(job) {
    if (selectedJob?.id === job.id) {
      setSelectedJob(null);
      setResult(null);
      return;
    }
    setResult(null);
    // List view omits jd_text — fetch the full record so we have it for scoring
    try {
      const full = await api.getJob(job.id);
      setSelectedJob(full);
    } catch {
      setSelectedJob(job);
    }
  }

  async function runScore() {
    if (!file) return toast.error("Upload a PDF resume first");
    if (!selectedJob) return toast.error("Select a job to match against");
    if (!selectedJob.jd_text?.trim()) return toast.error("The selected job has no stored JD text");

    setScoring(true);
    setResult(null);
    try {
      const data = await api.semanticAts(file, selectedJob.id);
      setResult(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setScoring(false);
    }
  }

  const canRun = file && selectedJob && selectedJob.jd_text?.trim() && !scoring;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">ATS Semantic Scorer</h1>
        <p className="page-subtitle">
          Measure how closely your resume matches a job description using OpenAI embeddings + cosine similarity
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Left — job selector */}
        <div className="card" style={{ padding: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>1. Select a Job</div>
          <div className="search-wrap" style={{ maxWidth: "100%", marginBottom: 12 }}>
            <Search size={14} />
            <input
              className="search-input"
              placeholder="Search company or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 380, overflowY: "auto" }}>
            {loadingJobs ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                <div className="spinner" style={{ margin: "0 auto 8px" }} />
                Loading jobs...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>
                No jobs found
              </div>
            ) : (
              filtered.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={selectedJob?.id === job.id}
                  onClick={() => selectJob(job)}
                />
              ))
            )}
          </div>
          {selectedJob && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--surface3)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--text-secondary)" }}>
              Selected: <strong style={{ color: "var(--text)" }}>{selectedJob.company_name} — {selectedJob.position}</strong>
              {!selectedJob.jd_text?.trim() && (
                <div style={{ marginTop: 4, color: "var(--warning)", display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={11} /> No JD stored for this job — score unavailable
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — upload + run button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>2. Upload Resume PDF</div>
            <DropZone file={file} onFile={(f) => { setFile(f); setResult(null); }} onClear={() => { setFile(null); setResult(null); }} />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "12px 0" }}
            disabled={!canRun}
            onClick={runScore}
          >
            {scoring ? <><span className="spinner" style={{ borderTopColor: "#fff" }} /> Scoring...</> : "Run Semantic ATS Score"}
          </button>
        </div>
      </div>

      {/* Result — full width, centered */}
      {result && (
        <div style={{ marginTop: 28, maxWidth: 760, marginLeft: "auto", marginRight: "auto" }}>
          <div className="card" style={{ padding: 32 }}>
            <div className="card-title" style={{ marginBottom: 24, textAlign: "center", fontSize: 16 }}>Semantic Match Result</div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <ScoreRing score={result.semantic_score} />
            </div>

            {result.gap_analysis?.summary && (
              <div style={{ marginBottom: 24, padding: "12px 16px", background: "var(--surface2)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, textAlign: "center" }}>
                {result.gap_analysis.summary}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              {result.gap_analysis?.matched_areas?.length > 0 && (
                <div>
                  <div className="stat-label" style={{ marginBottom: 10 }}>What you cover well</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.gap_analysis.matched_areas.map((a) => (
                      <span key={a} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 4, background: "var(--success-dim)", color: "var(--success)", fontWeight: 500 }}>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.gap_analysis?.missing_keywords?.length > 0 && (
                <div>
                  <div className="stat-label" style={{ marginBottom: 10 }}>Missing or underrepresented</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.gap_analysis.missing_keywords.map((k) => (
                      <span key={k} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 4, background: "var(--red-dim)", color: "var(--red)", fontWeight: 500 }}>
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {result.gap_analysis?.bridge_suggestions?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div className="stat-label" style={{ marginBottom: 12 }}>How to bridge the gap</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.gap_analysis.bridge_suggestions.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, padding: "10px 14px", background: "var(--surface2)", borderRadius: "var(--radius-sm)" }}>
                      <span style={{ color: "var(--red)", fontWeight: 700, flexShrink: 0 }}>→</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", justifyContent: "center", gap: 24, fontSize: 11, color: "var(--text-muted)" }}>
              <span>Resume: {result.resume_chars.toLocaleString()} chars</span>
              <span>JD: {result.jd_chars.toLocaleString()} chars</span>
              <span>Cosine similarity: {result.similarity}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
