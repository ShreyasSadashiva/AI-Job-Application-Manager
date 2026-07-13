import { useEffect, useState } from "react";
import { BarChart3, RefreshCw, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

const SEVERITY_COLORS = {
  critical: "var(--red)",
  moderate: "var(--warning)",
  minor: "var(--info)",
};

const STATUS_COLORS = {
  "not applied": "var(--text-muted)",
  applied: "var(--info)",
  interviewing: "var(--warning)",
  offered: "var(--success)",
  rejected: "var(--red)",
  withdrawn: "var(--border2)",
};

function HBarChart({ items, color = "var(--red)" }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="hbar-chart">
      {items.map(({ label, count, barColor }) => (
        <div key={label} className="hbar-row">
          <div className="hbar-label" title={label}>{label}</div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(count / max) * 100}%`, background: barColor || color }} />
          </div>
          <div className="hbar-count">{count}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, centerLabel, centerSub }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" width="150" height="150">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--surface3)" strokeWidth="16" />
        {total > 0 && segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * C;
          const el = (
            <circle
              key={i}
              cx="70" cy="70" r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" fill="var(--text)" fontSize="24" fontWeight="700">{centerLabel}</text>
        <text x="70" y="86" textAnchor="middle" fill="var(--text-muted)" fontSize="10">{centerSub}</text>
      </svg>
      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="legend-row">
            <span className="legend-dot" style={{ background: seg.color }} />
            <span className="legend-label">{seg.label}</span>
            <span className="legend-value">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyChart({ months }) {
  const max = Math.max(...months.map((m) => m.count), 1);
  return (
    <div className="vbar-chart">
      {months.map(({ month, count }) => (
        <div key={month} className="vbar-col">
          <div className="vbar-value">{count}</div>
          <div className="vbar-track">
            <div className="vbar-fill" style={{ height: `${(count / max) * 100}%` }} />
          </div>
          <div className="vbar-label">{month.slice(2)}</div>
        </div>
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setData(await api.getInsights());
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="result-placeholder"><span className="spinner" style={{ borderTopColor: "var(--red)" }} /> Loading insights...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <div className="result-placeholder">
          <BarChart3 size={40} />
          <div style={{ fontWeight: 600, marginTop: 12 }}>Insights unavailable</div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={load}><RefreshCw size={13} /> Retry</button>
        </div>
      </div>
    );
  }

  const severitySegments = Object.entries(data.severity_counts || {}).map(([sev, value]) => ({
    label: sev, value, color: SEVERITY_COLORS[sev] || "var(--border2)",
  }));
  const statusSegments = Object.entries(data.status_counts || {})
    .sort((a, b) => b[1] - a[1])
    .map(([st, value]) => ({ label: st, value, color: STATUS_COLORS[st] || "var(--border2)" }));

  const skillItems = (data.skills_to_work_on || []).map(({ skill, count }) => ({ label: skill, count }));

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Insights</h1>
          <p className="page-subtitle">Where your resumes fall short of the ideal candidate — and what to work on next</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>

      {/* Numbers */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Jobs Tracked</div>
          <div className="stat-value">{data.total_jobs}</div>
          <div className="stat-sub">{data.jobs_with_gap_reports} with benchmark analysis</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Interviews</div>
          <div className="stat-value">{data.interviews}</div>
          <div className="stat-sub">
            {data.total_jobs > 0 ? `${Math.round((data.interviews / data.total_jobs) * 100)}% of tracked jobs` : "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg ATS Score</div>
          <div className="stat-value">{data.avg_ats_score ?? "—"}</div>
          <div className="stat-sub">across scored resumes</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-label">Gaps Identified</div>
          <div className="stat-value">{data.total_gaps}</div>
          <div className="stat-sub">{data.severity_counts?.critical || 0} critical</div>
        </div>
      </div>

      {data.jobs_with_gap_reports === 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            No benchmark analyses yet. Generate a resume and the gap comparison against the ideal candidate will start feeding this page.
          </div>
        </div>
      )}

      <div className="insights-grid">
        {/* Skills to work on */}
        <div className="card">
          <div className="card-title"><Target size={14} style={{ color: "var(--red)" }} /> Top Skills to Work On</div>
          {skillItems.length > 0
            ? <HBarChart items={skillItems} />
            : <div className="chart-empty">No skill gaps recorded yet</div>}
        </div>

        {/* Gaps by severity */}
        <div className="card">
          <div className="card-title"><AlertTriangle size={14} style={{ color: "var(--warning)" }} /> Gaps by Severity</div>
          {data.total_gaps > 0
            ? <DonutChart segments={severitySegments} centerLabel={data.total_gaps} centerSub="total gaps" />
            : <div className="chart-empty">No gaps recorded yet</div>}
        </div>

        {/* Status distribution */}
        <div className="card">
          <div className="card-title"><BarChart3 size={14} style={{ color: "var(--info)" }} /> Application Status</div>
          {statusSegments.length > 0
            ? <DonutChart segments={statusSegments} centerLabel={data.total_jobs} centerSub="jobs" />
            : <div className="chart-empty">No jobs tracked yet</div>}
        </div>

        {/* Applications over time */}
        <div className="card">
          <div className="card-title"><TrendingUp size={14} style={{ color: "var(--success)" }} /> Applications per Month</div>
          {data.monthly_applications?.length > 0
            ? <MonthlyChart months={data.monthly_applications} />
            : <div className="chart-empty">No applications yet</div>}
        </div>
      </div>
    </div>
  );
}
