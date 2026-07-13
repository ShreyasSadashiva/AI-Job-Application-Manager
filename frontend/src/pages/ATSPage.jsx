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
      <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: score == null ? 32 : 36, fontWeight: 700, color, letterSpacing: -1 }}>
          {score == null ? "—" : score}
        </div>
        {score != null && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>/ 100</div>}
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
            onClick={(e) => { e.stopPropagation(); onClear(); }}
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
  const hasJd = Boolean(job.jd_text?.trim());
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        {!hasJd && (
          <span style={{ fontSize: 10, color: "var(--warning)", background: "var(--warning-dim)", padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>
            NO JD
          </span>
        )}
        {selected && <CheckCircle size={14} style={{ color: "var(--red)" }} />}
      </div>
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

  function selectJob(job) {
    setSelectedJob((prev) => prev?.id === job.id ? null : job);
    setResult(null);
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
        <div>
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
        </div>

        {/* Right — upload + result */}
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

          {result && (
            <div className="card" style={{ padding: 24 }}>
              <div className="card-title" style={{ marginBottom: 20, textAlign: "center" }}>Semantic Match Result</div>
              <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <ScoreRing score={result.semantic_score} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                  <div className="stat-label">Resume text</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>
                    {result.resume_chars.toLocaleString()} chars
                  </div>
                </div>
                <div style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                  <div className="stat-label">JD text</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>
                    {result.jd_chars.toLocaleString()} chars
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                Cosine similarity: <strong style={{ color: "var(--text-secondary)" }}>{result.similarity}</strong>
              </div>

              <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {result.semantic_score >= 70
                  ? "Your resume is semantically well-aligned with this job description."
                  : result.semantic_score >= 45
                  ? "There's moderate alignment — consider incorporating more JD-specific language and keywords into your resume."
                  : "Low semantic overlap detected. Review the JD carefully and tailor your resume to use similar vocabulary and highlight relevant experience."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
