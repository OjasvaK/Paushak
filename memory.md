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
| 1 | Project skeleton & tooling | ✅ Done (2026-11-07) | — |
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
- 2026-11-07 — Project moved out of OneDrive to `C:\projects\Paushak`. Old copy of the `.md` files still in `OneDrive\Desktop\projects\Paushak` — safe for the user to delete.
- 2026-11-07 — **Stage 1 done.** Next.js 16.4.5 (App Router, Turbopack, `cacheComponents` on) + React 19.3 + TypeScript 5.9 + Tailwind 4.3 + ESLint 9 + Prettier 3.9 (with eslint-config-prettier). All versions pinned exactly. Folders: `src/{app,components,lib,types,i18n,styles}`. i18n: `src/i18n/{en,hi}.json` + `getDictionary()` / `hasLocale()` in `src/i18n/index.ts`. `.env.example` lists every future env var. Landing page at `/` (bilingual, Noto Sans for Latin + Devanagari). `.gitattributes` forces LF. Verified: `lint`, `format:check`, `build` pass; dev server renders at 360px with no console errors.

## 6. Next step

**Stage 2 — Supabase setup & DB schema + RLS.**
- **User needs to:** create a free project at supabase.com → Project Settings → API → copy `Project URL`, `anon` key, `service_role` key into `.env.local` (copy from `.env.example`). Stage 2 can start without them (migration files get written first), but the schema can't be applied until they exist.
- **Claude will:** install `@supabase/supabase-js` + `@supabase/ssr`, write `src/lib/supabase/{client,server,admin}.ts`, the SQL migration (all tables, enums, pgvector, RLS, profile trigger), and `src/types/database.ts`.

## 7. Open questions / things to watch

- Repo lives inside **OneDrive** — `node_modules` syncing can be slow/flaky. Consider excluding it from sync or moving the project outside OneDrive.
- Gemini embedding dimension must be confirmed in Stage 7; schema assumes `vector(768)` — write a follow-up migration if it differs.
- Impact numbers in the pitch (6.4–6.9M vs 3.2–3.7M artisans) need reconciling + primary citations.
- Avoid naming real brands (e.g. "Snitch") as partners in pitches.
- **Locale routing not decided yet:** `/hi/...` + `/en/...` URL prefixes vs. a cookie/profile preference. Stage 1 just has dictionaries; decide before Stage 3/4 UI work. (Next 16 docs recommend `app/[lang]/` + `proxy.ts`.)
- Next.js 16 renamed `middleware.ts` → **`proxy.ts`**. Stage 3 of `steps.md` says `src/middleware.ts` — check the bundled docs (`node_modules/next/dist/docs/`) and use the current convention.
- `npm audit`: 8 moderate warnings, all in dev-only lint tooling (typescript-eslint). Not shipped to users; don't `--force` fix. Recheck when upgrading.
- Node 25 is a non-LTS release; fine so far. If a tool misbehaves, try Node 24 LTS.

## 8. Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-11-07 | Progress tracked in `memory.md` at repo root | User request |
| 2026-11-07 | Commits/PRs authored by the user's name only — no Claude co-author or AI attribution lines. Message format: `stage <N>: <short summary>` | User request |
