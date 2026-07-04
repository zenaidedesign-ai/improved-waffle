# Implementation Plan — Goal 1: Instagram & Meta Recovery Engine

**Zenaide Revenue Engine** · Status: awaiting owner approval · No code written yet.
Companion to the approved design blueprint: [`BLUEPRINT-GOAL-1-INSTAGRAM-META-RECOVERY.md`](BLUEPRINT-GOAL-1-INSTAGRAM-META-RECOVERY.md) (Bahasa Indonesia). All UI copy will be Bahasa Indonesia; this developer document is in English.

---

## Step 1 — Current repo structure

The repository contains exactly two files on branch `claude/zenaide-revenue-engine-fpvhk7`:

```
README.md
docs/BLUEPRINT-GOAL-1-INSTAGRAM-META-RECOVERY.md
```

**There is no ERP in this repository and no application code of any kind.** Nothing can be damaged. The Revenue Engine is built standalone; any integration with Zenaide's existing ERP (which lives elsewhere) is a later, separate, explicitly-approved step — Phase 1 exchanges data with the outside world only via CSV.

## Step 3 — Where the module lives

The entire app IS this repo: a self-contained Next.js + SQLite application. Goal 1's eight submodules live under one `src/` tree with a shared rule engine. Google Ads, TikTok, Threads, and Competitor Intelligence are **out of scope** and get no code, no routes, and no schema — the design leaves natural extension points (the `Verdict` log, `Setting` groups, and the engine folder) so later goals bolt on without rework.

---

## Stack (decided)

| Piece | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 App Router + TypeScript + React 19 | Server actions for 100% of mutations; the only API routes are CSV template downloads |
| Styling | Tailwind CSS 4 | No component library — UI is forms, tables, traffic lights |
| DB | Prisma 6 + SQLite (`file:./dev.db`) | Single-user internal tool, zero external services, no auth in Phase 1 |
| CSV | papaparse 5 (+ types) | Handles UTF-8 BOM, quoted commas in captions/campaign names, `\r\n` — all present in Meta/IG exports |
| Charts | Hand-rolled SVG components | Only sparkline, bar-compare, content-mix bar, pred-vs-actual scatter needed; tiny data volumes (≤ ~90 posts); full control of Indonesian labels; zero deps |
| Validation | zod | CSV row validation + form guards (e.g. 6 mandatory hypothesis fields) |
| Tests | vitest | Rule engine is pure TS — no Next.js runtime needed |

**SQLite constraints baked in from migration one:** Prisma enums and `Json` columns are unsupported on SQLite → all enum-like fields are `String` validated against canonical lists in `src/lib/domain/enums.ts` (zod at every write boundary); snapshot payloads are `String` holding `JSON.stringify(...)` with typed parse helpers.

**Money:** integer fields in owner-friendly units — `estimatedValueJuta` (juta rupiah) for project values, `spendRibu` (ribu rupiah) for ad spend. Rendered as "Rp 350 jt" / "Rp 250 rb". **Dates:** rendered via one shared `formatTanggal()` with `Asia/Jakarta`.

**Scaffold** (create-next-app refuses a dir containing `docs/`, so scaffold in a temp dir and rsync in, excluding `.git` and `README.md`):

```bash
npx create-next-app@latest /tmp/zenaide-scaffold --ts --tailwind --app --src-dir --import-alias "@/*" --eslint --no-turbopack
rsync -a --exclude=.git --exclude=README.md /tmp/zenaide-scaffold/ /home/user/improved-waffle/ && rm -rf /tmp/zenaide-scaffold
npm i prisma @prisma/client papaparse zod && npm i -D @types/papaparse vitest
npx prisma init --datasource-provider sqlite && npx prisma migrate dev --name init
```

Add `prisma/dev.db*` to `.gitignore`; scripts: `test` (vitest run), `db:studio`, `db:seed`.

---

## Step 4a — Data model (Prisma schema)

Enum-like values shown as comments are enforced in `src/lib/domain/enums.ts`. Every model carries `isExample Boolean @default(false)` for one-click demo-data load/delete.

```prisma
// ── Audits (Gates) ──────────────────────────────────────────────
model AuditRun {          // type: "META_ACCOUNT" | "REKOMENDASI" | "TRACKING"
  id String @id @default(cuid())
  type String
  runDate DateTime @default(now())
  verdict String          // "MERAH" | "KUNING" | "HIJAU"
  notes String?
  isExample Boolean @default(false)
  answers AuditAnswer[]
  verdicts Verdict[]
}
model AuditAnswer {
  id String @id @default(cuid())
  auditRunId String
  auditRun AuditRun @relation(fields:[auditRunId], references:[id], onDelete: Cascade)
  itemKey String          // META_ACCOUNT: A1..A13 · REKOMENDASI: R1..R6 · TRACKING: T1..T5
  status String           // "MERAH" | "KUNING" | "HIJAU" | "BELUM_DICEK"
  isBlocking Boolean      // snapshot at answer time (item definitions can evolve)
  answerText String?      // what the owner actually saw in Meta Business Suite / IG settings
  note String?
  @@unique([auditRunId, itemKey])
}

// ── Instagram (Distribution Diagnosis) ──────────────────────────
model IgPost {
  id String @id @default(cuid())
  postedAt DateTime       // date + time
  format String           // "REELS" | "CAROUSEL" | "FOTO" | "STORY"
  pillar String           // "PAIN_BASED" | "BEFORE_AFTER" | "FOUNDER_POV" | "BUDGET_EDUKASI"
                          // | "PROSES_BUKTI" | "OBJECTION_HANDLING" | "KONVERSI" | "PORTFOLIO_LAIN"
  hook String
  caption String?
  cta String?
  reach Int?
  reachNonFollower Int?
  plays Int?
  watchTimeSec Int?
  retentionPct Float?
  likes Int?  comments Int?  saves Int?  shares Int?
  profileVisits Int?  follows Int?  dmClicks Int?  waClicks Int?
  leadsManual Int?            // fallback attribution when Lead rows aren't logged
  qualifiedLeadsManual Int?
  signalScore Float?          // cached engine output
  isOrganicWinner Boolean @default(false)
  adCandidateScore Float?     // cached engine output (Creative Selector)
  experimentId String?
  experiment Experiment? @relation(fields:[experimentId], references:[id])
  importBatchId String?
  importBatch ImportBatch? @relation(fields:[importBatchId], references:[id])
  isExample Boolean @default(false)
  leads Lead[]
  fitScores FitScore[]
  verdicts Verdict[]
}
model IgAccountSnapshot {
  id String @id @default(cuid())
  weekStart DateTime @unique
  followerCount Int?
  reachTotal Int?
  reachNonFollowerPct Float?
  profileVisits Int?
  recommendationStatus String // "LAYAK" | "ADA_KONTEN_DITANDAI" | "PELANGGARAN" | "BELUM_DICEK"
  notes String?
  isExample Boolean @default(false)
}

// ── Algorithm Fit Score ─────────────────────────────────────────
model ContentIdea {
  id String @id @default(cuid())
  title String
  format String
  pillar String
  hook String?
  plannedCta String?
  status String @default("IDE")   // "IDE" | "DIJADWALKAN" | "DIPOSTING" | "DIBUANG"
  igPostId String?                // set once published → links to actuals
  notes String?
  createdAt DateTime @default(now())
  isExample Boolean @default(false)
  fitScores FitScore[]
}
model FitScore {   // exactly one of igPostId / contentIdeaId (enforced in server action)
  id String @id @default(cuid())
  igPostId String?
  igPost IgPost? @relation(fields:[igPostId], references:[id])
  contentIdeaId String?
  contentIdea ContentIdea? @relation(fields:[contentIdeaId], references:[id])
  // 11 dimensions, 0–5 each, descriptive anchors in UI.
  // Recommendation risk stored INVERTED as safety so every dimension points up.
  hook3s Int
  visualStopScroll Int
  painPointClarity Int
  originality Int
  savePotential Int
  sharePotential Int
  profileVisitPotential Int
  waLeadPotential Int
  brandFit Int
  recommendationSafety Int   // 5 = aman, 0 = berisiko
  businessValue Int
  confidence Int             // 0–5, NOT in composite; maps to RENDAH/SEDANG/TINGGI
  weightsJson String         // JSON.stringify of weights at scoring time
  compositeScore Float       // cached, 0–100
  confidenceLabel String
  scoredAt DateTime @default(now())
  isExample Boolean @default(false)
}

// ── Experiments (Content Recovery Planner + Organic→Ads) ────────
model Experiment {
  id String @id @default(cuid())
  title String
  pillar String              // one of the 7 recovery content types
  channel String @default("ORGANIK")   // "ORGANIK" | "IKLAN" (Creative Selector creates IKLAN cards)
  sourcePostId String?       // for IKLAN cards: the organic winner it came from
  // 6 MANDATORY hypothesis fields — non-null; empty string blocked by zod
  whyNeeded String
  signalTargeted String
  expectedAudienceReaction String
  expectedBusinessOutcome String
  successMetric String
  decisionRuleAfterTest String
  status String @default("DRAFT")      // "DRAFT" | "RUNNING" | "PASSED" | "FAILED"
  cycleStart DateTime?
  cycleEnd DateTime?
  resultNotes String?
  createdAt DateTime @default(now())
  isExample Boolean @default(false)
  posts IgPost[]
  verdicts Verdict[]
}

// ── Meta Ads Rescue ─────────────────────────────────────────────
model Campaign {
  id String @id @default(cuid())
  name String @unique         // matched on CSV import
  objective String            // "CHAT_WA" | "LEAD_FORM" | "TRAFFIC" | "LAINNYA"
  status String @default("AKTIF")  // "AKTIF" | "PAUSED" | "SELESAI"
  targetCpqlRibu Int?         // per-campaign override; global default in Setting
  notes String?
  createdAt DateTime @default(now())
  isExample Boolean @default(false)
  adSets AdSet[]
  metrics CampaignMetricDaily[]
  leads Lead[]
  verdicts Verdict[]
}
model AdSet {
  id String @id @default(cuid())
  campaignId String
  campaign Campaign @relation(fields:[campaignId], references:[id], onDelete: Cascade)
  name String
  audienceDesc String?
  status String @default("AKTIF")
  metrics CampaignMetricDaily[]
  @@unique([campaignId, name])
}
model CampaignMetricDaily {
  id String @id @default(cuid())
  campaignId String
  campaign Campaign @relation(fields:[campaignId], references:[id], onDelete: Cascade)
  adSetId String?
  adSet AdSet? @relation(fields:[adSetId], references:[id])
  date DateTime
  spendRibu Int               // ribu rupiah
  impressions Int?
  clicks Int?
  resultsPlatform Int?        // chats started / leads per Ads Manager — NEVER trusted as truth
  importBatchId String?
  importBatch ImportBatch? @relation(fields:[importBatchId], references:[id])
  isExample Boolean @default(false)
  @@unique([campaignId, adSetId, date])
}

// ── Leads (truth foundation) ────────────────────────────────────
model Lead {
  id String @id @default(cuid())
  name String                 // name or WA number
  sourceType String           // "ADS" | "IG_ORGANIK" | "REFERRAL" | "LAINNYA"
  campaignId String?
  campaign Campaign? @relation(fields:[campaignId], references:[id])
  sourceCampaignName String?  // free-text fallback
  igPostId String?
  igPost IgPost? @relation(fields:[igPostId], references:[id])
  status String @default("CHAT_BARU")
  // CHAT_BARU | MERESPONS | BERKUALITAS | SURVEI_TERJADWAL | SURVEI_SELESAI
  // | PROPOSAL_TERKIRIM | NEGOSIASI | CLOSING_MENANG | CLOSING_KALAH | GHOSTING
  signalBudget Int @default(0)        // each 0–20
  signalProjectType Int @default(0)
  signalLocation Int @default(0)
  signalUrgency Int @default(0)
  signalSeriousness Int @default(0)
  qualityScore Int @default(0)        // cached sum 0–100
  qualAnswersCount Int @default(0)    // "answered ≥3 qualification questions"
  estimatedValueJuta Int @default(0)
  lastContactAt DateTime?
  createdAt DateTime @default(now())
  isExample Boolean @default(false)
  events LeadEvent[]
}
model LeadEvent {
  id String @id @default(cuid())
  leadId String
  lead Lead @relation(fields:[leadId], references:[id], onDelete: Cascade)
  eventAt DateTime @default(now())
  type String                 // "STATUS_CHANGE" | "CATATAN" | "FOLLOW_UP"
  fromStatus String?
  toStatus String?
  note String?
}

// ── War Room ────────────────────────────────────────────────────
model WarRoomSession {
  id String @id @default(cuid())
  weekStart DateTime @unique
  metricsJson String          // snapshot of the computed week-vs-week compare
  notes String?
  createdAt DateTime @default(now())
  isExample Boolean @default(false)
  decisions WarRoomDecision[]
}
model WarRoomDecision {        // max 5 per session, enforced in server action
  id String @id @default(cuid())
  sessionId String
  session WarRoomSession @relation(fields:[sessionId], references:[id], onDelete: Cascade)
  decision String             // fixed decision vocabulary ONLY
  subjectType String?         // "CAMPAIGN" | "IG_POST" | "EKSPERIMEN" | "AKUN" | "TRACKING" | "LEAD"
  subjectId String?
  reason String
  status String @default("TERBUKA")   // "TERBUKA" | "SELESAI" | "BATAL"
}

// ── Verdict log (QA/Truth Auditor) ──────────────────────────────
model Verdict {
  id String @id @default(cuid())
  subjectType String   // "AKUN" | "REKOMENDASI" | "TRACKING" | "IG_POST" | "EKSPERIMEN"
                       // | "IDE_KONTEN" | "CAMPAIGN" | "DIAGNOSA"
  subjectId String?
  auditRunId String?
  auditRun AuditRun? @relation(fields:[auditRunId], references:[id])
  igPostId String?
  igPost IgPost? @relation(fields:[igPostId], references:[id])
  experimentId String?
  experiment Experiment? @relation(fields:[experimentId], references:[id])
  campaignId String?
  campaign Campaign? @relation(fields:[campaignId], references:[id])
  decision String      // fixed vocabulary only — recordVerdict() takes a Keputusan union type
  ruleFired String     // machine key, e.g. "ADS_KILL_ZERO_QUALIFIED"
  triggerJson String   // JSON.stringify of the numbers that fired the rule
  confidence String    // "RENDAH" | "SEDANG" | "TINGGI"
  lockedByGate String? // "GERBANG_0" | "GERBANG_1" when the verdict is a lock
  createdAt DateTime @default(now())
  isExample Boolean @default(false)
}

// ── Settings & import bookkeeping ───────────────────────────────
model Setting {
  key String @id        // "fitWeight.hook3s", "winner.savesPercentile", "lead.qualifiedMinScore",
                        // "ads.targetCpqlRibu", "ads.minChatsForVerdict", "ads.cheapChatQualRatePct", ...
  value String
  label String          // Bahasa Indonesia
  description String?
  defaultValue String
  rationale String      // REQUIRED — shown on the Pengaturan screen
  groupKey String       // "fit_weights" | "winner" | "lead" | "gate" | "ads" | "diagnosa" | "warroom"
  updatedAt DateTime @updatedAt
}
model ImportBatch {     // every CSV import is a batch; "Batalkan impor ini" deletes batch + rows
  id String @id @default(cuid())
  type String           // "IG_POST" | "LEAD" | "ADS_METRIC" | "SEED"
  fileName String?
  rowCount Int
  createdAt DateTime @default(now())
  posts IgPost[]
  adsMetrics CampaignMetricDaily[]
}
```

Audit item definitions (question text, "kenapa penting", click-path instructions, blocking flag) are TypeScript constants in `src/lib/domain/auditItems.ts` — product copy versioned in git, not DB rows:

- **META_ACCOUNT (A1–A13, Gate 0):** blueprint A1–A10 plus A11 current restriction-risk self-check, A12 old-FB-account login/lock risk (A3 stays as asset-lineage), A13 domain & tracking-readiness pointer.
- **REKOMENDASI (R1–R6, Gate 0):** R1 IG Settings → Account Status → content flagged non-recommendable (blocking) · R2 community violations/warnings (blocking) · R3 feature/monetization restrictions · R4 watermarked/recycled content share · R5 engagement-bait / risky-hashtag self-check · R6 original-vs-repost ratio.
- **TRACKING (T1–T5, Gate 1):** per blueprint.

**Gate 0 = worst of the latest META_ACCOUNT and REKOMENDASI runs.** No run at all = treated as MERAH ("belum diaudit").

## Step 4b — Screens (all Bahasa Indonesia)

| Route | Screen | Submodule |
|---|---|---|
| `/` | **Ruang Kendali** — 3 gate lights, pipeline value, qualified leads this month, decision queue (≤5, sourced from open War-Room decisions + fresh verdicts), follow-up/ghosting queue, load/delete example data | — |
| `/diagnosa` | **Diagnosa 14 Pertanyaan** — each: status chip + one-line answer + link to detail module | cross-cutting |
| `/audit/akun[/jalankan|/[runId]]` | **Audit Akun Meta** wizard (A1–A13), verdict + ordered repair plan, run history | 1 |
| `/audit/rekomendasi[...]` | **Audit Kelayakan Rekomendasi** wizard (R1–R6) — same wizard component | 2 (Recommendation Eligibility) |
| `/audit/tracking[...]` | **Audit Tracking** wizard (T1–T5) + templates (lead log format, per-campaign opening-message codes, qualification questions) | Gate 1 |
| `/instagram` (+ `/post/baru`, `/post/[id]`, `/impor`, `/snapshot/baru`) | **Instagram** hub — tabs: Log Konten · Diagnosa Distribusi (non-follower trend, format/pillar compare, "terlalu portfolio?" mix analysis, organic winners) · Snapshot Mingguan. 60-second quick-entry form; CSV import | 3 (Distribution Diagnosis) |
| `/skor` (+ `/skor/baru`, `/ide`, `/ide/baru`) | **Algorithm Fit Score** — 11-slider rubric with anchor text, live composite + confidence, predicted-vs-actual scatter, framed everywhere as "hipotesis sinyal, bukan kepastian algoritma" | 4 |
| `/eksperimen` (+ `/baru`, `/[id]`) | **Experiment Planner** — 30-day cycle board by status + coverage matrix across the 7 content types; 6-mandatory-field hypothesis form | 5 |
| `/kampanye` (+ `/baru`, `/[id]`, `/impor`) | **Meta Ads Rescue** — campaign table with full cost chain (spend → cost/chat → CPQL → cost/survey → pipeline value), verdict chips, layered problem diagnosis, cheap-chat-trap flag; Ads Manager CSV import | 6 |
| `/kandidat-iklan` | **Organic→Ads Creative Selector** — ranked shortlist with per-candidate reasoning + suggested ad angle; "Jadikan iklan" creates a pre-filled IKLAN experiment card | 7 |
| `/war-room` (+ `/[sessionId]`) | **War Room Mingguan** — week-vs-week compare (primary metrics first), experiments due, verdicts issued, last week's decisions with done/not-done, then commit ≤5 decisions for next week; sessions persist | 8 |
| `/leads` (+ `/baru`, `/[id]`, `/impor`) | **Leads** — pipeline board, 5-signal scorer, follow-up queue, event timeline | foundation |
| `/pengaturan` | **Pengaturan & Kebenaran** — every threshold/weight with value, default, and rationale; per-item reset | — |
| `/api/template/[jenis]` | CSV template downloads (`ig-post`, `lead`, `ads-metric`) — the only API routes; all mutations are server actions | — |

## Step 4c — Rule engine & scoring logic

Everything decision-related lives in `src/lib/engine/` as **pure TypeScript** — zero imports from Prisma/Next/React, fully unit-testable. Server actions fetch rows, map to engine input types, persist outputs (cached scores + `Verdict` rows). Key modules and functions:

- **`gates.ts`** — `computeGateVerdict(answers)`, `buildRepairPlan()` (ordered: blocking merah → blocking kuning → non-blocking), and **`gateLock(gate0, gate1)`** — the single choke point every verdict surface calls first. Locked ⇒ standard banner "Vonis dikunci — perbaiki akun/tracking dulu. Alasan: […]" with raw data still visible.
- **`igDiagnosis.ts`** — `computeSignalScore(post, weights)` (null when reach missing → "data belum cukup"); `detectOrganicWinners(posts, cfg)` (percentile-based: saves/shares/waClicks ≥ p80 AND ≥1 lead; requires ≥8 posts else `insufficient`); `nonFollowerTrend(points)`; `compareByDimension(posts, "format"|"pillar")`; `contentMixAnalysis(posts)` → `{ portfolioSharePct, tooPortfolioHeavy, missingPillars, countsByPillar }`.
- **`fitScore.ts`** — `computeComposite(ratings, weights)` → 0–100 with per-dimension contributions; `confidenceLabel()`; `comparePredictedActual(scores)` — rank correlation, needs ≥5 scored+published posts, else `insufficient`. The rubric itself is treated as a testable hypothesis.
- **`leadScore.ts`** — `computeLeadQuality(fiveSignals)` (sum, 0–100); `isQualified(lead, {minScore: 60, minQualAnswers: 3})`; `followUpQueue(leads, now, {maxSilentDays: 2})` with ghosting risk.
- **`adsRescue.ts`** — `computeCostChain(campaign, metrics, leads, cfg)` → `{ spendRibu, chats, costPerChatRibu, qualifiedLeads, cpqlRibu, surveys, costPerSurveyRibu, pipelineValueJuta }` where chats/qualified/surveys come from **Lead rows, never `resultsPlatform`** (platform numbers shown side-by-side as a tracking-honesty check); `diagnoseLayer(chain, ctr, gates)` — deterministic ordered tree returning the first failing layer: AKUN → TRACKING → DELIVERY → KREATIF (low CTR, expensive chats) → PENAWARAN/AUDIENS (**cheap-chat trap: chats ≥ threshold AND qualification rate < 30%**) → CTA/friksi (healthy CTR, few chats) → WA_FLOW (chats respond but never reach BERKUALITAS) → FOLLOW_UP (qualified but stalled, high silent-days); `decideCampaign(chain, ctx)` → kill/hold/iterate-specific/scale(+20–30% staged)/move-budget per blueprint §5, guarded by `dataSufficient` (no verdict below spend ≥ 3× target CPQL or ≥10 chats — only legal output is TAHAN_DATA_BELUM_CUKUP).
- **`adCandidates.ts`** — `rankAdCandidates(posts, fitScores, cfg)` → shortlist with `compositeCandidateScore` (weighted: saves rate, shares rate, profile-visit rate, WA clicks, qualified leads attributed, fit-score composite — weights in Settings), `reasons[]` (human sentences citing the numbers), and `suggestedAngle { hookKeep, ctaChange, audienceHypothesis }` — template-based from the post's pillar/format/CTA, phrased as hypotheses. Requires ≥8 posts. "Jadikan iklan" pre-fills an Experiment (channel IKLAN, sourcePostId set, 6 fields drafted for owner to edit — never auto-saved).
- **`warRoom.ts`** — `buildWeeklyCompare(thisWeek, lastWeek)` (primary: qualified leads, surveys, proposals, pipeline value; then diagnostics: non-follower %, saves/shares, WA clicks); `listExperimentsDue()`; `verdictsThisWeek()`. Session commit enforces ≤5 decisions, all from the fixed vocabulary.
- **`diagnosa.ts`** — `answerDiagnosa(input)` → exactly 14 answers `{status, one-sentence answerText, href}`. Mapping: Q1→A1/A4/A11 · Q2→REKOMENDASI audit + snapshot · Q3→A2 · Q4→A5 · Q5→A1 · Q6→A6 · Q7→A9 · Q8→A3/A12 · Q9→`nonFollowerTrend` · Q10→winners + `compareByDimension` · Q11→`contentMixAnalysis.tooPortfolioHeavy` · Q12→`missingPillars` (CTA: start experiment) · Q13→`computeCostChain` qualification-rate vs cheap-chat threshold · Q14→deterministic tree over Q1–Q13 returning the first failing layer. Missing inputs ⇒ `BELUM_ADA_DATA`, never guessed.

The fixed decision vocabulary is one exported `const` array; `recordVerdict()` — the only write path to `Verdict` — takes the `Keputusan` union type, so no verdict can exist outside the vocabulary.

## CSV imports (3 flows, one shared pattern)

Template download → client-side papaparse → auto column mapping (normalized headers; alias table for IG Insights and Ads Manager export names, ID + EN) → zod-validated preview with per-cell errors and duplicate warnings → confirm → server action re-validates and writes one `ImportBatch` + rows in a transaction. Duplicates are skipped-with-report or force-included — owner's explicit choice, never silent. Every batch is listed with "Batalkan impor ini". Ads import auto-creates Campaign/AdSet by name match.

## Seed data

`src/lib/domain/seedData.ts`: 1 audit run per type (META_ACCOUNT includes one blocking merah so the gate lock is demonstrable), ~25 IgPosts across 8 weeks (deliberately portfolio-heavy so `tooPortfolioHeavy` fires), 4 snapshots, ~12 leads, 2 campaigns with 3 weeks of daily metrics (one exhibiting the cheap-chat trap), 2 experiments, 3 fit scores, 1 war-room session. Every row `isExample: true` and prefixed `[CONTOH]`. Load/delete via buttons on Ruang Kendali and Pengaturan (`deleteMany({where:{isExample:true}})` in dependency order). Settings defaults are lazily upserted from `settingsDefaults.ts` (each with written rationale) and survive example-data deletion.

---

## Step 5 + 6 — Build phases with lane assignments

Each phase is small, independently verifiable, and committed separately. Lanes per the routing rules.

| # | Phase (≈effort) | Contents | Lane |
|---|---|---|---|
| M0 | Scaffold + skeleton (½d) | create-next-app via temp dir, sidebar, UI primitives (StatusChip, Card, Table, FormField, Banner), all routes as stubs, `format.ts` | **CHEAP** |
| M1 | Schema + domain + settings (1d) | `schema.prisma` + migration, `enums.ts`, `auditItems.ts`, `settingsDefaults.ts`, `/pengaturan` | **STANDARD** · schema integrity review: **EXPERT** |
| M2 | Rule engine + unit tests (1.5–2d) | all of `src/lib/engine/*` + `tests/engine/*` — built UI-free before any dependent screen | **EXPERT** (this is the money logic) |
| M3 | Three audits + gate lock (1–1.5d) | wizard components, `/audit/akun`, `/audit/rekomendasi`, `/audit/tracking`, `GateLockBanner` | wizard UI: **CHEAP/STANDARD** · gate wiring: **EXPERT** |
| M4 | Leads (1d) | pipeline board, 5-signal scorer, follow-up queue, lead CSV import | CRUD/UI: **CHEAP/STANDARD** · scoring wiring: **EXPERT** (already designed in M2) |
| M5 | Instagram log + diagnosis + import (1.5–2d) | 60-second quick form, charts, diagnosis tab, CSV flow, templates API | forms/tables: **CHEAP** · charts/import: **STANDARD** · verdict wiring: **EXPERT** |
| M6 | Fit Score + Ideas + Experiments (1.5d) | rubric form with anchors, scatter, ideas backlog, hypothesis cards | forms: **STANDARD** · anchor copy: **CHEAP** · rubric/pred-vs-actual wiring: **EXPERT** |
| M7 | Meta Ads Rescue (1.5–2d) | campaign CRUD, Ads Manager CSV import, cost-chain table, layer diagnosis + verdicts | CRUD/UI: **STANDARD** · diagnosis & verdict wiring: **EXPERT** |
| M8 | Organic→Ads Creative Selector (½d) | shortlist screen, pre-filled experiment card flow | UI: **STANDARD** · ranking wiring: **EXPERT** (designed in M2) |
| M9 | War Room Mingguan (1d) | weekly compare, session commit (≤5 decisions), history, accountability checkboxes | UI: **STANDARD** · compare logic: **EXPERT** (designed in M2) |
| M10 | Diagnosa-14 + Ruang Kendali + seed + QA sweep (1–1.5d) | `/diagnosa`, dashboard, seed actions, **final anti-hallucination pass** (every thin-data surface must say "Tahan — data belum cukup") | dashboard: **STANDARD** · Q14 tree + final audit: **EXPERT** |

Everything expert-lane in M3–M10 is *wiring* of logic designed and unit-tested once in M2 — expert reasoning is spent once, not re-spent per screen.

## Verification

- **Unit tests (vitest):** gate logic incl. unanswered-blocking and no-run cases; lock propagation through every `decide*`; thin-data cases (7 posts, 1 snapshot, 4 scored posts, low-spend campaign ⇒ all yield TAHAN_DATA_BELUM_CUKUP); composite math (weights snapshot respected, contributions sum); lead boundaries (59/60 score, 2/3 answers); cheap-chat trap boundary; content-mix exactness; decision-vocabulary type enforcement; diagnosa returns exactly 14 and all-BELUM_ADA_DATA on empty DB.
- **E2E walkthrough (scripted checklist):** fresh DB → empty states honest everywhere → load example data → gate lock visible (seed has blocking merah) → fix the blocking item in a new audit run → lock lifts on `/instagram`, `/eksperimen`, `/kampanye` → add a post via quick form with a stopwatch (target ≤60s) → template download/upload/preview/confirm/cancel-batch round-trip → score a post, check scatter → experiment save blocked at 5 of 6 fields → move a lead through pipeline, pipeline value updates, ghosting queue fires after 2 silent days → campaign with cheap chats but 0 qualified shows the trap flag and iterate-offer verdict → creative selector shortlist → "jadikan iklan" pre-fills card → war-room session commits 5 decisions and they appear on Ruang Kendali → `/diagnosa` answers all 14 with working links. Plus `tsc --noEmit`, `npm run test`, prisma studio spot-check that Verdict rows carry `ruleFired` + `triggerJson`.

## Risks & mitigations

1. **Manual entry burden** (biggest product risk) → 60-second form (IG Insights display order, Tab-through numeric block, button groups not dropdowns, copy-from-last-post, save-and-new default, only 5 truly required fields — the rest nullable with graceful "data belum cukup" degradation).
2. **Rubric self-deception** → pred-vs-actual gated behind ≥5 posts, rank-based, copy says "hipotesis sinyal" everywhere.
3. **Platform numbers vs truth** → cost chain computed from Lead rows; `resultsPlatform` displayed alongside as a tracking-honesty check, never used for verdicts.
4. **Gate-lock leakage** → single `gateLock()` choke point + a unit test per verdict surface.
5. **Attribution double-counting** → post qualified-leads = `max(linked Lead rows, qualifiedLeadsManual)`, implemented once, documented on the form.
6. **SQLite gaps** (no enums/Json) and **scaffold-in-non-empty-repo** → handled by design (§ stack).

## Explicitly out of scope for Goal 1

Google Ads · TikTok · Threads · Competitor Intelligence · live APIs · scraping · WhatsApp automation · auth/multi-user · ERP integration. No code, routes, or schema for any of these.
