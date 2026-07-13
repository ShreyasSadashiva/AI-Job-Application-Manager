# ApplyFlow v2 — Setup Guide

## 1. Supabase Project

Go to https://supabase.com → New project → note your **Project URL** and **anon key** (Settings → API).

---

## 2. Database Table

Run the following SQL in the **Supabase SQL Editor** (Dashboard → SQL Editor → New query):

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- v2 job applications table (separate from the main ApplyFlow job_applications table)
create table v2_job_applications (
  id            uuid primary key default gen_random_uuid(),

  -- Job info
  company_name  text not null,
  position      text not null,
  jd_url        text,
  jd_text       text not null default '',

  -- AI-generated content (stored as JSON blobs)
  jd_analysis      jsonb,   -- structured output from JD analyser
  tailored_content jsonb,   -- structured output from resume generator

  -- Resume — LaTeX source stored as text, no file storage needed
  tex_content   text,       -- final LaTeX saved when user applies to the job

  -- Scoring
  ats_score     integer,    -- 0–100
  gap_analysis  text,       -- plain-text gap analysis report

  -- Tracking
  status        text not null default 'not applied'
                check (status in (
                  'not applied',
                  'applied',
                  'interviewing',
                  'offered',
                  'rejected',
                  'withdrawn'
                )),
  is_favourite  boolean not null default false,
  got_interview boolean not null default false,
  model_used    text,       -- e.g. "gemini-2.5-flash" or "manual"

  -- Timestamps
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for fast listing (newest first)
create index on v2_job_applications (created_at desc);

-- Auto-update updated_at on every row change
create or replace function v2_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger v2_job_applications_updated_at
before update on v2_job_applications
for each row execute procedure v2_set_updated_at();
```

> No storage bucket is needed. LaTeX is stored as plain text in the `tex_content` column.

---

## 3. Environment Variables

Edit `backend/.env` and fill in:

```
GEMINI_API_KEY=your_gemini_key          # console.cloud.google.com → APIs → Gemini API
OPENAI_API_KEY=your_openai_key          # platform.openai.com → API keys; used for the quality review
SUPABASE_URL=https://xxxx.supabase.co   # Settings → API → Project URL
SUPABASE_KEY=your_supabase_anon_key     # Settings → API → anon public key
```

---

## 4. Run the App

```bash
# Terminal 1 — Backend (from v2shrey/backend/)
pip install -r requirements.txt
uvicorn api:app --port 8001 --reload

# Terminal 2 — Frontend (from v2shrey/frontend/)
npm install
npm run dev
```

Open http://localhost:5175

---

## Column Reference

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key, auto-generated |
| `company_name` | text | Company name |
| `position` | text | Job title |
| `jd_url` | text | Link to the original job posting |
| `jd_text` | text | Full job description text |
| `jd_analysis` | jsonb | Structured JD breakdown (skills, keywords, requirements) |
| `tailored_content` | jsonb | AI-generated bullets, summary, skills, projects |
| `tex_content` | text | Final LaTeX source — saved when the user applies to the job |
| `ats_score` | integer | ATS match score 0–100 |
| `gap_analysis` | text | Plain-text report of missing skills and suggestions |
| `status` | text | One of: not applied / applied / interviewing / offered / rejected / withdrawn |
| `is_favourite` | boolean | Star/pin a job for quick access |
| `got_interview` | boolean | Mark when you get an interview |
| `model_used` | text | Which model generated the resume (e.g. gemini-2.5-flash) |
| `created_at` | timestamptz | Row creation time (auto) |
| `updated_at` | timestamptz | Last update time (auto-maintained by trigger) |
