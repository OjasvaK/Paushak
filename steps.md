# PAUSHAAK — Build Steps for Claude Code

This file is an ordered, stage-by-stage build runbook. Execute stages **in order**. Do not start a later stage until the current stage's **Acceptance criteria** all pass. Commit at the end of every stage.

Read `technical-approach.md` and `paushaak-idea.md` in this repo first — they are the source of truth for *what* and *why*. This file is the *how* and *in what order*.

---

## 0. Operating rules (read before writing any code)

These rules exist to stop you from making assumptions. Follow them literally.

1. **Never invent secrets.** API keys, project URLs, database passwords, and tokens are provided by the human. When a stage needs one, add the variable name to `.env.local` and `.env.example` with an empty/placeholder value, print a clear message telling the human exactly which key to obtain and from where, and continue with everything that does **not** require that key. Do not fabricate a key, and do not block the whole build on a missing key.
2. **Locked decisions — do not substitute.** Use exactly these. If one is genuinely unavailable in the environment, **stop and ask the human**; do not silently swap it.
   - Package manager: **npm**.
   - Framework: **Next.js (latest stable, App Router, `/src` dir, TypeScript)**.
   - Styling: **Tailwind CSS**.
   - Backend platform: **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`).
   - Deploy target (frontend): **Vercel**. Deploy target (ML service): **Hugging Face Spaces**.
   - Language AI: **Bhashini**. Speech/LLM: **Groq**. Vision/embeddings: **Google Gemini**.
   - Queue/cache: **Upstash** (QStash + Redis).
3. **No scope creep.** Build only what the current stage specifies. Do not implement a later stage's feature early, even if convenient.
4. **One stage = one commit (minimum).** Commit message format: `stage <N>: <short summary>`.
5. **When blocked or ambiguous, stop and ask.** Do not guess schema fields, route names, or third-party behavior. If this file doesn't specify it, ask rather than assume.
6. **Verify, don't assume, external APIs.** Before writing an integration against Bhashini/Groq/Gemini/Upstash, fetch and read the current official docs for request/response shape. Their APIs change; do not code from memory.
7. **Keep API keys server-side.** The browser must never call an AI provider directly. All provider calls go through Next.js server routes/actions.
8. **Do not install packages blindly.** Check whether a dependency is already present before adding it. Pin versions in `package.json`.
9. **Accessibility & mobile-first.** Target cheap Android phones on weak networks: semantic HTML, large tap targets, works at ~360px width, no layout that assumes desktop.
10. **Default language = Hindi + English.** UI strings must go through an i18n structure from the start (even if only `hi` and `en` are filled) — do not hardcode user-facing strings inline.

---

## Stage 1 — Project skeleton & tooling

**Goal:** a running Next.js + TypeScript + Tailwind app with linting, formatting, and a clean folder structure. No features yet.

**Steps:**
1. Scaffold a Next.js app in the repo root (App Router, TypeScript, Tailwind, ESLint, `src/` directory, import alias `@/*`).
2. Add Prettier + an ESLint/Prettier integration. Add `npm` scripts: `dev`, `build`, `start`, `lint`, `format`.
3. Create this folder structure under `src/`:
   ```
   src/
     app/            # routes
     components/     # reusable UI
     lib/            # clients, helpers (supabase, groq, gemini, bhashini, upstash)
     types/          # shared TypeScript types
     i18n/           # locale dictionaries (en.json, hi.json)
     styles/         # globals
   ```
4. Create `.env.example` listing every env var the project will ever use (fill in as later stages introduce them), and a `.gitignore` that excludes `.env.local`.
5. Add a minimal landing page at `/` with a heading and a "PAUSHAAK" wordmark placeholder. No logic.
6. Set up the i18n dictionary files `en.json` and `hi.json` with a couple of starter keys, and a tiny helper in `src/i18n` to read them.

**Acceptance criteria:**
- `npm run dev` serves the landing page with no console errors.
- `npm run lint` and `npm run build` pass clean.
- Folder structure above exists.
- `.env.local` is gitignored; `.env.example` is committed.

---

## Stage 2 — Supabase setup & database schema

**Goal:** a provisioned Supabase project, a typed client, and the full base schema with Row-Level Security.

**Prerequisites from human:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. If absent, create the placeholders, print instructions (create a project at supabase.com → copy from Project Settings → API), and proceed to write migrations that the human can run.

**Steps:**
1. Install `@supabase/supabase-js` and `@supabase/ssr`.
2. Create three client helpers in `src/lib/supabase/`:
   - `client.ts` — browser client (anon key).
   - `server.ts` — server client for server components/actions (uses cookies).
   - `admin.ts` — service-role client, **server-only**, never imported in client code.
3. Write a SQL migration file under `supabase/migrations/` creating the schema. Enable the `vector` (pgvector) extension. Create:
   - `profiles` (`id` references `auth.users`, `role` enum `artisan|consumer|brand`, `full_name`, `preferred_language`, `created_at`).
   - `artisans` (`profile_id` FK, `craft`, `lineage`, `region`, `verification_status` enum `pending|verified|rejected`, `heritage_notes`).
   - `listings` (`id`, `seller_id` FK→profiles, `title`, `description_json` jsonb (keyed by locale), `tags` text[], `price_min` int, `price_max` int, `currency` default `INR`, `status` enum `draft|enhancing|live|archived`, `created_at`).
   - `listing_media` (`id`, `listing_id` FK, `kind` enum `image|audio`, `storage_path`, `enhanced_path` nullable, `enhancement_status` enum `none|queued|processing|done|failed`).
   - `designs` (`id`, `artisan_id` FK, `title`, `metadata_json` jsonb, `embedding` vector(768) nullable).
   - `orders` (`id`, `buyer_id` FK, `listing_id` FK, `status` enum `pending|paid|shipped|delivered|cancelled`, `amount` int, `created_at`).
   - `deals` (`id`, `brand_id` FK, `artisan_id` FK, `type` enum `license|commission`, `status`, `terms_json` jsonb, `created_at`).
   - `listing_embeddings` (`listing_id` FK, `embedding` vector(768)). Add an index appropriate for similarity search.
4. Define a `role` as a Postgres enum type; reuse it. Use enums (not free text) for every status field above.
5. Write RLS policies: every table RLS-enabled. A user can read their own `profiles`/`artisans` row and update it; `listings` and `designs` are publicly readable when `status='live'` but only writable by their owner; `orders`/`deals` readable/writable only by their parties. Write these explicitly — do not leave any table RLS-open.
6. Generate TypeScript types from the schema into `src/types/database.ts` (use the Supabase type generator; if the CLI/keys aren't available, hand-write the types to match the migration exactly).
7. Add a trigger/function so that a new `auth.users` row auto-creates a `profiles` row.

**Acceptance criteria:**
- Migration file exists and is internally consistent (every FK references a real table/column; every enum is defined before use).
- Three Supabase client helpers exist; `admin.ts` is never imported from a client component.
- `src/types/database.ts` matches the migration.
- RLS is enabled with explicit policies on **every** table.
- `npm run build` passes.

---

## Stage 3 — Authentication & the three roles

**Goal:** sign up, sign in, sign out, and a role chosen at signup, enforced through the app.

**Steps:**
1. Build auth UI: `/signup`, `/login`, and a sign-out action. Use Supabase email/password auth (keep it simple; magic link optional later).
2. At signup, the user picks a role (`artisan | consumer | brand`). Store it on the `profiles` row (the auto-create trigger from Stage 2 should set a default; update it with the chosen role).
3. Add middleware (`src/middleware.ts`) that refreshes the Supabase session and protects authenticated routes.
4. Create route groups / layouts per role: `/(artisan)`, `/(consumer)`, `/(brand)` with a shared authenticated shell. A logged-in user is routed to their role's home.
5. Add a server helper `getCurrentUserWithProfile()` used by server components to fetch the user + their role in one place. Do not re-query ad hoc.
6. Guard: a user without the right role cannot access another role's pages (redirect, don't error).

**Acceptance criteria:**
- A new user can sign up, pick a role, land on that role's home, sign out, and sign back in.
- The `profiles` row reflects the chosen role.
- Visiting another role's route while logged in redirects, not 500s.
- Unauthenticated access to protected routes redirects to `/login`.

---

## Stage 4 — Listings: create (manual) & marketplace browse

**Goal:** an artisan can create a listing with typed text + an uploaded image; anyone can browse live listings. **No AI yet** — this proves the data/storage/CRUD path.

**Steps:**
1. Create a Supabase Storage bucket for listing media; wire RLS/storage policies so a seller can upload to their own path and live images are publicly readable.
2. Artisan "create listing" form: title, description, tags, price range, image upload. On submit (server action): upload image to storage → insert `listings` (status `draft`) + `listing_media` rows. Validate all inputs server-side; reject empties with inline errors.
3. Artisan dashboard: list their own listings with status; a "publish" action flips `draft → live`.
4. Public marketplace at `/` (or `/browse`): server-rendered grid of `status='live'` listings with image, title, price. Must be SSR for SEO.
5. Product detail page `/listing/[id]`: full listing, image, seller's region/craft. SSR.
6. Basic filters on browse: by region and by tag (query params, server-side filtering).

**Acceptance criteria:**
- An artisan can create → publish a listing with a real uploaded image.
- The listing appears in the public browse grid and has a working detail page, both server-rendered.
- Filters by region and tag work via URL params.
- A consumer (or logged-out visitor) can browse and open a listing but cannot edit it (RLS enforced).

---

## Stage 5 — Voice onboarding pipeline

**Goal:** an artisan creates a listing **by speaking**. Audio → transcript → translation → structured draft listing.

**Prerequisites from human:** `BHASHINI_API_KEY` (and any Bhashini config), `GROQ_API_KEY`. Placeholder + instruct if missing. **Before coding, fetch current Bhashini and Groq docs** for exact request/response shapes.

**Steps:**
1. Browser audio capture: a record component using `MediaRecorder`; upload the audio blob to storage (kind `audio`).
2. Create `src/lib/bhashini.ts` and `src/lib/groq.ts` server-only helpers.
3. Server route/action `processVoiceOnboarding`:
   - a. Send audio to **Bhashini ASR** → transcript in the artisan's language. If Bhashini fails or language unsupported, fall back to **Groq Whisper**.
   - b. **Bhashini NMT** → produce EN and HI versions of the text.
   - c. **Groq LLM** → structure the transcript into `{ title, description, tags[] }`. Use a strict prompt that returns JSON only; validate the JSON before trusting it.
   - d. Create a `listings` row with `status='draft'` populated from the structured output (`description_json` keyed by locale).
4. Present the draft to the artisan for review/edit before they publish (reuse Stage 4's publish flow).
5. Handle failures gracefully: if any AI step errors or rate-limits, save what succeeded, mark the rest, and show a retry — never lose the artisan's audio.

**Acceptance criteria:**
- Speaking a product description produces a reviewable draft listing with title, description (EN + HI), and tags.
- Groq Whisper fallback triggers correctly when Bhashini is unavailable.
- All provider calls happen server-side; no key reaches the browser.
- A failed AI step degrades gracefully and is retryable; audio is never lost.

---

## Stage 6 — Async image enhancement (HF Space + QStash)

**Goal:** uploaded product photos are background-removed and upscaled **in the background**, without blocking the artisan.

**Prerequisites from human:** `UPSTASH_QSTASH_TOKEN` (+ signing keys), the deployed **HF Space** URL, and any Space auth token. Placeholder + instruct if missing.

**Steps:**
1. Build the ML service (separate folder `ml-service/`): a FastAPI app exposing `POST /enhance` that takes an image, runs **rembg** (background removal) then **Real-ESRGAN** (upscale), and returns/stores the result. Include a `Dockerfile` and a `README` with HF Spaces deploy notes (port, secrets). Confirm model licenses are permissive.
2. On image upload (from Stage 4/5), enqueue a **QStash** job targeting a Next.js webhook route, carrying the `listing_media` id. Set `enhancement_status='queued'`.
3. Webhook route `POST /api/jobs/enhance`:
   - a. **Verify the QStash signature** — reject unsigned/invalid requests.
   - b. Set status `processing`, call the HF Space `/enhance`, store the enhanced image, set `enhanced_path` and status `done`. On failure set `failed`.
   - c. Make the handler **idempotent** (keyed by media id) so a QStash retry can't double-process.
4. UI: show the enhancement status on the artisan's listing; swap to the enhanced image once `done`.

**Acceptance criteria:**
- Uploading an image enqueues a job; the artisan is **not** blocked waiting.
- The job runs, the enhanced image replaces the original in the UI, and status transitions `queued→processing→done`.
- An invalid/unsigned webhook call is rejected.
- Re-delivering the same job does not double-process (idempotent).

---

## Stage 7 — Embeddings, vector search & discovery chatbot

**Goal:** semantic search over listings, and a RAG chatbot that answers buyer queries.

**Prerequisites from human:** `GEMINI_API_KEY`. Placeholder + instruct if missing. Fetch current Gemini embeddings + generation docs before coding; confirm the embedding dimension and set the `vector(N)` columns to match (adjust the Stage 2 migration if N ≠ 768 and write a follow-up migration — do not leave a mismatch).
**Steps:**
1. `src/lib/gemini.ts` server helper for embeddings + text generation.
2. When a listing goes `live`, compute its embedding (Gemini) from title + description + tags and store it in `listing_embeddings`.
3. Semantic search endpoint: embed the query → pgvector similarity search → return ranked listings.
4. Discovery chatbot UI (consumer side): user asks in natural language → retrieve top-k listings via vector search → feed to Gemini/Groq LLM as context (RAG) → conversational answer that references real retrieved listings. Do not let the LLM invent listings; ground every recommendation in retrieved rows.
5. Cache repeated embeddings/queries in **Upstash Redis** to stay under free rate limits.

**Acceptance criteria:**
- Publishing a listing populates its embedding.
- A natural-language query returns semantically relevant live listings (not just keyword matches).
- The chatbot answers only with real retrieved listings; it never fabricates products.
- Repeated identical queries hit the cache.

---

## Stage 8 — Pricing engine

**Goal:** an explainable suggested price band for a listing.

**Steps:**
1. Collect pricing inputs on the listing form: material cost, weaving hours, a rarity/complexity indicator.
2. `suggestPrice(listing)` server function:
   - a. Embed the item and pgvector-search comparable live listings.
   - b. Combine a cost-plus-labour floor with the comparable range into a `{ price_min, price_max }` band.
   - c. Return the reasoning (inputs + comparables used) so it is explainable, not a black box.
3. Surface the suggestion in the create/edit flow; the artisan can accept or override it. Store the final band on the listing.

**Acceptance criteria:**
- Creating/editing a listing yields a suggested price band plus a short explanation of how it was derived.
- The artisan can override; the stored band reflects their choice.
- With no comparables yet, it falls back to the cost-plus-labour floor without erroring.

---

## Stage 9 — B2B side (licensing, brand accounts, matchmaking)

**Goal:** brands can discover designs, license motifs, or commission clusters; artisans receive deals.

**Steps:**
1. Brand dashboard: browse `designs` and artisan clusters; filter by craft/region/capacity.
2. Design licensing flow: a brand requests a license on a `design` → creates a `deals` row (`type='license'`) → artisan sees and accepts/declines. Record (do not yet move real money) royalty terms in `terms_json`.
3. Commission flow: a brand commissions an artisan/cluster → `deals` row (`type='commission'`) with milestone terms. Escrow is **mocked/test-mode only** this stage — label it clearly; real payments are out of scope here.
4. B2B matchmaking chatbot: same RAG pattern as Stage 7 but over artisans/designs, matching by craft, capacity, and lead time.

**Acceptance criteria:**
- A brand account can find a design and open a license deal; the artisan can accept/decline; the `deals` row reflects state.
- A commission deal with milestones can be created and tracked (no real money moves).
- The B2B chatbot returns real matching artisans/designs, grounded in retrieved rows.

---

## Stage 10 — Hardening & reliability

**Goal:** the free-tier survival kit, applied across the app.

**Steps:**
1. Add retries-with-backoff and graceful fallbacks on every external AI call (Gemini rate-limit → Groq fallback where applicable). Never surface a raw provider error to the user.
2. Add a **keep-alive cron** (GitHub Actions or cron-job.org config in-repo) that pings Supabase daily so the free project never pauses.
3. Add an offline-tolerant upload queue on the client (store pending uploads locally, sync when back online). Wrap all browser-storage access in try/catch.
4. Add email notifications via **Resend** for key events (order placed, deal accepted). Placeholder `RESEND_API_KEY` + instruct if missing.
5. Add basic observability: structured server logs for each pipeline, and a simple admin health view.
6. Write a `README.md` covering local setup, every env var, how to run the ML service, and how to deploy (Vercel + HF Space).

**Acceptance criteria:**
- Killing a provider (simulate a 429) degrades gracefully with a fallback or a clean retry message.
- The keep-alive cron config exists and is documented.
- Uploads queued offline sync when the connection returns.
- `README.md` lets a fresh developer run the whole thing from zero.

---

## Stage 11 — Deploy

**Goal:** the website is live on Vercel; the ML service is live on an HF Space.

**Steps:**
1. Deploy the Next.js app to Vercel; set every env var in the Vercel dashboard (instruct the human on which to paste). Confirm the production build.
2. Deploy `ml-service/` to a Hugging Face Space (Docker SDK, port 7860); set its secrets. Point the app's HF Space URL env var at it.
3. Smoke-test the full path in production: sign up as artisan → voice onboarding → image enhancement → publish → browse as consumer → chatbot → price suggestion.
4. Document the live URLs and any production-only gotchas (cold starts, rate limits) in `README.md`.

**Acceptance criteria:**
- Production website is reachable and the smoke-test path works end to end.
- The ML Space responds (allowing for a cold-start delay on first call).
- All secrets are set in the respective dashboards; none are committed to the repo.

---

## Later / out of scope for this runbook (do not build unless asked)

- Physics-accurate virtual try-on (needs GPU).
- Real payments / real escrow / KYC (needs a registered business).
- WhatsApp/SMS notifications (paid).
- Deeper motif vector-tracing.
- The native mobile app (reuses this logic; a separate runbook).

---

## Reminder

If anything in a stage is unspecified or ambiguous, **stop and ask** — do not assume field names, provider behavior, or scope. Commit per stage. Keep all secrets server-side. Build only the current stage.
