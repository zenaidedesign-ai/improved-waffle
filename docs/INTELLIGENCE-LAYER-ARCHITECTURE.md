# Intelligence Layer Architecture — Zenaide Revenue Engine

> Companion to `docs/DATA-ARCHITECTURE.md`. Reads in the same house style: engine logic is pure TypeScript under `src/lib/engine/*`, every number carries its source, and the system never pretends data is live. This document is DESIGN ONLY — where it sketches a data model it is CONCEPTUAL (entities + relations), explicitly **not** a migration. No code, schema, migration, page, PR, or deploy was produced with it.

> **Note on the module list.** The commissioning request ended at "Design the following Intelligence Layer modules" — the enumerated list did not arrive. The fourteen modules in §5 were therefore derived from first principles to cover all 13 strategic questions, all ~21 data sources, and all 7 honesty rules. If a specific module list was intended, send it and this design will be reconciled against it.

---

## 1. Purpose & Thesis

Zenaide already has the *operating tools*: gate audits with a single `gateLock()` choke point, Instagram diagnosis + coach, algorithm-fit score, the 30-day experiment planner, Lead Intelligence, the multi-channel Ads verdict engine, Competitor Lab, the Knowledge Engine, War Room, the Data Reliability engine, and the 14-day Real-Data Pilot. Each answers *"what should I do right now?"*. None of them **remember why they were right**, notice when an old truth quietly goes stale, or get measurably smarter next month than they were this month.

**Thesis, one sentence:** the Intelligence Layer turns Zenaide's operating tools into a *learning business brain* that holds explicit, confidence-scored **beliefs** about the business, earns or loses confidence in them only through real outcomes, and structurally refuses to fake certainty — so that every month it knows *more true things about winning revenue* than the month before, and says so plainly when it does not.

It is a **reasoning layer wrapped around the existing Knowledge Engine**, not a new store and not a new UI. Every output is still a `VerdictProposal` (a `KEPUTUSAN` decision + a `KEYAKINAN` chip + `ruleFired` + numeric `trigger` + a Bahasa `explanation`) or a `Learning`. It still passes through `gateLock()` first. Nothing here requires a live API — all data stays manual / CSV / screenshot / public-link, exactly as today.

---

## 2. The Belief System

### 2.1 One canonical rule: two axes, not one ladder

The ten epistemic states the honesty charter demands are **not ten values of one enum**. They are the union, surfaced in the UI, of two different things a claim carries at all times:

- **Axis A — EVIDENCE TYPE** (what *feeds* a belief; lives only on an `EvidenceItem`, never promoted, only accumulated): `fact` · `observation` · `owner-assumption`.
- **Axis B — BELIEF MATURITY** (how far a *claim* has matured; lives only on a `Belief`): `hypothesis` → `pattern` → `emerging-belief` → `strong-belief` → `proven-belief`, with two side-exits `rejected-belief` and `outdated-belief`.

3 evidence types + 7 maturity states = the 10 states. This is the single authoritative statement resolving the "is `fact` a state a belief holds, or a property of evidence?" ambiguity: **`fact`/`observation`/`owner-assumption` are EvidenceItem properties; `hypothesis…outdated` are Belief.maturity values.** A Belief never *is* its evidence; evidence is *attached to* it, and maturity is a pure re-derivable function of the attached evidence.

This generalizes the existing split exactly: `EvidenceItem.type` is derived from the existing `LEARNING_SOURCE` + `DATA_SOURCE` reliability. `DATA_INTERNAL` ground truth that led to delivered revenue → `fact`; any measured internal or public data point → `observation`; `PENGETAHUAN_OWNER` → `owner-assumption`.

### 2.2 The ten states defined

| State | Axis | Meaning | Existing anchor |
|---|---|---|---|
| `fact` | A (evidence) | DATA_INTERNAL ground truth or a delivered-revenue-confirmed datum | `DATA_INTERNAL` + won `Lead` |
| `observation` | A (evidence) | A single measured data point, internal or public | any measured metric row |
| `owner-assumption` | A (evidence) | Noor's unverified knowledge | `PENGETAHUAN_OWNER` |
| `hypothesis` | B (maturity) | A testable claim with `supportingData` but no repetition (n≥1) | `HIPOTESIS`, `strength=LEMAH` |
| `pattern` | B (maturity) | Repetition detected, n≥2 consistent — "≥2 kali" | `strengthCap`, BERKEMBANG boundary |
| `emerging-belief` | B (maturity) | Pattern + business-impact movement, sustained | `BERKEMBANG` |
| `strong-belief` | B (maturity) | Sustained across ≥2 time windows, reliable, fresh | `BERKEMBANG`, high `KEYAKINAN` |
| `proven-belief` | B (maturity) | Owner-confirmed, DATA_INTERNAL, repeated **and** revenue-linked | `TERBUKTI` (owner-only) |
| `rejected-belief` | B (side-exit) | Proven *wrong* by counter-evidence or owner override → tombstoned | — (new, closes gap) |
| `outdated-belief` | B (side-exit) | Was true, no longer fresh; may revive | mirrors `applyAuditAging` decay |

**Stored projection.** The existing `LEARNING_STRENGTH` remains the label: `LEMAH` = hypothesis; `BERKEMBANG` = pattern/emerging/strong; `TERBUKTI` = proven. No new strength vocabulary is introduced — the Belief Engine *computes* maturity, and strength is its projection via `strengthCap(n)` (n≥8 → BERKEMBANG; TERBUKTI never auto-assigned).

**The distinction that must never blur:** `rejected` = *proven wrong* (tombstoned, no auto-revival). `outdated` = *no longer fresh, possibly still true* (may revive, one rung lower — see the `outdated → prior maturity − ONE rung` edge in §2.3).

### 2.3 The lifecycle state machine

Every transition has a **trigger** (event) and a **guard** (must hold, else no-op → the claim stays put and the surface reads `TAHAN_DATA_BELUM_CUKUP`). Maturity is never sticky; it always re-derives from current evidence, so downgrades are first-class.

```
∅ ─────────────▶ hypothesis
   trigger: new insight logged / suggestLearnings fires
   guard:   supportingData present (WAJIB — "tanpa ini cuma opini")
            AND a falsifier is declared (§7)

hypothesis ─────▶ pattern
   trigger: repeated occurrence
   guard:   n ≥ 2 consistent OUTCOME EvidenceItems
            AND no unresolved open counter-evidence
   (below this it stays hypothesis — the anti-one-event cap)

pattern ────────▶ emerging-belief
   trigger: repetition + movement on a business-outcome factor
   guard:   sampleGate(n) ≥ 0.5  AND  reliability ≥ SEDANG
            AND business impact is an OUTCOME metric, not activity/vanity

emerging ───────▶ strong-belief
   trigger: sustained repetition across time
   guard:   consistency across ≥ 2 independent time windows (recency)
            AND source fresh within FRESHNESS_DAYS
            AND zero open counter-evidence

strong ─────────▶ proven-belief   [MACHINE MAY ONLY NOMINATE]
   trigger: owner confirmation on a belief that led to REAL revenue
   guard:   ≥1 DATA_INTERNAL `fact` EvidenceItem
            AND OwnerFeedback(confirm)
            AND a RevenueLink belief with repeats ≥ 2 (§3 cap A, S1 fix)
   (machine surfaces "siap dipromosikan?"; only Noor commits —
    exactly the TERBUKTI owner-promotion boundary)

any ────────────▶ rejected-belief
   trigger: counter-evidence crosses threshold
            OR OwnerFeedback(reject)
            OR a linked Prediction resolves false
   guard:   counter-evidence outweighs support under scoreBelief
   → tombstoned (§4), NOT deleted

any ────────────▶ outdated-belief
   trigger: freshness breach with no refresh (applyAuditAging-style decay)
   guard:   newest EvidenceItem ageDays > FRESHNESS threshold
            AND no confirming recent evidence

outdated ───────▶ (prior maturity − ONE rung)      [S8 fix]
   trigger: fresh confirming evidence arrives
   guard:   new EvidenceItem within freshness window
   NOTE: revival re-enters ONE rung BELOW the prior state and must
         re-earn the top rung through the normal repeat gate.
         No single datapoint instantly restores strong/proven.

rejected ───────▶ hypothesis   [OWNER ONLY]
   trigger: owner resurrects with NEW DATA_INTERNAL evidence
   guard:   re-enters as hypothesis carrying its tombstone reference
   (no automatic revival edge exists for rejected beliefs)
```

Downgrades run the ladder in reverse (`strong → emerging → pattern → hypothesis`) whenever consistency erodes or counter-evidence accumulates. Promotion is always earned; demotion is always automatic.

---

## 3. The Confidence Engine

Confidence is a **single shared function** — `scoreBelief()` in `belief/score.ts` — that replaces the four ad-hoc per-rule thresholds scattered through `suggestLearnings`. It reuses `sourceConfidence()`, `checkFreshness()`, `strengthCap()`, the `RELIABILITY` table, and `TRUTH_PHRASES` rather than re-deriving them. It surfaces to the UI only as a `KEYAKINAN` chip (RENDAH/SEDANG/TINGGI) plus a `ConfidenceTrace` — every belief records *which factors moved its number and why*, in Bahasa. That trace is the anti-black-box invariant: nothing on screen is a bare number.

### 3.1 The ten factors

All ten mandated factors are consumed; none is decorative.

1. **Data-source reliability** — `sourceConfidence(dataSource).pct`
2. **Data freshness** — `checkFreshness(kind, lastUpdate)`
3. **Sample size** — n of OUTCOME EvidenceItems (**multiplicative gate**, not a delta)
4. **Consistency** — variance across the repeated OUTCOME observations
5. **Counter-evidence** — count of *open* contradicting EvidenceItems
6. **Recency** — age of the most recent supporting *event* (distinct from data freshness)
7. **Owner confirmation** — `OwnerFeedback(confirm)` (**conditional**, see §3.3 S6 fix)
8. **Business impact** — qualified-lead / rupiah relevance, never vanity
9. **Repeated occurrences** — distinct pattern hits (ties to the ≥2 → BERKEMBANG rule)
10. **Led to real revenue** — the strongest earned signal (**hard guard**, not a delta, see §3.3 S1 fix)

### 3.2 Transparent scoring — pseudocode

The core correction from the honesty audit: **positive factors cannot buy their way past missing data.** Sample size and calibration are *multiplicative gates* applied to the additive score; a thin belief is *scaled down*, never *topped up*.

```
BASE = 30   // asserting nothing earns you little

function scoreBelief(b):
  trace = []
  add = (factor, delta, reasonID) => trace.push({factor, delta, reason: reasonID})

  // ── 8 ADDITIVE qualitative deltas ──
  add("source",      map(sourceConfidence(b.dataSource).pct, [40..100] -> [-15..+18]))
  add("freshness",   fr.stale ? -18 : fr.ageDays==null ? -12 : +6)     // checkFreshness
  add("consistency", b.consistency>=0.8 ? +12 : b.consistency>=0.5 ? +3 : -8)
  add("counter",     openCounter==0 ? +8 : -12 * openCounter)
  add("recency",     lastEventAge<=14 ? +6 : lastEventAge<=45 ? 0 : -10)
  add("owner",       ownerPoints(b))          // conditional — see §3.3, cap F
  add("impact",      b.impactTier=="REVENUE" ? +10 : b.impactTier=="QUALIFIED" ? +5 : 0)
  add("repeats",     b.repeats>=3 ? +10 : b.repeats>=2 ? +5 : -4)

  raw = clamp(BASE + sum(trace.deltas), 0, 100)

  // ── MULTIPLICATIVE GATES: missing data SCALES the score, never compensated ──
  gated = raw
        * sampleGate(b.nOutcome)              // n>=8 -> 1.0 | 2..7 -> 0.5 | <2 -> 0.2
        * calibrationGate(b.cohort)           // §4.4 — decays toward 0.5 while uncalibrated

  // ── HARD CAPS: can only LOWER, each records a capApplied note ──
  return applyCaps(b, gated, trace)
```

`map()` is linear interpolation. Every `add` stores a Bahasa reason so the DataTruthPanel / verdict card shows the exact factor movements. `sampleGate` is the structural answer to *"weak evidence bought high confidence"*: an owner-confirmed, high-impact, thrice-repeating belief at n=3 has `raw≈71` but `gated ≈ 71 × 0.5 = 35` → RENDAH. It cannot reach decision-grade until real samples exist.

### 3.3 The hard caps — honesty made structural

Caps run *after* scoring and can only lower. Each is a structural impossibility, not a discipline:

- **Cap A — Single event never exceeds `pattern`.** `n<2 or repeats<2` ⇒ ceiling `pattern`, `KEYAKINAN` ≤ RENDAH, `TRUTH_PHRASES.notEnough`. Mirrors `strengthCap`.
- **Cap B — Vanity never reaches an outcome tier.** A belief whose OUTCOME variable is a vanity metric (likes/reach/followers/impressions) is rejected at construction. Vanity EvidenceItems are `evidenceRole=DIAGNOSTIC`, marked `contributesToScore=false` **at ledger-attach time**, and therefore contribute **zero to all ten factors** — not just to impact/revenue but also to consistency, repeats, and recency (S5 fix). "High reach 3 weeks running" adds nothing; it can only ever render as a diagnostic pointer: *"sinyal kuat, hasil bisnis nol — bukan sukses."*
- **Cap C — Competitor observation capped, transitively.** Any belief with an `OBSERVASI_KOMPETITOR` EvidenceItem **anywhere in its derivation chain** inherits `derivedFromPublic=true`, propagated through `belief/evidence.ts`, and is permanently capped at maturity `observation`/strength BERKEMBANG and confidence ≤ SEDANG — *regardless of downstream internal evidence* (S4 fix). Public → hypothesis → we test → we win cannot launder a competitor guess into a proven internal belief; the derived belief still wears the public cap.
- **Cap D — Source-reliability ceiling.** `confidence ≤ RELIABILITY[dataSource].maxPct`: MANUAL ≤ 90, SCREENSHOT ≤ 85, PUBLIC_LINK ≤ 70. The engine can never out-confidence its evidence. `API_RESMI` is BELUM AKTIF and cannot be claimed.
- **Cap E — `verifyBeforeBudget` is a hard choke, not a caption (S10 fix).** A belief resting on any `verifyBeforeBudget=true` source (SCREENSHOT/PUBLIC_LINK) is **blocked from ACT-lane citation entirely** until an explicit `OwnerFeedback(verify)` EvidenceItem is attached — a state transition modeled on `gateLock`, not merely a stamped phrase. Unverified data may inform TEST-THIS experiments; it may never issue an instruction.
- **Cap F — Owner confirmation unlocks, it does not supply (S6 fix).** On a non-`DATA_INTERNAL` belief, `OwnerFeedback(confirm)` contributes **0 confidence points** and caps the belief at SEDANG until independent DATA_INTERNAL evidence co-signs. `ownerPoints()` returns +14 only when `sourceType==DATA_INTERNAL`; otherwise 0. Owner confidence is a hypothesis-generator, not a truth source — this closes the self-certifying loop where Noor's assumption + Noor's confirmation manufactured certainty.
- **Cap G — Proven requires ALL, and revenue must be corroborated (S1 fix).** `proven-belief` / TERBUKTI is reachable only when: `sourceType==DATA_INTERNAL` AND `OwnerFeedback(confirm)` AND zero open counter-evidence AND `n≥8` AND a linked **RevenueLink belief with `repeats≥2`**. Revenue linkage is itself a Belief capped at `observation` unless ≥2 *independent* won projects share the same `claimSignature`, and the attribution method is recorded as its own EvidenceItem with its own reliability. **One lucky close never mints a proven belief** — that would be the single-event leak wearing a revenue costume.
- **Cap H — Algorithm/platform-signal beliefs are permanently TEST-THIS (S7 fix).** Beliefs in the signal-hypothesis category ("posting time → qualified leads", "hook type → reach") are hard-capped so they can *never* enter the ACT lane, regardless of maturity. Distribution signals inform experiments; they never become instructions. This is the structural form of *"never claim to know the algorithm"* — the "KORELASI, BUKAN SEBAB" label is backed by a routing bound, not just a string.

---

## 4. Evidence & Provenance

Three append-only logs make *"why does the system believe this?"* always answerable, and one loop makes confidence an *earned track record* rather than an assertion.

### 4.1 Append-only Evidence Ledger

Every `EvidenceItem` is immutable. Corrections **add** a new item; nothing is ever edited or deleted, so provenance never has holes. Each item carries `sourceType`, `reliabilityPct`, `freshnessAgeDays`, `polarity` (supports/contradicts), `evidenceRole` (OUTCOME/DIAGNOSTIC), `contributesToScore`, and `derivedFromPublic`. Vanity and unverified items are attached but flagged non-contributing at attach time (Caps B, E).

### 4.2 Belief Revision history

Every maturity transition writes a `BeliefRevision`: `{from, to, trigger, ruleFired, evidenceSnapshot, factorSnapshot, confidenceBefore/After, actor: system|owner, timestamp}`. Replaying revisions reconstructs a belief's entire life. `ruleFired`+`trigger` reuse the `VerdictProposal` shape, so provenance renders inside existing verdict cards with no new UI. A **provenance answer** = current maturity + top contributing EvidenceItems + the last decisive revision + which of the ten factors dominated, phrased through `TRUTH_PHRASES` when thin/stale/screenshot/public.

### 4.3 Prediction tracking & the calibration loop

When a belief implies a directional claim, it mints a falsifiable `Prediction` with a `dueAt`. **Two horizon classes** (Completeness 4.2 fix):

- **Fast signals** — freshness-tied horizons: ADS 3d, INSTAGRAM 7d, LEAD_FOLLOWUP 2d.
- **Revenue/close predictions** — a distinct **long** horizon tied to the typical sales cycle (weeks–months), because a lead→won project resolves far slower than any freshness threshold. Without this, revenue-linked predictions — the only path to proven — would all expire `UNSCORABLE`.

When real data arrives (Pilot / War Room cadence), due predictions resolve to `HIT | MISS | UNSCORABLE` and feed calibration.

**Calibration = stated confidence converges to measured accuracy.** Predictions are bucketed by cohort and stated-confidence band; hit-rate per band is computed. Because a boutique produces few resolved predictions:

- **Pool first, split later (Completeness 4.1 fix).** Early on there is a *single global* calibration bucket; it splits into per-`(category, sourceType)` cohorts only when volume allows. Below `MIN_DENOM=5` resolved predictions, calibration itself outputs `TAHAN_DATA_BELUM_CUKUP` — the Auditor will not judge its own calibration on thin data, and it says so indefinitely until the threshold is reached rather than pretending to be calibrated.
- **Uncalibrated costs confidence (S3 fix).** `calibrationGate(cohort)` starts near 1.0 but **decays toward 0.5 as a belief ages without any resolved prediction**. An unvalidated claim is *increasingly distrusted*, not held neutral. This is what prevents the calibration spine from being "advertised but never running."
- **Miscalibration is structural, not cosmetic.** If TINGGI predictions resolve correct <~70% (or RENDAH resolves >~70%, over-caution), the effective confidence ceiling for that cohort is lowered until the hit-rate recovers, and a War Room / Top-5 item fires verbatim: *"Sistem terlalu percaya diri di kategori KANAL: klaim TINGGI, kenyataan 55%."* It reports the gap; it never silently corrects.

### 4.4 Rejected & outdated memory

- **Tombstones.** A `rejected-belief` is never deleted — it becomes a tombstone keyed by a normalized `claimSignature`, carrying the original insight, the falsifier that killed it, the counter-evidence, and `rejectedAt`. Before `suggestLearnings` emits anything, it consults the tombstone index; a match surfaces as *"sudah pernah ditolak (alasan X, tanggal Y)"* instead of being re-proposed as novel. **Signature collisions and near-misses are surfaced to Noor, never auto-resolved (S9 fix)** — false-novelty is the default failure mode of fuzzy matching, so a human adjudicates fingerprint ambiguity. Only the owner may resurrect a tombstone, and only with new DATA_INTERNAL evidence (it re-enters as `hypothesis`).
- **Decay.** `outdated-belief` is driven by `FRESHNESS_DAYS` + recency: TERBUKTI/proven → BERKEMBANG, confidence one step down, `stale` phrase stamped, mirroring `applyAuditAging` (HIJAU→KUNING at 30d). It keeps its history but stops driving budget until re-confirmed, and revival re-enters one rung lower (see the `outdated →` edge in §2.3, S8).

---

## 5. The Modules

All modules live under `src/lib/engine/belief/*` and are thin: they call `scoreBelief`/lifecycle instead of local heuristics. `gates.ts` `gateLock()` stays upstream of all of them.

### 5.1 Belief Engine (`belief/lifecycle.ts`)
- **Responsibility.** Owns the §2 state machine — transitions, guards, emits `BeliefRevision`s; wraps the Knowledge Engine as its reasoning layer (a `Learning` becomes the projected view of a `Belief`).
- **Consumes.** EvidenceItems, `OwnerFeedback`, `Prediction` resolutions.
- **Produces.** `Belief` maturity + revisions.
- **Honesty caps.** Maturity is a pure function of current evidence (nothing sticky); machine may *nominate* proven, never commit it.

### 5.2 Confidence Engine (`belief/score.ts`)
- **Responsibility.** The single `scoreBelief()` over all ten factors; the one place thresholds live.
- **Consumes.** A belief's EvidenceItems + cohort calibration state.
- **Produces.** `confidence` (0–100 → `KEYAKINAN`), `maturityTier`, `ConfidenceTrace`, `capApplied` notes.
- **Honesty caps.** Multiplicative sample/calibration gates + all eight hard caps (§3.3).

### 5.3 Evidence Ingestion (`belief/evidence.ts`)
- **Responsibility.** Normalize any signal into an `EvidenceItem`; derive evidence-type + reliability from `dataTruth.ts`; propagate `derivedFromPublic`.
- **Consumes.** Lead, IgPost, Campaign, Competitor, OwnerFeedback, War-Room decisions — the ~6 *wired* sources — plus the **Capture-Gap Register** (§8) for the *named-but-unfed* ones.
- **Produces.** Immutable ledger rows.
- **Honesty caps.** Vanity → `contributesToScore=false`; `verifyBeforeBudget` → attach in a blocked state; every item carries reliability + freshness.

### 5.4 Pattern Miner (`belief/patterns.ts`)
- **Responsibility.** Enumerate associations (area → qualified rate, pillar → survey-stage lead) and **propose HYPOTHESIS only** — generalizes the pillar/channel rules of `suggestLearnings`.
- **Consumes.** DATA_INTERNAL aggregates (Leads, IgPosts, Campaigns).
- **Produces.** `hypothesis`-maturity beliefs, `sourceType=DATA_INTERNAL`, `strength=strengthCap(n)`, always labeled *"KORELASI, BUKAN SEBAB — perlu uji"*, routed to the 30-day experiment planner or a `SPLIT_TEST` verdict.
- **Honesty caps.** Skips candidates below `MIN_SAMPLE`/`MIN_DENOM=5`; applies a minimum-effect and multiple-comparison (Bonferroni) guard; flags single-period candidates *"mungkin kebetulan (1 periode)"*; never emits above `pattern`; algorithm-category proposals inherit Cap H.

### 5.5 Belief Revision (`belief/ledger.ts`)
- **Responsibility.** Append-only writes, tombstone index, provenance assembly.
- **Consumes.** Transition events from the Belief Engine.
- **Produces.** `BeliefRevision` history, tombstones, the "why do we believe this?" answer.
- **Honesty caps.** No deletes/edits; tombstone collisions surfaced to owner (S9).

### 5.6 Owner-Feedback Loop (`belief/feedback.ts`)
- **Responsibility.** Capture the missing owner-override signal. An `OwnerOverride` relates to the exact engine output it contradicts (verdict/score/triage id + surface); War-Room decisions are the same first-class evidence type.
- **Consumes.** Owner confirm/reject/override/verify actions; later real outcomes that resolve them.
- **Produces.** An owner-assumption Belief (capped BERKEMBANG); on outcome-resolution-as-owner-right, a `[PILOT]`-prefixed learning + a `ThresholdTuningFlag` naming the `ruleFired` and constant (the 30% qualification threshold, `MIN_DENOM=5`, `strengthCap` n≥8, a `FRESHNESS_DAYS` count).
- **Honesty caps.** Tuning flags surface only at ≥2 corroborating owner-right overrides (anti-one-event); thresholds become *learnable but never silently self-modifying* — owner-approved, mirroring TERBUKTI promotion.

### 5.7 Win/Loss Intelligence (`belief/winloss.ts`)
- **Responsibility.** Mine won vs lost Leads joined to `LeadEvent` transitions and origin content; derive `WinProfile` / `LossProfile` beliefs across area, buyer type, budget clarity, objection, channel, attracting-content, offer variant.
- **Consumes.** `Lead.status ∈ {won,lost}`, `LeadEvent`, `Objection`, `estimatedValueJuta`, attributed content.
- **Produces.** Profile beliefs that boost Lead Intelligence closing-probability *as a labeled adjustment*, and feed Top-5 (*"hindari pola kalah X di area Y"*) + the experiment planner as hypotheses.
- **Honesty caps.** A dimension "distinguishes" only with n ≥ `MIN_DENOM=5` on *both* won and lost sides; below that → `TAHAN_DATA_BELUM_CUKUP`, *"sistem tidak menebak."* Dimensions depending on unfed sources (structured loss reason, project outcome, proposal result, WhatsApp language) stay `owner-assumption`.

### 5.8 Market Brain (`belief/market.ts`)
- **Responsibility.** A **belief-cluster view** over Learnings: `MarketCluster` per `dimension` (AREA | BUYER_TYPE), each with eight `ClusterAttribute` slots (budgetRange, commonProjectType, commonPainPoint, commonObjection, bestOffer, bestContentAngle, bestChannel, closingSignal). Closes the "AREA is only a 0–20 signal" gap with first-class keys (SURABAYA_BARAT, PAKUWON, CITRALAND, GRAHA_FAMILY, SIDOARJO, GRESIK, MALANG, BATU, JATIM_LAINNYA, JATENG-`qualifiedLeadsOnly`).
- **Consumes.** `signalLocation`, `signalProjectType`, `estimatedValueJuta`, `PainPoint.audience`, `Objection`, campaign performance.
- **Produces.** Typed ClusterAttribute beliefs; seeds are `owner-assumption`/PENGETAHUAN_OWNER, `supportingData="asumsi owner, belum ada data"`, capped RENDAH–SEDANG, promoted only by real leads.
- **Honesty caps.** Epistemic ceiling by sample (n=1 → observation, never pattern — *"satu kejadian bukan pola"*); at n=3 sample + counter-evidence terms clamp at SEDANG; competitor/public sources can never lift a cell; JATENG suppresses all suggestions except HOT/URGENT triaged leads.

### 5.9 Content & Channel Attribution (`belief/attribution.ts`)
- **Responsibility.** Model attribution as **testable signal hypotheses, never algorithm claims**: `AttributionBelief{ pillar|campaignId, hypothesisText, signalObserved, qualifiedLeadsLinked, revenueLinkedJuta, funnelStageMoved }`.
- **Consumes.** `IgPost` manual lead-attribution + `signalScore` + `FitScore`; `Campaign` → attributed qualified Lead → won value.
- **Produces.** Beliefs phrased as signal hypotheses (*"HIPOTESIS: pillar 'proses-renovasi' correlates with survey-stage qualified leads (n=6, 4 booked survey)"*), judged strictly on qualified-lead creation and funnel movement, reusing the 30% qualification threshold.
- **Honesty caps.** Cap H (permanently TEST-THIS, never ACT). A campaign belief inherits the ads-verdict health state and is gate-locked: tracking gate MERAH forces `PERBAIKI_TRACKING_DULU` — you cannot attribute through broken tracking. A pillar with reach but zero survey-stage leads produces a *negative* belief, capped LEMAH.

### 5.10 Sales / Objection Intelligence (`belief/sales.ts`)
- **Responsibility.** Correlate objections and silence patterns with ghosting/loss to produce objection-risk beliefs.
- **Consumes.** `Objection`, `LeadEvent` lost-transitions, `silentDaysOf`, triage state.
- **Produces.** Objection-risk beliefs feeding Lead Intelligence and the senior coach; closing-probability *adjustments* (labeled, never new certainty).
- **Honesty caps.** Depends on structured loss reason (unfed) → risk beliefs stay `owner-assumption` until `LossReason` is captured; closing-probability remains an "estimasi kasar berlabel."

### 5.11 Competitor Synthesis (`belief/competitor.ts`)
- **Responsibility.** Synthesize Competitor Lab `hookPattern`/`marketGap` into hypotheses for *our* experiments — **public observation only**.
- **Consumes.** `CompetitorAnalysis` (inherently PUBLIC_LINK).
- **Produces.** `observation`-capped, `derivedFromPublic=true` beliefs routed exclusively to TEST-THIS / the experiment planner.
- **Honesty caps.** Cap C (transitive competitor cap) + Cap E (`verifyBeforeBudget`). Never treated as private competitor performance; never a data-pattern about our market; `publicOnly` phrase always attached.

### 5.12 Assumption Health Monitor (`belief/health.ts`)
- **Responsibility.** `assessAssumptionHealth()` scans all beliefs for *weakening* (a trend), not just current confidence.
- **Consumes.** Freshness decay, new counter-evidence + source-conflict, occurrence stall, owner-override pressure, revenue disconnect.
- **Produces.** A short ranked *"Asumsi yang melemah"* list: belief, old→new confidence, one plain reason (*"data survei sudah 40 hari, lebih lama dari batas"*), suggested transition (strong→emerging, → outdated/rejected).
- **Honesty caps.** Demotion is automatic; promotion never is; TERBUKTI beliefs can be *flagged* weakening but only Noor can un-prove them. Exception-only display (max 3, in the weekly report) — never a standing dashboard of doubt.

### 5.13 Strategy Advisor (`belief/strategy.ts`)
- **Responsibility.** `synthesizeStrategy()` assembles existing verdict producers (`buildTop5`, `decideCampaign`, `weeklyReport`, `decideIgWinner`, pilot) into three horizon buckets, attaching the beliefs each rests on — it invents nothing.
- **Consumes.** Existing verdicts + their citedBeliefs.
- **Produces.** `StrategyRecommendation` = `VerdictProposal` + `citedBeliefs[]` + a `lane`.
- **Honesty caps.** **Two structurally separated lanes.** **ACT** — every cited belief is proven/strong (TERBUKTI or BERKEMBANG ≥2 occurrences, ≥ SEDANG, not stale, not `verifyBeforeBudget`, not algorithm-category). **TEST THIS** — anything resting on hypothesis/observation/emerging/public/manual-screenshot data, forced there via Caps E and H, routed into the 30-day planner. Horizons: HARI INI (gate locks, `PERBAIKI_*`, HOT/URGENT), MINGGU INI (campaign/funnel/mix verdicts), KUARTAL INI (**only** proven, repeated, revenue-linked beliefs — deliberately sparse). Empty ACT lane says *"belum ada yang cukup kuat untuk diputuskan"* — silence is a valid output.

### 5.14 Truth / Calibration Auditor (`belief/prediction.ts` + `belief/auditor.ts`)
- **Responsibility.** Mint predictions, score outcomes, run the §4.3 calibration loop, fire miscalibration warnings.
- **Consumes.** Belief-emitted predictions + real resolved outcomes.
- **Produces.** `Prediction` resolutions, `CalibrationBucket` stats, verbatim over/under-confidence warnings, `[PILOT]` decay learnings.
- **Honesty caps.** `TAHAN` below `MIN_DENOM=5` (indefinitely if never reached); pooled bucket first; `calibrationGate` decay for uncalibrated cohorts; reports the gap, never silently corrects.

---

## 6. Answering the 13 Strategic Questions

Every answer is a `VerdictProposal` or `Learning` — no new page. The confidence ceiling column is the *honest maximum* the design permits given the evidence realistically available today.

| # | Question | Module(s) | Belief type | Honest confidence ceiling |
|---|---|---|---|---|
| 1 | Why do we WIN? | Win/Loss (5.7) + War Room `buildWorkedFailed` | WinProfile | SEDANG until n≥5 both sides + revenue-linked → TINGGI |
| 2 | Why do we LOSE? | Win/Loss (5.7) + `detectFunnelLeak` | LossProfile | SEDANG; needs structured `LossReason` for higher |
| 3 | Which leads deserve Noor? | Lead Intelligence triage + "Tangani Noor sendiri" | triage + `noorHandle` | TINGGI (deterministic rule, not a learned belief) |
| 4 | Which content creates *qualified* leads? | Attribution (5.9) + `decideIgWinner`/`mixVerdict` | AttributionBelief | **TEST-THIS only (Cap H)** — never ACT |
| 5 | Which ads create real opportunities? | Ads verdict + qualified-lead join (not chat count) | campaign AttributionBelief | ≤ tracking-gate state; MERAH → PERBAIKI_TRACKING_DULU |
| 6 | Which Surabaya areas? | Market Brain (5.8) AREA clusters | ClusterAttribute | SEDANG at boutique n; SEDANG-max until revenue-linked |
| 7 | Which buyer types? | Market Brain (5.8) BUYER_TYPE clusters | segment belief | SEDANG; owner-assumption seeds until real leads |
| 8 | Which objections predict ghosting? | Sales/Objection (5.10) | objection-risk belief | RENDAH–SEDANG until `LossReason` fed |
| 9 | Which offers attract serious clients? | Attribution + PENAWARAN learnings + 30% threshold | offer belief → `GANTI_PENAWARAN` | SEDANG; TINGGI only owner-confirmed + revenue |
| 10 | Which competitor patterns to adapt? | Competitor Synthesis (5.11) | public-capped hypothesis | **≤ SEDANG, TEST-THIS only** (Caps C, E) |
| 11 | Which assumptions are weakening? | **`assessAssumptionHealth()`** (5.12) | decaying belief → outdated/rejected | reports trend, not certainty |
| 12 | What should change next month? | `ValueDelta` rollup + **`assessAssumptionHealth()`** + **`synthesizeStrategy()`** | monthly delta beliefs | flat = flat, reported plainly |
| 13 | What should Noor do today/week/quarter? | **`synthesizeStrategy()`** (5.13) → Top-5 / War Room / value-trajectory | horizon-bucketed recommendations | KUARTAL: proven + revenue-linked only |

*(Completeness fix: Q11/12/13 now explicitly cite `synthesizeStrategy()` and `assessAssumptionHealth()` rather than three unnamed surfaces.)*

---

## 7. Honesty Architecture

The seven non-negotiable rules are **impossibilities encoded in the type/flow, not habits.**

| # | Rule | Structural mechanism |
|---|---|---|
| 1 | Never fake certainty | `confidence` + `maturity` non-nullable on every belief; ceiling is TINGGI; TINGGI requires DATA_INTERNAL + repeats + calibration; `proven` is owner-only via `setLearningStrength`'s three-place guard. |
| 2 | Never claim to know the algorithm | Algorithm-category beliefs constrained to `hypothesis/observation/pattern` **and** Cap H (permanently TEST-THIS, never ACT). |
| 3 | Never treat public competitor obs as private performance | Cap C transitive `derivedFromPublic` propagation + PUBLIC_LINK reliability 40–70 + `publicOnly` phrase; can never reach pattern/proven about competitor results. |
| 4 | Never treat manual input as live-API | Cap D source-reliability ceiling from `RELIABILITY`; MANUAL/SCREENSHOT can never render as API_RESMI; API_RESMI is BELUM AKTIF; `notLive` phrase on every belief-derived verdict. |
| 5 | Never treat a single event as a pattern | Cap A + `sampleGate(n<2)=0.2` + maturity cannot exceed `observation`/`pattern` until `repeats≥2`. |
| 6 | Never treat activity as progress | Promotion past `emerging` requires movement on an *outcome* factor; the promotion function ignores activity counters (post/spend/action volume) as inputs. |
| 7 | Never treat vanity as success | Cap B: vanity items are `evidenceRole=DIAGNOSTIC`, `contributesToScore=false`, zero across all ten factors; an OUTCOME belief keyed on a vanity field is rejected at construction. |

**Falsification condition (`falsifier`, WAJIB).** Every belief carries a required plain-Bahasa `falsifier` ("what observable evidence would force us to reject or downgrade this?") plus a machine-checkable `falsifierCheck` (metric + threshold + direction + sample window). A belief with no falsifier is structurally invalid — rejected at the `.refine()` layer exactly as TERBUKTI-on-non-internal is today, mirroring the existing `supportingData` requirement. The `falsifierCheck` re-evaluates on every data refresh; when reality satisfies it, `counterEvidence++` and the belief routes toward `rejected` (tombstone) or `outdated` (decay). The falsifier is the hook that lets contradicting reality *find* a belief instead of the belief hiding.

**Vanity firewall (two-field discipline).** Every belief carries `evidenceRole` (DIAGNOSTIC vs OUTCOME) and an `outcomeMetric` drawn from a strict allowlist: qualified-lead count, funnel-stage movement, proposal accept, won `estimatedValueJuta`/revenue. Vanity may only occupy DIAGNOSTIC; only allowlist metrics drive promotion or the value-delta axes. Rendering shows vanity numbers only inside a *"sinyal diagnostik"* band with a `TRUTH_PHRASE` reminder — never in the verdict headline. *Reach explains why a lead pattern might exist; it can never be the win.*

**The not-enough-reliable-data two-key lock.** Sample (`n<8` caps at LEMAH/`observation` via `strengthCap`) AND reliability (RENDAH source + `verifyBeforeBudget`) both force any verdict to `TAHAN_DATA_BELUM_CUKUP` with the `notEnough` phrase. Gate locks stay upstream: a MERAH/null gate forces `PERBAIKI_*_DULU` before any belief speaks. Null data emits a warning — silence-as-safety is banned.

---

## 8. Conceptual Data Model (NOT a migration)

Entities and relations only — no fields typed for SQL, no indices, no Prisma. This generalizes the existing `Learning` model; it does not replace it.

- **Belief** — `claimSignature`, `category` (reuse KONTEN/KANAL/KAMPANYE/AREA/LEAD_SIGNAL), `maturity` (Axis-B), `confidence` (→ KEYAKINAN), `bestEvidenceType` (Axis-A), `strength` (projection), `epistemicCategory` (e.g. algorithm-signal → Cap H), `derivedFromPublic`, `revenueLinked`, `tombstoned?`, `falsifier`, `falsifierCheck`. *Projects to* one `Learning`.
- **EvidenceItem** — `sourceType`, `reliabilityPct`, `freshnessAgeDays`, `polarity`, `evidenceRole`, `contributesToScore`, `derivedFromPublic`, `payloadRef` (→ Lead/IgPost/Campaign/Competitor/OwnerFeedback). *belongs-to* Belief (many).
- **BeliefRevision** — `from`, `to`, `trigger`, `ruleFired`, `actor`, `factorSnapshot`, `timestamp`. *belongs-to* Belief (append-only, many).
- **Prediction** — `beliefId`, `statement`, `predictedDirection/threshold`, `horizonClass` (FAST | SALES_CYCLE), `dueAt`, `resolvedOutcome` (HIT|MISS|PENDING|UNSCORABLE), `scoredAt`. *belongs-to* Belief.
- **CalibrationBucket** — `cohortKey` (or GLOBAL early), `predictedBand`, `hits`, `n`. Feeds `calibrationGate`.
- **OwnerFeedback / OwnerOverride** — `targetType` (Belief|Verdict|Prediction), `targetId`, `surface`, `action` (confirm|reject|override|verify), `systemLabel`, `ownerLabel`, `reason`, deferred `outcome`. War-Room decisions are the same evidence type.
- **ThresholdTuningFlag** — `ruleFired`, `constant`, `ownerRightCount`. Surfaces only at ≥2.
- **MarketCluster** — `dimension`, `key`, `qualifiedLeadsOnly?`; *has-many* **ClusterAttribute** (`slot`, `value`, plus a belief reference).
- **RevenueLink** — a Belief specialization: `claimSignature`, `wonProjectRefs[]`, `attributionMethodEvidenceId`, `repeats`. Cap G's corroboration guard lives here.
- **Tombstone** — a Belief with `maturity=rejected`, indexed by `claimSignature`, carrying `falsifier`, counter-evidence, `rejectedAt`.
- **CaptureGapRegister** — *known-unfed sources the system declares about itself* (Completeness fix): `Conversation` (WhatsApp language), `ProposalResult`, `ProjectOutcome` (delivered value & margin), `LossReason`, `MarketObservation` (TREN_PUBLIK). Each row makes a blind spot visible rather than silently omitted, so the UI can say *"data hasil proyek belum ditangkap"* instead of showing an empty proven tier.

**Relations.** Belief 1—N EvidenceItem, 1—N BeliefRevision, 1—N Prediction, 1—N OwnerFeedback; MarketCluster 1—N ClusterAttribute; Belief 0—1 RevenueLink; Tombstone is a Belief indexed by signature.

---

## 9. How It Composes With the Existing System

- **Generalizes the Knowledge Engine, does not duplicate it.** `knowledge.ts` stays the persistence + suggestion layer; a `Learning` becomes the *projection* of a `Belief`. The four ad-hoc confidence branches in `suggestLearnings` collapse into one `scoreBelief()` call. `strengthCap`, the TERBUKTI three-place guard, and the "never non-internal" refine become one ceiling rule instead of four copies.
- **Consumes `dataTruth.ts` wholesale.** `RELIABILITY`, `sourceConfidence`, `checkFreshness`, `FRESHNESS_DAYS`, `detectCampaignConflicts`, and `TRUTH_PHRASES` are reused verbatim — never reimplemented.
- **Plugs into existing decision surfaces unchanged.** `belief/project.ts` projects Belief → Learning (strength/confidence/category) so every current UI keeps working. Adapters (`knowledge.ts`, `adsRescue.ts`, `weeklyReport.ts`, `priorities.ts`) call `scoreBelief`/lifecycle instead of local heuristics. Recommendations render in existing verdict cards (via the `VerdictProposal` shape), Top-5 (`buildTop5`), and War Room. Beliefs appear only as a collapsed *"kenapa?"* citation (2–3 max) under a recommendation — Noor sees recommendations, not a belief library.
- **`gateLock()` stays the single choke point.** Belief output is still gated: a MERAH/null Gate 0/1 forces `PERBAIKI_AKUN_DULU` / `PERBAIKI_TRACKING_DULU` before any belief speaks. New surfaces that forget to call it are bugs, per `tests/engine/gates.test.ts`.
- **One decision language.** The 15 `KEPUTUSAN` labels + one `KEYAKINAN` chip + one `TRUTH_PHRASE` when thin. The ten epistemic states drive logic but surface as *"sudah terbukti / masih diuji / mulai melemah"* — no epistemic jargon on screen.

---

## 10. Phased Build Order

Honesty = minimum real data. Each phase names the volume gate below which everything holds at hypothesis/`TAHAN`.

**Phase A — Ledger + projection (no new claims).** Build EvidenceItem/BeliefRevision, wrap current Learnings as Beliefs, expose provenance and the Capture-Gap Register. **Honest at any volume** — it only records what exists. Ship inside Pilot mode.

**Phase B — Shared scoring + lifecycle.** Replace per-rule confidence with `scoreBelief` (multiplicative gates + caps); enable hypothesis↔pattern↔emerging↔strong + outdated decay. **Honest at ≥2 repetitions per pattern and ≥5 leads/campaign rows** (`MIN_DENOM`/`strengthCap`); below that, everything holds at hypothesis/`TAHAN`. **Phase B steady-state is explicitly acceptable** (Completeness 4.3 fix): a boutique with n=3 clusters may live here for a long time with *zero* proven beliefs, and that is **honesty, not failure** — the value-delta report reads *"belum ada belief yang terbukti bulan ini"* plainly rather than manufacturing progress.

**Phase C — Predictions + revenue loop.** Emit Predictions (with the SALES_CYCLE long horizon for revenue claims), score outcomes, allow strong→proven *nomination*. **The first Phase-C deliverable is closing the `ProjectOutcome` capture gap** (Completeness 4.4 fix) — until delivered-value/margin is captured, `ledToRealRevenue` is unreachable, *no* belief can reach TERBUKTI, and the UI states *"belum ada belief yang bisa terbukti — data hasil proyek belum ditangkap"* rather than showing an inert empty proven tier. Calibration pools into a single global bucket first and outputs `TAHAN` indefinitely until `MIN_DENOM`; it splits per-cohort only when volume allows. **Honest only after ≥14-day real-data pilot AND ≥1 belief with a resolved SALES_CYCLE Prediction tied to actual won-project revenue (repeats≥2 for proven).**

**Phase D — Tombstone learning + auto-suggest hardening.** Reject/outdated side-exits, tombstone dedup with owner-adjudicated collisions, `ThresholdTuningFlag`, `[PILOT]`-disagreement mining. **Honest after ≥1 full cycle where an owner override contradicted a system belief and real data resolved it** — otherwise there is nothing real to learn from, and pretending there is would violate the charter.

**What stays owner-assumption at small n, always:** Market Brain seed cells (until real leads promote them), any Win/Loss dimension depending on the unfed `LossReason`/`ProjectOutcome`/`ProposalResult`/`Conversation` sources, all Competitor Synthesis output, and any belief whose only evidence is `PENGETAHUAN_OWNER` without a DATA_INTERNAL co-sign.

---

## 11. What This Is NOT

- **NOT a generic assistant.** It answers Zenaide's 13 revenue questions from Zenaide's own data. It does not chat, brainstorm, or opine outside the belief system.
- **NOT an algorithm oracle.** It never claims to know the IG/TikTok/Meta/Google ranking algorithm. Distribution signals are permanently TEST-THIS hypotheses (Cap H), never ACT-lane instructions.
- **NOT a competitor spy.** Competitor data is public observation only, transitively capped (Cap C), verify-before-budget (Cap E), and never treated as private competitor performance or as a fact about *our* market.
- **NOT a live-data system.** All input is manual / CSV / screenshot / public-link with a recorded date. `API_RESMI` is BELUM AKTIF; no belief may render as live. The CSV path stays a permanent fallback.
- **NOT autopilot.** The machine *nominates* proven beliefs and *flags* weakening ones; only Noor promotes to TERBUKTI, resurrects a tombstone, or approves a threshold tune. Thresholds are learnable but never silently self-modifying.
- **NOT a certainty machine.** Silence is a valid output. An empty ACT lane says *"belum ada yang cukup kuat untuk diputuskan."* A flat month says so. Uncalibrated confidence decays. The system is designed to *lose* confidence honestly, not to always have an answer.