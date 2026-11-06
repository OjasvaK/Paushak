# PAUSHAAK — Technical Approach & System Design

> Zero-budget build. Website first, mobile app later. Every service listed below has a usable free tier as of November 2026. Free tiers change — re-verify before you architect hard dependencies on a specific cap.

---

## 1. Design constraints (what shapes every decision)

| Constraint | Consequence |
|---|---|
| **₹0 budget** | Only free tiers and open-source models. No paid GPU, no paid hosting. |
| **Target users are rural, low-literacy, low-connectivity** | Voice-first, regional-language, offline-tolerant, lightweight pages. |
| **Website first, app later** | Web stack chosen so logic (TypeScript) is reusable in the app. |
| **Free tiers sleep** | Supabase pauses after 7 days idle; HF Spaces sleep; Render sleeps in 15 min. Architecture must dodge cold-starts on the user path and tolerate them for async jobs. |
| **Marketplace needs discoverability** | Server-side rendering for SEO (product pages must be Google-indexable). |

---

## 2. The stack at a glance

| Layer | Choice | Why | Free-tier ceiling |
|---|---|---|---|
| Frontend | **Next.js (React + TS + Tailwind)** on **Vercel** | SSR/SEO, no sleep, reusable logic for the app | 100 GB bandwidth, no sleep |
| Core platform | **Supabase** | Auth + Postgres + Storage + Realtime + pgvector in one | 500 MB DB, 1 GB storage, 50K MAU, pauses after 7 days idle |
| Server logic | **Vercel functions / Next.js server actions** | No idle server, no cold-start on user path | serverless free limits |
| Language AI | **Bhashini** (govt) | Free ASR/TTS/translation/transliteration, 22 Indian languages | free developer API |
| Speech + LLM | **Groq** | Free Whisper + free open LLMs, no card | ~20 req/min, 2,000 req/day, 2 hr audio/hr |
| Vision + embeddings | **Google Gemini (Flash)** | Free vision + embeddings | Flash/Flash-Lite free, rate-limited |
| Self-hosted ML | **Hugging Face Spaces** | Free host for rembg + Real-ESRGAN | 2 vCPU, 16 GB RAM, 50 GB disk, sleeps when idle |
| Queue + cache | **Upstash** (Redis + QStash) | Async jobs + caching, permanent free | Redis 256 MB / 500K cmd/mo; QStash 1,000 msg/day |
| Image CDN (optional) | **ImageKit** | Simple free image delivery if Supabase storage is tight | 20 GB bandwidth, 20 GB storage, unlimited transforms |
| Email | **Resend** | Transactional email free tier | free tier |
| Keep-alive cron | **GitHub Actions / cron-job.org** | Ping Supabase so it never pauses | free |

---

## 3. Architecture (layered)

```
┌─────────────────────────────────────────────────────────┐
│ CLIENT                                                   │
│   Next.js website (React + TS) on Vercel                 │
│   browser: camera, microphone, offline-tolerant upload   │
└───────────────┬──────────────────────┬──────────────────┘
                │                      │
        ┌───────▼───────┐      ┌───────▼────────────┐
        │   Supabase    │◄────►│  Vercel functions  │
        │ DB + pgvector │      │  (server logic /   │
        │ auth · storage│      │   orchestration)   │
        └───────────────┘      └─────────┬──────────┘
                                         │ dispatches to
        ┌────────────────────────────────▼─────────────────┐
        │ AI & COMPUTE LAYER  (all free tier)               │
        │                                                   │
        │  Bhashini        Groq            Gemini Flash      │
        │  ASR/translate   Whisper/LLM     vision/embeddings │
        │                                                   │
        │  Hugging Face Spaces        Upstash               │
        │  rembg · Real-ESRGAN        Redis · QStash jobs   │
        └───────────────────────────────────────────────────┘
```

**Flow of control:** the browser never calls an AI service directly. Vercel functions are the orchestration brain — they authenticate via Supabase, read/write the DB, and fan out to the free AI APIs, keeping every API key server-side.

---

## 4. Data layer (Supabase Postgres)

Single database, single source of truth. pgvector lives in the same DB, so vector search needs no separate service.

**Core tables (first pass):**
- `profiles` — one row per user, `role ∈ {artisan, consumer, brand}`, language preference.
- `artisans` — heritage portfolio, craft/lineage, verification status.
- `listings` — product listings: title, description (multilingual JSON), price band, status (`draft`/`enhancing`/`live`), seller FK.
- `listing_media` — image/audio references (storage paths), enhancement status.
- `designs` — B2B licensable motifs: metadata, embedding.
- `orders` — B2C orders, status, buyer/seller FKs.
- `deals` — B2B commissions/licenses, milestone/escrow state.
- `embeddings` — pgvector column(s) for listings/designs (search + pricing comparables).

**Indexing:** standard B-tree on FKs and status; an IVFFlat/HNSW index on the pgvector columns for similarity search.

**Keep-alive:** a scheduled cron hits a trivial query daily so the free project never crosses the 7-day inactivity pause.

---

## 5. The pipelines

### 5.1 Voice onboarding (artisan creates a listing by speaking)
1. Browser records audio (`MediaRecorder`), uploads to storage.
2. **Bhashini ASR** → transcript in the artisan's language (fallback: **Groq Whisper**).
3. **Bhashini NMT** → normalize/translate to EN + HI.
4. **Groq/Gemini LLM** → structure the transcript into `title`, `description`, `tags`.
5. Saved as a **draft** listing the artisan can confirm.

### 5.2 Image enhancement (ASYNC — never blocks the user)
1. Photo uploaded → a **QStash** job is enqueued.
2. **HF Space** (FastAPI) runs **rembg** (background removal) then **Real-ESRGAN** (upscale to sharp 4K).
3. Cleaned image written back to storage; listing status flips `enhancing → live`.
- *Why async:* a single upscale can take ~60s on free CPU. The artisan keeps working; the listing finishes in the background.
- *Optional:* rembg/Real-ESRGAN also run in-browser as ONNX, letting background removal happen on-device with zero server cost.

### 5.3 Motif / design asset (fuels B2B licensing)
- **Gemini vision** describes and tags the pattern → stored as metadata + embedding.
- (True vector/motif tracing is a later upgrade; metadata + search is the MVP.)

### 5.4 Pricing engine (explainable, not a black box)
1. Embed the item (**Gemini embeddings**).
2. **pgvector** similarity search → comparable listings.
3. Formula over material cost + weaving hours + craft rarity + comparables → **price band**.
- Transparent and defensible, which matters more than "AI magic" for a fairness pitch.

### 5.5 Discovery / matchmaking chatbot (same pattern, two audiences)
1. User query → **Gemini embedding**.
2. **pgvector** similarity search (RAG retrieval).
3. **Groq/Gemini LLM** writes the conversational answer.
- B2C: "find me a handloom saree under ₹3,000 in indigo."
- B2B: match a brand to weavers by craft, capacity, lead time.

### 5.6 Virtual try-on (scoped honestly)
- **v1:** size recommendation from body measurements + a simple 2D preview.
- **Later / roadmap:** physics-driven drape (IDM-VTON / CatVTON class models) — needs GPU not available on ₹0.

---

## 6. Async & reliability patterns (the free-tier survival kit)

- **Queue everything slow.** Image enhancement goes through QStash so the request path stays fast.
- **Idempotent jobs.** Each enhancement job is keyed by media ID; a retry can't double-process.
- **Graceful degradation.** If Gemini rate-limits (free limits were cut in Dec 2025 without warning), fall back to Groq LLMs. Never be a single-vendor hostage.
- **Retries with backoff** on all external AI calls; surface a "still processing" state rather than an error.
- **Keep-alive cron** for Supabase; accept HF Space cold-starts (first job after idle is slow, which is fine for background work).
- **Cache** hot queries + chatbot sessions in Upstash Redis to stay under free API rate limits.

---

## 7. Known gaps & deferred items (no sugar-coating)

| Item | Reality | Plan |
|---|---|---|
| Payments / B2B escrow | Real money movement needs a registered business + KYC | Razorpay **test mode** for demo; real escrow is a legal/roadmap item |
| WhatsApp / SMS alerts | Cost money | v1 = email (Resend) + in-app notifications |
| Physics try-on | GPU-grade | Roadmap; v1 is size + 2D preview |
| Service sleep | Price of ₹0 | Cron for DB; tolerate Space cold-starts on async jobs |
| Free-tier caps | Can change / shrink | Build fallbacks; monitor usage; keep vendor options parallel |

---

## 8. Build order (website first)

1. **Skeleton** — Next.js + Supabase: auth, three roles, DB schema, create + view one listing.
2. **Marketplace** — browse, filters, product pages, image upload to storage.
3. **Voice onboarding** — Bhashini + Groq + LLM structuring.
4. **Async image enhancement** — HF Space + QStash.
5. **Search** — embeddings + pgvector → discovery chatbot.
6. **Pricing engine.**
7. **B2B side** — licensing listings, brand accounts, matchmaking.
8. **Mobile app** — reuse the TypeScript logic, swap UI to Expo/React Native.

---

## 9. One-line summary

A Next.js + Supabase marketplace, orchestrated by serverless functions, that leans on India's free Bhashini language stack, free Groq/Gemini inference, and self-hosted open-source image models on Hugging Face — architected around the fact that free tiers sleep.
