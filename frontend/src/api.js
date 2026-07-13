/**
 * API client for ApplyFlow v2 backend.
 * All endpoints are under /api/*
 */

const BASE = "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Health
  health: () => request("/health"),

  // JD
  fetchJD: (url) => request("/api/fetch-jd", { method: "POST", body: JSON.stringify({ url }) }),

  // Resume generation
  generateResume: (data) => request("/api/generate/resume", { method: "POST", body: JSON.stringify(data) }),

  // Jobs CRUD
  getJobs: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.has_resume !== undefined) q.set("has_resume", params.has_resume);
    return request(`/api/jobs${q.toString() ? "?" + q : ""}`);
  },
  getJob: (id) => request(`/api/jobs/${id}`),
  createManualJob: (data) => request("/api/jobs/manual", { method: "POST", body: JSON.stringify(data) }),
  updateJob: (id, data) => request(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteJob: (id) => request(`/api/jobs/${id}`, { method: "DELETE" }),

  // Resume save
  saveResume: (data) => request("/api/jobs/save-resume", { method: "POST", body: JSON.stringify(data) }),

  // PDF
  getPdfUrl: (jobId) => `${BASE}/api/jobs/${jobId}/pdf`,

  // ATS
  scoreAts: (data) => request("/api/ats/score", { method: "POST", body: JSON.stringify(data) }),
  recalculateAts: (jobId) => request(`/api/jobs/${jobId}/recalculate-ats`, { method: "POST" }),

  // JD Analysis
  analyzeJD: (jd_text) => request("/api/analyze/jd", { method: "POST", body: JSON.stringify({ jd_text }) }),

  // Insights
  getInsights: () => request("/api/insights"),
};
