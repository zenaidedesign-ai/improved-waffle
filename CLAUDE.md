# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Zenaide Revenue Engine** — internal revenue operating system for Zenaide Design (interior design & build, Surabaya). It turns manual/CSV/screenshot marketing inputs (Instagram, Meta Ads, WhatsApp leads) into deterministic verdicts and weekly decisions. No live APIs, no LLM features, no external services — by explicit policy, not omission.

- **UI language is Bahasa Indonesia**; code identifiers are English (see Naming below).
- Stack: Next.js 16 App Router (full-stack, server actions), React 19, Prisma + SQLite (`prisma/dev.db`), Tailwind 4, zod, papaparse, Vitest.

## Commands

```bash
npm install
cp .env.example .env.local        # auth reads .env.local — never commit it
npx prisma migrate deploy         # creates prisma/dev.db
npm run dev                       # http://localhost:3000

npm run test                      # vitest run — all unit tests
npx vitest run tests/engine/leadTriage.test.ts   # single test file
npm run lint                      # eslint (next core-web-vitals + typescript)
npm run build
npm run db:studio                 # Prisma Studio

node scripts/set-owner-password.mjs "Password"   # prints the 2 env lines for .env.local
node scripts/e2e-smoke.mjs        # Playwright smoke test; see file header for the
                                  # required ritual (reset dev.db, start server on :3100
                                  # with ZENAIDE_AUTH_HASH set, password "zenaide-e2e")
```

Tests live in `tests/engine/*.test.ts` (mirroring `src/lib/engine/`) and `tests/auth.test.ts`. They test pure engine functions — no DB or server needed.

## The binding architecture document

**`docs/ARCHITECTURE-GUARDRAILS.md` is the rulebook for this repo. Read it before any non-trivial change.** It freezes the layer map, the anti-patchwork rules, the naming/UI glossary, and a backlog of things deliberately NOT to build (live APIs, LLM/generator features, multi-user auth, vanity dashboard tiles, etc.). Its closing rule applies to you: if in doubt whether an idea violates it, assume it does and ask first.

### Layer map (dependencies point strictly downward)

```
src/app/*            Pages — render + call assembly/engine. NO decision rules in JSX.
src/actions/*        Server actions — zod validation → DB write → revalidatePath.
                     Scoring/verdict math is CALLED from engine, never re-implemented.
src/lib/*.ts         Assembly — fetch from DB → map → hand to engine. No business math.
src/lib/engine/*     Engine — PURE functions. Must not import db, next/*, actions,
                     or assembly files. Shared types go in engine/types.ts.
src/lib/domain/*     Enums, thresholds/weights (config.ts — every number has a written
                     rationale), audit item definitions, seed data.
```

Key anti-patchwork rules (full list in the guardrails doc, §2):

- **One concept = one engine function.** `computeQualityScore`, `isQualified`, `gateLock`, `decideCampaign`, `sourceConfidence`, `weekStartOf` etc. exist exactly once; copying a formula is an architecture bug.
- **Thresholds only in `src/lib/domain/config.ts`**, with a written reason.
- **Every number that drives a decision carries data-truth metadata** (`sourceType`/reliability via `engine/dataTruth.ts`); recommendations must show the KEYAKINAN (confidence) chip and TRUTH_PHRASES when data is thin/stale/screenshot/public.
- **Imported data is consumed only through the normalization layer** (`lib/csv.ts` aliases, `lib/data.ts` mappers), never raw.
- **Example data is honest**: seedable tables have `isExample`; pilot/gate aggregates count only real rows via the shared `REAL` constant; "Hapus data contoh" must delete ALL example tables.
- **The decision vocabulary is frozen** (15 KEPUTUSAN labels, 3 KEYAKINAN levels, TRUTH_PHRASES). A new label requires an architecture review, not a quiet addition.
- **No new dashboard tile without an attached decision/action** — numbers that don't answer "so what should the owner do?" are vanity and get rejected.

### Change control

Requires architecture review before coding: new Prisma models, new KEPUTUSAN labels, new layers, new external dependencies, anything touching `gateLock`/`recordVerdict`/`dataTruth`, anything that makes network calls. Free changes (within layer boundaries): UI copy, form fields, tests, docs, config thresholds (with rationale). A change touching more than 2 layers at once is a design smell — stop and review.

## Naming

- Identifiers: English `verbNoun` (`computeGateVerdict`, `triageLead`). Sanctioned exception: Indonesian domain-unit suffixes `*Juta`, `*Ribu`, `*Pct`, `*Sec` (`estimatedValueJuta`, `spendRibu`).
- Existing enum tokens are frozen as-is (mixed styles like `KILL_KAMPANYE` stay); **new** enum tokens use Indonesian `KATA_KERJA_OBJEK` pattern.
- UI copy follows the fixed glossary in guardrails §3 (e.g. verdict = "Vonis", gate = "Gerbang", backup = "Pusat Cadangan", KILL_KAMPANYE renders as "Matikan kampanye"). Don't invent new UI terms for existing concepts, and don't use claim-inflating names ("Intelligence", "Algorithm") in UI.

## Auth & operational model

Single-owner password gate ("Auth Tahap 1"): `src/middleware.ts` guards every page and API route. If `ZENAIDE_AUTH_HASH` (scrypt, generated by `scripts/set-owner-password.mjs`) is unset, the app deliberately runs **fully open** with a warning banner — this is stated openly, not hidden. Sessions are HMAC-signed cookies (`src/lib/authToken.ts`); rotating `ZENAIDE_SESSION_SECRET` revokes all sessions. There is no user table — multi-user/staff roles are frozen backlog ("Auth Tahap 2").

The database is one SQLite file (`prisma/dev.db`, gitignored). Backup/restore goes through the Pusat Cadangan routes under `src/app/api/backup/`. Migrations are additive; use `npx prisma migrate deploy` (or `migrate dev` when authoring a new migration).

## Orientation pointers

- Routes are Indonesian nouns: `/leads`, `/kampanye`, `/instagram`, `/eksperimen`, `/skor` (Fit Score), `/knowledge`, `/kompetitor`, `/laporan` (weekly report, read-only) vs `/war-room` (weekly decisions, commit), `/pilot`, `/impor`, `/library`, `/audit/[type]`.
- The 14-day pilot flow (`engine/pilot.ts`, `lib/pilotGate.ts`, `docs/PILOT-RUNBOOK.md`) gates later phases; the Intelligence Layer is Phase A only (evidence ledger + belief projection in `engine/belief.ts` — no scoring yet, by design).
- Other design docs in `docs/`: `DATA-ARCHITECTURE.md`, `INTELLIGENCE-LAYER-ARCHITECTURE.md`, `API-READINESS.md` (per-API preconditions before any live integration), `AUTH-READINESS.md`, `OPERATIONS-SAFETY.md`.
