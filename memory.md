# PAUSHAAK — Project Memory

Living log of what's done, what's next, and decisions made. Update at the end of every task/stage.

_Last updated: 2026-11-07_

---

## 1. Project in one line

AI-powered, zero-budget marketplace connecting India's marginalized textile artisans directly to consumers (B2C) and fashion brands (B2B). Core loop: **speak → list → match**. Website first (Next.js + Supabase on free tiers), mobile app later.

## 2. Source-of-truth docs

| File | Role |
|---|---|
| `paushaak-idea.md` | The *what & why* — problem, 3 actors, features, business model, risks, roadmap |
| `technical-approach.md` | The *architecture* — stack, data layer, pipelines, free-tier survival patterns |
| `steps.md` | The *how & order* — 11-stage build runbook with acceptance criteria + operating rules |
| `memory.md` | This file — progress tracker |

## 3. Locked decisions (do not substitute)

- npm · Next.js (latest, App Router, `src/`, TypeScript) · Tailwind
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`) — auth, Postgres, storage, pgvector
- Vercel (frontend) · Hugging Face Spaces (ML service: rembg + Real-ESRGAN, FastAPI, port 7860)
- Bhashini (ASR/translation) · Groq (Whisper fallback + LLM) · Gemini (vision + embeddings)
- Upstash (QStash jobs + Redis cache) · Resend (email)
- i18n from day one (`hi` + `en`), mobile-first (~360px), all AI calls server-side only
- Never invent secrets — add placeholders to `.env.example` / `.env.local` and tell the human

## 4. Stage tracker

| # | Stage | Status | Needs from human |
|---|---|---|---|
| 1 | Project skeleton & tooling | ⬜ Not started | — |
| 2 | Supabase setup & DB schema + RLS | ⬜ Not started | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| 3 | Auth & three roles | ⬜ Not started | (Supabase keys) |
| 4 | Listings (manual) & marketplace browse | ⬜ Not started | (Supabase keys) |
| 5 | Voice onboarding pipeline | ⬜ Not started | `BHASHINI_API_KEY` (+config), `GROQ_API_KEY` |
| 6 | Async image enhancement (HF Space + QStash) | ⬜ Not started | `UPSTASH_QSTASH_TOKEN` + signing keys, HF Space URL/token |
| 7 | Embeddings, vector search & chatbot | ⬜ Not started | `GEMINI_API_KEY`, Upstash Redis creds |
| 8 | Pricing engine | ⬜ Not started | — |
| 9 | B2B (licensing, commissions, matchmaking) | ⬜ Not started | — |
| 10 | Hardening & reliability | ⬜ Not started | `RESEND_API_KEY` |
| 11 | Deploy (Vercel + HF Space) | ⬜ Not started | Vercel + HF accounts |

Legend: ⬜ not started · 🟨 in progress · ✅ done · ⛔ blocked

## 5. Done so far

- 2026-11-07 — Read all three planning docs; project understood. Created this `memory.md`.
- 2026-11-07 — Git initialized (branch `main`), remote `origin` = https://github.com/OjasvaK/Paushak.git, base `.gitignore` added, initial commit of planning docs. **Not pushed yet** (push only on user's say-so).
- Environment: Git 2.51, Node 25.2, npm 11.6, gh 2.101 installed.

## 6. Next step

1. **User:** move project out of OneDrive to e.g. `C:\Projects\Paushak` (the `.git` folder moves with it) and open a new session there.
2. **Claude:** Stage 1 — Project skeleton (Next.js + TS + Tailwind + ESLint/Prettier, `src/` folders, i18n `en`/`hi`, `.env.example`, landing page). Scaffolding goes in the repo root alongside the existing `.md` files.

## 7. Open questions / things to watch

- Repo lives inside **OneDrive** — `node_modules` syncing can be slow/flaky. Consider excluding it from sync or moving the project outside OneDrive.
- Gemini embedding dimension must be confirmed in Stage 7; schema assumes `vector(768)` — write a follow-up migration if it differs.
- Impact numbers in the pitch (6.4–6.9M vs 3.2–3.7M artisans) need reconciling + primary citations.
- Avoid naming real brands (e.g. "Snitch") as partners in pitches.

## 8. Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-11-07 | Progress tracked in `memory.md` at repo root | User request |
| 2026-11-07 | Commits/PRs authored by the user's name only — no Claude co-author or AI attribution lines. Message format: `stage <N>: <short summary>` | User request |
