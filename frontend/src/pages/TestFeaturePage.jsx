import { useState } from "react";
import { FlaskConical, ChevronRight, CheckCircle, Copy, AlertTriangle, User, ShieldCheck, GitCompare, FileText, ExternalLink } from "lucide-react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

const STEPS = [
  { id: "jd_voice", crumb: "Analyse JD + Voice", label: "Analysing job description and voice profile in parallel..." },
  { id: "write", crumb: "Write (V3)", label: "Writing voice-calibrated bullets with V3 prompt..." },
  { id: "critique", crumb: "Critique & Rewrite", label: "Critiquing bullets and rewriting weak ones..." },
  { id: "latex", crumb: "Assemble LaTeX", label: "Assembling final resume..." },
];

const VOICE_PLACEHOLDER = `Write in your own words, like you're explaining your job to a friend.
Don't worry about sounding professional — the rougher and more honest, the better.

Example:
"At LTIMindtree I basically rebuilt the whole data pipeline from scratch — nobody else wanted to touch it because it kept breaking. I was pretty proud of the batching logic I came up with. My manager signed it off without changes which was unusual.

At Tepiche I helped with reporting mostly, wrote some SQL queries and built a few dashboards. It was pretty straightforward work, I don't think I owned anything major there."`;

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
                {done
                  ? <CheckCircle size={13} />
                  : active
                  ? <span className="spinner" style={{ borderTopColor: "var(--red)", width: 12, height: 12, borderWidth: 2 }} />
                  : <span className="crumb-dot" />}
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

function Chip({ children, color = "var(--text-secondary)", bg = "var(--surface2)" }) {
  return (
    <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 4, background: bg, color, fontWeight: 500, display: "inline-block", margin: "2px 3px" }}>
      {children}
    </span>
  );
}

function Section({ icon, title, children, defaultOpen = false }) {
  return (
    <details className="accordion" open={defaultOpen}>
      <summary className="accordion-summary">
        <span className="accordion-title">{icon}{title}</span>
        <span className="accordion-chevron" style={{ fontSize: 13, color: "var(--text-muted)" }}>▾</span>
      </summary>
      <div className="accordion-body">{children}</div>
    </details>
  );
}

// ── Voice Profile Card ────────────────────────────────────────────────────────

function VoiceProfileSection({ voice }) {
  const roles = voice.roles || {};
  const ownershipColor = (level) =>
    level === "primary" ? "var(--success)" :
    level === "contributor" ? "var(--warning)" : "var(--text-muted)";

  return (
    <Section icon={<User size={14} />} title="Voice Profile (Pass 0)" defaultOpen>
      {voice.overall_narrative && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          <div className="stat-label" style={{ marginBottom: 6 }}>Career Narrative</div>
          {voice.overall_narrative}
        </div>
      )}
      {voice.strongest_achievement && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--success-dim)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          <div className="stat-label" style={{ marginBottom: 6, color: "var(--success)" }}>Strongest Achievement</div>
          {voice.strongest_achievement}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {Object.entries(roles).map(([roleKey, role]) => (
          <div key={roleKey} style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10, textTransform: "capitalize" }}>
              {roleKey === "ltimindtree" ? "LTIMindtree" : "Tepiche International"}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--surface3)", color: ownershipColor(role.ownership_level), fontWeight: 600 }}>
                {role.ownership_level}
              </span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--surface3)", color: role.confidence_signal === "undersells" ? "var(--warning)" : "var(--text-muted)", fontWeight: 600 }}>
                {role.confidence_signal}
              </span>
            </div>

            {role.proud_of?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div className="stat-label" style={{ marginBottom: 4 }}>Proud of</div>
                {role.proud_of.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, display: "flex", gap: 6 }}>
                    <span style={{ color: "var(--success)" }}>✓</span>{p}
                  </div>
                ))}
              </div>
            )}

            {role.assert_more_on?.length > 0 && (
              <div>
                <div className="stat-label" style={{ marginBottom: 4 }}>Assert more on</div>
                {role.assert_more_on.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--warning)", lineHeight: 1.6, display: "flex", gap: 6 }}>
                    <span>→</span>{a}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Validation Checks Card ────────────────────────────────────────────────────

function ValidationSection({ checks }) {
  if (!checks) return null;
  const pass = (v) => v === "PASS";
  return (
    <Section icon={<ShieldCheck size={14} />} title="Validation Checks (V3 Self-Audit)">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          ["Voice Calibration", checks.voice_calibration_applied],
          ["Tilde Check", checks.tilde_check],
          ["Version", checks.version_applied],
          ["Skills Count", checks.total_skills_count],
        ].map(([label, val]) => (
          <div key={label} style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: pass(val) ? "var(--success)" : val === "FAIL" ? "var(--red)" : "var(--text)" }}>
              {String(val)}
            </span>
          </div>
        ))}
      </div>

      {checks.jd_keywords_unmatched?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="stat-label" style={{ marginBottom: 6 }}>Unmatched JD Keywords</div>
          {checks.jd_keywords_unmatched.map((k) => <Chip key={k} color="var(--red)" bg="var(--red-dim)">{k}</Chip>)}
        </div>
      )}

      {checks.door_test_failures?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="stat-label" style={{ marginBottom: 6 }}>Door Test Failures Fixed</div>
          {checks.door_test_failures.map((k, i) => <Chip key={i} color="var(--warning)" bg="var(--warning-dim)">{k}</Chip>)}
        </div>
      )}

      {checks.skills_removed_for_defendability?.length > 0 && (
        <div>
          <div className="stat-label" style={{ marginBottom: 6 }}>Skills Removed (not defensible)</div>
          {checks.skills_removed_for_defendability.map((k) => <Chip key={k}>{k}</Chip>)}
        </div>
      )}
    </Section>
  );
}

// ── Critique Card ─────────────────────────────────────────────────────────────

function CritiqueSection({ critique, tailoredRaw }) {
  if (!critique) return null;
  const reviewed = critique.reviewed_bullets || {};
  const allRoles = [
    { key: "tepiche", label: "Tepiche International" },
    { key: "ltimindtree", label: "LTIMindtree" },
  ];
  const totalWeak = [...(reviewed.tepiche || []), ...(reviewed.ltimindtree || [])]
    .filter((b) => b.rating === "WEAK").length;

  return (
    <Section icon={<GitCompare size={14} />} title={`Critique & Rewrite (${totalWeak} bullet${totalWeak !== 1 ? "s" : ""} rewritten)`}>
      {critique.summary_of_fixes && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          {critique.summary_of_fixes}
        </div>
      )}
      {allRoles.map(({ key, label }) => {
        const bullets = reviewed[key] || [];
        if (!bullets.length) return null;
        return (
          <div key={key} style={{ marginBottom: 16 }}>
            <div className="stat-label" style={{ marginBottom: 8 }}>{label.toUpperCase()}</div>
            {bullets.map((b, i) => (
              <div key={i} style={{
                marginBottom: 8, padding: "10px 12px", borderRadius: "var(--radius-sm)",
                border: `1px solid ${b.rating === "WEAK" ? "var(--red-border)" : "var(--border)"}`,
                background: b.rating === "WEAK" ? "var(--surface2)" : "var(--surface)",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, flexShrink: 0, marginTop: 1,
                    background: b.rating === "WEAK" ? "var(--red-dim)" : "var(--success-dim)",
                    color: b.rating === "WEAK" ? "var(--red)" : "var(--success)",
                  }}>
                    {b.rating}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: b.rating === "WEAK" ? "var(--text-muted)" : "var(--text-secondary)", lineHeight: 1.6, textDecoration: b.rating === "WEAK" ? "line-through" : "none" }}>
                      {b.original}
                    </div>
                    {b.failure_reason && (
                      <div style={{ fontSize: 11, color: "var(--red)", marginTop: 3 }}>↳ {b.failure_reason}</div>
                    )}
                    {b.rewritten && (
                      <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6, lineHeight: 1.6 }}>
                        ✓ {b.rewritten}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </Section>
  );
}

// ── Result ────────────────────────────────────────────────────────────────────

function ResultSections({ result }) {
  const toast = useToast();
  const { tex_content, voice_profile, tailored_final, tailored_raw, critique, ats_report } = result;
  const checks = tailored_final?.validation_checks;
  const score = ats_report?.ats_score;

  return (
    <div className="flex-col gap-3">
      <div className="flex gap-2 items-center">
        {score != null && (
          <span style={{ fontSize: 13, fontWeight: 600, color: score >= 75 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--red)" }}>
            ATS {score}
          </span>
        )}
        {tex_content && (
          <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(tex_content); toast.success("LaTeX copied"); }}>
            <Copy size={13} /> Copy LaTeX
          </button>
        )}
      </div>

      {voice_profile && <VoiceProfileSection voice={voice_profile} />}
      {checks && <ValidationSection checks={checks} />}
      {critique && <CritiqueSection critique={critique} tailoredRaw={tailored_raw} />}

      {tex_content && (
        <Section icon={<FileText size={14} />} title="Final Resume (LaTeX)" defaultOpen>
          <textarea
            className="code-editor"
            readOnly
            value={tex_content}
            style={{ minHeight: 400, width: "100%" }}
          />
        </Section>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TestFeaturePage() {
  const toast = useToast();
  const [form, setForm] = useState({ company_name: "", position: "", jd_text: "", jd_url: "", candidate_voice: "" });
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
      toast.success("JD fetched");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFetchingJD(false);
    }
  }

  async function generate() {
    if (!form.company_name.trim() || !form.position.trim()) return toast.error("Company and position required");
    if (!form.jd_text.trim()) return toast.error("Job description required");
    if (!form.candidate_voice.trim()) return toast.error("Voice description required — write how you'd explain your work to a friend");

    setLoading(true);
    setResult(null);

    const stepIds = STEPS.map((s) => s.id);
    let idx = 0;
    setCurrentStep(stepIds[0]);
    // V3 is slower — 4 steps, ~90s total, advance every 20s
    const timer = setInterval(() => {
      idx = Math.min(idx + 1, stepIds.length - 1);
      setCurrentStep(stepIds[idx]);
    }, 20000);

    try {
      const data = await api.generateResumeV3({
        company_name: form.company_name,
        position: form.position,
        jd_text: form.jd_text,
        jd_url: form.jd_url || null,
        candidate_voice: form.candidate_voice,
      });
      clearInterval(timer);
      setResult({ ...data, _ts: Date.now() });
      toast.success("V3 resume generated");
    } catch (e) {
      clearInterval(timer);
      toast.error(e.message);
    } finally {
      setLoading(false);
      setCurrentStep(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FlaskConical size={20} style={{ color: "var(--red)" }} /> Test Feature
        </h1>
        <p className="page-subtitle">
          3-pass V3 pipeline: Voice analysis → Voice-calibrated write → Critique & rewrite
        </p>
      </div>

      <div className="generate-centered flex-col gap-3">
        {loading && currentStep && <ProgressView currentStep={currentStep} />}

        <div className="card">
          <div className="card-title"><FlaskConical size={14} style={{ color: "var(--red)" }} /> Job Details</div>
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
                <input className="input" style={{ flex: 1 }} value={form.jd_url} onChange={(e) => set("jd_url", e.target.value)} placeholder="https://..." disabled={loading} />
                <button className="btn btn-secondary btn-sm" onClick={fetchJD} disabled={fetchingJD || loading}>
                  {fetchingJD ? <span className="spinner" style={{ borderTopColor: "var(--red)", borderWidth: 2 }} /> : <ExternalLink size={13} />}
                  Fetch
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Job Description</label>
              <textarea className="textarea" rows={8} value={form.jd_text} onChange={(e) => set("jd_text", e.target.value)} placeholder="Paste the full job description here..." disabled={loading} style={{ minHeight: 160 }} />
            </div>

            <div className="form-group">
              <label className="form-label required">Your Raw Voice Description</label>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                Describe your work at each role in plain, honest language — like you're telling a friend. No polish needed.
                The V3 pipeline reads this to calibrate ownership level, confidence, and what to lead with in your bullets.
              </div>
              <textarea
                className="textarea"
                rows={10}
                value={form.candidate_voice}
                onChange={(e) => set("candidate_voice", e.target.value)}
                placeholder={VOICE_PLACEHOLDER}
                disabled={loading}
                style={{ minHeight: 220, fontFamily: "inherit" }}
              />
            </div>

            <button className="btn btn-primary btn-lg w-full" onClick={generate} disabled={loading}>
              {loading ? <span className="spinner" /> : <FlaskConical size={16} />}
              {loading ? "Running V3 pipeline..." : "Run V3 Pipeline"}
            </button>
          </div>
        </div>

        {result && !loading && <ResultSections key={result._ts} result={result} />}

        {!result && !loading && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>How V3 differs from the standard pipeline</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.9 }}>
              <span style={{ color: "var(--red)", fontWeight: 600 }}>Pass 0 (Voice):</span> Reads your raw self-description to extract ownership level, confidence signals, and what you're proud of<br />
              <span style={{ color: "var(--red)", fontWeight: 600 }}>Pass 1 (Write):</span> V3 prompt uses the voice profile to lead each role section with proud-of items, match verb tiers to ownership level, and assert more where you undersell<br />
              <span style={{ color: "var(--red)", fontWeight: 600 }}>Pass 2 (Critique):</span> A second LLM reads every bullet and rewrites those that fail the door test, lack a metric, or have a voice mismatch
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
