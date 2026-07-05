// Tes untuk 10 perbaikan blocker CONDITIONAL GO.
import { describe, expect, it } from "vitest";
import {
  applyDataQuality,
  assessDataQuality,
  compareCampaigns,
  computeCostChain,
  decideCampaign,
  type CampaignChainSummary,
} from "../../src/lib/engine/adsRescue";
import { applyAuditAging } from "../../src/lib/engine/gates";
import { backupDue } from "../../src/lib/engine/dataTruth";
import { triageLead, type LeadTriageInput } from "../../src/lib/engine/leadTriage";
import { rankAdCandidates } from "../../src/lib/engine/verdicts";
import type { IgPostInput, VerdictProposal } from "../../src/lib/engine/types";

const NOW = new Date("2026-07-05T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 3600 * 1000);

const chainOf = (over: Partial<Parameters<typeof computeCostChain>[0]> = {}) =>
  computeCostChain({
    spendRibu: 1500, impressions: 50000, clicks: 900, resultsPlatform: null,
    chats: 12, qualifiedLeads: 4, surveys: 2, pipelineValueJuta: 400, ...over,
  });

describe("Blocker 1 — keandalan & kesegaran MASUK ke vonis", () => {
  const base: VerdictProposal = {
    decision: "SCALE_KAMPANYE", ruleFired: "r", trigger: {}, confidence: "TINGGI", explanation: "Vonis dasar.",
  };
  it("data basi ⇒ keyakinan RENDAH + peringatan DI DALAM penjelasan vonis", () => {
    const dq = assessDataQuality([{ date: daysAgo(5), sourceType: "CSV" }], NOW);
    const v = applyDataQuality(base, dq);
    expect(dq.stale).toBe(true);
    expect(v.confidence).toBe("RENDAH");
    expect(v.explanation).toContain("basi");
    expect(v.explanation).toContain("Jangan eksekusi keputusan budget");
  });
  it("sumber screenshot ⇒ RENDAH + peringatan verifikasi", () => {
    const dq = assessDataQuality([{ date: daysAgo(1), sourceType: "SCREENSHOT" }], NOW);
    const v = applyDataQuality(base, dq);
    expect(v.confidence).toBe("RENDAH");
    expect(v.explanation).toContain("screenshot");
  });
  it("semua manual ⇒ TINGGI turun ke SEDANG + catatan cocokkan", () => {
    const dq = assessDataQuality([{ date: daysAgo(1), sourceType: "MANUAL" }], NOW);
    const v = applyDataQuality(base, dq);
    expect(dq.manualOnly).toBe(true);
    expect(v.confidence).toBe("SEDANG");
    expect(v.explanation).toContain("input manual");
  });
  it("CSV segar ⇒ vonis tidak disentuh", () => {
    const dq = assessDataQuality([{ date: daysAgo(1), sourceType: "CSV" }], NOW);
    expect(applyDataQuality(base, dq)).toEqual(base);
  });
  it("kunci gerbang & TAHAN tidak disentuh oleh kualitas data", () => {
    const dq = assessDataQuality([{ date: daysAgo(30), sourceType: "SCREENSHOT" }], NOW);
    const lock: VerdictProposal = { ...base, decision: "PERBAIKI_AKUN_DULU", lockedByGate: "GERBANG_0" };
    const tahan: VerdictProposal = { ...base, decision: "TAHAN_DATA_BELUM_CUKUP" };
    expect(applyDataQuality(lock, dq)).toEqual(lock);
    expect(applyDataQuality(tahan, dq)).toEqual(tahan);
  });
  it("decideCampaign end-to-end: metrik screenshot menurunkan vonis scale", () => {
    const v = decideCampaign(
      chainOf({ spendRibu: 900, chats: 15, qualifiedLeads: 5, surveys: 2 }),
      "HIJAU", "HIJAU", 300,
      assessDataQuality([{ date: daysAgo(1), sourceType: "SCREENSHOT" }], NOW),
    );
    expect(v.decision).toBe("SCALE_KAMPANYE");
    expect(v.confidence).toBe("RENDAH");
  });
});

describe("Blocker 2 — SPLIT_TEST", () => {
  it("CPQL ≤ target + ≥3 lead ✓ + NOL survei ⇒ SPLIT_TEST sebelum scale", () => {
    const v = decideCampaign(
      chainOf({ spendRibu: 900, chats: 15, qualifiedLeads: 5, surveys: 0 }),
      "HIJAU", "HIJAU", 300,
    );
    expect(v.decision).toBe("SPLIT_TEST");
    expect(v.explanation).toContain("jangan scale dulu");
  });
  it("dua kampanye CPQL mirip (< 25%) ⇒ SPLIT_TEST, bukan pindah budget", () => {
    const s = (id: string, spend: number, q: number): CampaignChainSummary => ({
      id, name: id, status: "AKTIF", targetCpqlRibu: 300,
      chain: chainOf({ spendRibu: spend, chats: 12, qualifiedLeads: q, surveys: 1 }),
    });
    const v = compareCampaigns([s("a", 900, 4), s("b", 1000, 4)]); // CPQL 225 vs 250 (+11%)
    expect(v?.decision).toBe("SPLIT_TEST");
    expect(v?.ruleFired).toBe("ADS_SPLIT_SIMILAR_CPQL");
  });
  it("selisih besar tetap PINDAH_BUDGET", () => {
    const s = (id: string, spend: number, q: number): CampaignChainSummary => ({
      id, name: id, status: "AKTIF", targetCpqlRibu: 300,
      chain: chainOf({ spendRibu: spend, chats: 12, qualifiedLeads: q, surveys: 1 }),
    });
    const v = compareCampaigns([s("bagus", 900, 4), s("boros", 1500, 2)]);
    expect(v?.decision).toBe("PINDAH_BUDGET");
  });
});

describe("Blocker 7 — penuaan audit", () => {
  it("HIJAU > 30 hari ⇒ turun KUNING; MERAH tetap MERAH", () => {
    expect(applyAuditAging("HIJAU", daysAgo(31), NOW).verdict).toBe("KUNING");
    expect(applyAuditAging("HIJAU", daysAgo(29), NOW).verdict).toBe("HIJAU");
    expect(applyAuditAging("MERAH", daysAgo(60), NOW).verdict).toBe("MERAH");
  });
  it("umur & ambang tercatat untuk banner", () => {
    const r = applyAuditAging("HIJAU", daysAgo(45), NOW);
    expect(r.aging?.aged).toBe(true);
    expect(r.aging?.ageDays).toBe(45);
    expect(r.aging?.maxDays).toBe(30);
  });
});

describe("Blocker 8 — pengingat cadangan", () => {
  it("belum pernah ekspor ⇒ due dengan pesan SQLite", () => {
    const r = backupDue(null, NOW, 7);
    expect(r.due).toBe(true);
    expect(r.message).toContain("SQLite");
  });
  it("ekspor 8 hari lalu ⇒ due; 6 hari ⇒ tidak", () => {
    expect(backupDue(daysAgo(8), NOW, 7).due).toBe(true);
    expect(backupDue(daysAgo(6), NOW, 7).due).toBe(false);
  });
});

describe("Blocker 5 — flag Tangani Noor sendiri", () => {
  let seq = 0;
  const lead = (over: Partial<LeadTriageInput> = {}): LeadTriageInput => ({
    id: `l${++seq}`, name: "T", status: "MERESPONS", qualityScore: 50, qualAnswersCount: 2,
    estimatedValueJuta: 100, createdAt: daysAgo(5), lastContactAt: daysAgo(1),
    surveyAt: null, proposalSentAt: null, ...over,
  });
  it("nilai ≥ 300 jt ⇒ Noor, dengan alasan nilai", () => {
    const t = triageLead(lead({ estimatedValueJuta: 650 }), NOW);
    expect(t.noorHandle).toBe(true);
    expect(t.noorReason).toContain("650 jt");
  });
  it("negosiasi ⇒ Noor", () => {
    const t = triageLead(lead({ status: "NEGOSIASI", qualityScore: 70, qualAnswersCount: 4, lastContactAt: daysAgo(0) }), NOW);
    expect(t.noorHandle).toBe(true);
    expect(t.noorReason).toContain("negosiasi");
  });
  it("HOT/URGENT ⇒ Noor meski nilai kecil", () => {
    const t = triageLead(lead({ qualityScore: 75, qualAnswersCount: 4, lastContactAt: daysAgo(3), estimatedValueJuta: 50 }), NOW);
    expect(t.triage).toBe("URGENT");
    expect(t.noorHandle).toBe(true);
  });
  it("lead mati / abaikan TIDAK pernah pakai waktu Noor", () => {
    expect(triageLead(lead({ status: "GHOSTING", estimatedValueJuta: 900 }), NOW).noorHandle).toBe(false);
    expect(triageLead(lead({ qualityScore: 10, qualAnswersCount: 0, lastContactAt: daysAgo(3) }), NOW).noorHandle).toBe(false);
  });
});

describe("Blocker 9 — peringkat kandidat iklan", () => {
  let seq = 0;
  const post = (over: Partial<IgPostInput> = {}): IgPostInput => ({
    id: `p${++seq}`, postedAt: NOW, format: "REELS", pillar: "PAIN_BASED", hook: "h", cta: null,
    reach: 1000, reachNonFollower: 300, plays: null, likes: 10, comments: 1, saves: 20, shares: 10,
    profileVisits: 20, follows: 2, dmClicks: 0, waClicks: 3, leadsAttributed: 1, qualifiedLeadsAttributed: 0,
    ...over,
  });
  it("lead berkualitas mengalahkan sinyal mentah yang sedikit lebih tinggi", () => {
    const a = { post: post({ qualifiedLeadsAttributed: 2 }), signalScore: 60, reasons: [] };
    const b = { post: post({ qualifiedLeadsAttributed: 0 }), signalScore: 70, reasons: [] };
    const r = rankAdCandidates([a, b]);
    expect(r[0].postId).toBe(a.post.id);
    expect(r[0].score).toBeGreaterThan(r[1].score);
  });
  it("kandidat tanpa skor sinyal tidak ikut diranking", () => {
    expect(rankAdCandidates([{ post: post(), signalScore: null, reasons: [] }])).toHaveLength(0);
  });
});
