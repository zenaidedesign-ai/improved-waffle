import { describe, expect, it } from "vitest";
import {
  campaignHealth,
  compareCampaigns,
  computeCostChain,
  type CampaignChainSummary,
} from "../../src/lib/engine/adsRescue";
import { bestFormat, computeSignalScore } from "../../src/lib/engine/igDiagnosis";
import { decideContentMix, decideIgWinner } from "../../src/lib/engine/verdicts";
import { buildTop5 } from "../../src/lib/engine/priorities";
import { weekStartOf } from "../../src/lib/engine/warRoom";
import { gateLock } from "../../src/lib/engine/gates";
import type { IgPostInput } from "../../src/lib/engine/types";

let seq = 0;
const post = (over: Partial<IgPostInput> = {}): IgPostInput => ({
  id: `p${++seq}`,
  postedAt: new Date("2026-06-01"),
  format: "REELS",
  pillar: "PORTFOLIO_LAIN",
  hook: "hook",
  cta: null,
  reach: 1000,
  reachNonFollower: 300,
  plays: null,
  likes: 50,
  comments: 5,
  saves: 10,
  shares: 5,
  profileVisits: 20,
  follows: 2,
  dmClicks: 0,
  waClicks: 2,
  leadsAttributed: 0,
  qualifiedLeadsAttributed: 0,
  ...over,
});

const summary = (
  id: string,
  cpqlSetup: { spendRibu: number; qualifiedLeads: number; chats: number },
  target = 300,
  status = "AKTIF",
): CampaignChainSummary => ({
  id,
  name: id,
  status,
  targetCpqlRibu: target,
  chain: computeCostChain({
    spendRibu: cpqlSetup.spendRibu,
    impressions: 50000,
    clicks: 900,
    resultsPlatform: null,
    chats: cpqlSetup.chats,
    qualifiedLeads: cpqlSetup.qualifiedLeads,
    surveys: 1,
    pipelineValueJuta: 100,
  }),
});

describe("weekStartOf — Senin 00:00 WIB, bukan timezone server", () => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  it("hasilnya selalu Senin 00:00 menurut WIB", () => {
    for (const iso of ["2026-07-02T15:30:00Z", "2026-07-05T10:00:00Z", "2026-06-29T16:59:00Z"]) {
      const parts = fmt.format(weekStartOf(new Date(iso)));
      expect(parts).toContain("Mon");
      expect(parts).toContain("00:00");
    }
  });
  it("Minggu malam UTC yang sudah Senin pagi WIB masuk minggu baru", () => {
    // 2026-07-05 adalah Minggu. 18:00 UTC = Senin 01:00 WIB (6 Juli).
    const senin = weekStartOf(new Date("2026-07-05T18:00:00Z"));
    const minggu = weekStartOf(new Date("2026-07-05T10:00:00Z"));
    expect(senin.getTime() - minggu.getTime()).toBe(7 * 24 * 3600 * 1000);
  });
});

describe("computeSignalScore — jujur pada data kosong", () => {
  it("saves/shares/klikWA semuanya kosong ⇒ null, bukan skor rendah", () => {
    expect(computeSignalScore(post({ saves: null, shares: null, waClicks: null }))).toBeNull();
  });
  it("sebagian terisi ⇒ tetap diskor", () => {
    expect(computeSignalScore(post({ shares: null, waClicks: null }))).not.toBeNull();
  });
});

describe("bestFormat", () => {
  it("format dengan < 3 post tidak boleh menang", () => {
    const posts = [
      post({ format: "STORY", saves: 900, shares: 900, waClicks: 900, qualifiedLeadsAttributed: 5 }), // 1 post hebat
      ...Array.from({ length: 4 }, () => post({ format: "CAROUSEL", saves: 30, shares: 15, waClicks: 4 })),
    ];
    const r = bestFormat(posts);
    expect(r.best?.format).toBe("CAROUSEL");
  });
  it("tanpa grup yang memenuhi minimum ⇒ insufficient", () => {
    expect(bestFormat([post(), post({ format: "FOTO" })]).insufficient).toBe(true);
  });
});

describe("compareCampaigns → PINDAH_BUDGET", () => {
  it("terbaik ≤ target & terburuk ≥ 2× target ⇒ usulan pindah budget", () => {
    const v = compareCampaigns([
      summary("bagus", { spendRibu: 900, qualifiedLeads: 4, chats: 12 }), // CPQL 225
      summary("boros", { spendRibu: 1500, qualifiedLeads: 2, chats: 15 }), // CPQL 750
    ]);
    expect(v?.decision).toBe("PINDAH_BUDGET");
    expect(v?.explanation).toContain("boros");
    expect(v?.explanation).toContain("bagus");
  });
  it("kampanye boros tanpa lead berkualitas tetap jadi sumber pindahan", () => {
    const v = compareCampaigns([
      summary("bagus", { spendRibu: 900, qualifiedLeads: 4, chats: 12 }),
      summary("nol", { spendRibu: 1200, qualifiedLeads: 0, chats: 11 }),
    ]);
    expect(v?.decision).toBe("PINDAH_BUDGET");
  });
  it("hanya 1 kampanye cukup data ⇒ null", () => {
    const v = compareCampaigns([
      summary("bagus", { spendRibu: 900, qualifiedLeads: 4, chats: 12 }),
      summary("tipis", { spendRibu: 100, qualifiedLeads: 0, chats: 2 }),
    ]);
    expect(v).toBeNull();
  });
  it("tidak ada kampanye di bawah target ⇒ null", () => {
    const v = compareCampaigns([
      summary("mahal1", { spendRibu: 1500, qualifiedLeads: 2, chats: 12 }),
      summary("mahal2", { spendRibu: 1600, qualifiedLeads: 2, chats: 12 }),
    ]);
    expect(v).toBeNull();
  });
});

describe("campaignHealth — 4 status", () => {
  const mk = (decision: string) =>
    campaignHealth({ decision: decision as never, ruleFired: "x", trigger: {}, confidence: "SEDANG", explanation: "" });
  it("pemetaan vonis → kesehatan", () => {
    expect(mk("TAHAN_DATA_BELUM_CUKUP")).toBe("BELUM_CUKUP_DATA");
    expect(mk("KILL_KAMPANYE")).toBe("RUSAK");
    expect(mk("PERBAIKI_TRACKING_DULU")).toBe("RUSAK");
    expect(mk("SCALE_KAMPANYE")).toBe("SEHAT");
    expect(mk("HOLD_KAMPANYE")).toBe("LEMAH");
    expect(mk("GANTI_PENAWARAN")).toBe("LEMAH");
  });
});

describe("vonis IG formal", () => {
  it("pemenang membawa keyakinan + sinyal + metrik sukses + aturan keputusan", () => {
    const v = decideIgWinner(post({ saves: 100, qualifiedLeadsAttributed: 1 }), ["saves 100"], 15);
    expect(v.decision).toBe("JADIKAN_IKLAN");
    expect(v.confidence).toBe("TINGGI");
    expect(v.explanation).toContain("Sinyal yang dibidik");
    expect(v.explanation).toContain("Metrik sukses");
    expect(v.explanation).toContain("Aturan keputusan");
  });
  it("pemenang tanpa lead berkualitas ⇒ keyakinan RENDAH", () => {
    expect(decideIgWinner(post({ leadsAttributed: 1 }), ["shares"], 20).confidence).toBe("RENDAH");
  });
  it("campuran sehat ⇒ tidak ada vonis mix", () => {
    expect(
      decideContentMix({ insufficient: false, portfolioSharePct: 40, tooPortfolioHeavy: false, missingPillars: [], countsByPillar: {} }, 20),
    ).toBeNull();
  });
});

describe("buildTop5", () => {
  const emptyInput = {
    lock: gateLock("HIJAU", "HIJAU"),
    killCampaigns: [],
    moveBudget: null,
    urgentFollowUps: [],
    winners: [],
    mixVerdict: null,
    openWarRoomDecisions: [],
  };
  it("gerbang terkunci selalu prioritas #1", () => {
    const items = buildTop5({
      ...emptyInput,
      lock: gateLock(null, null),
      killCampaigns: [{ id: "c1", name: "X", verdict: { decision: "KILL_KAMPANYE", ruleFired: "r", trigger: {}, confidence: "TINGGI", explanation: "e" } }],
    });
    expect(items[0].decision).toBe("PERBAIKI_AKUN_DULU");
    expect(items[1].decision).toBe("KILL_KAMPANYE");
  });
  it("maksimal 5 item", () => {
    const items = buildTop5({
      ...emptyInput,
      lock: gateLock(null, null),
      killCampaigns: [
        { id: "1", name: "a", verdict: { decision: "KILL_KAMPANYE", ruleFired: "r", trigger: {}, confidence: "TINGGI", explanation: "e" } },
        { id: "2", name: "b", verdict: { decision: "KILL_KAMPANYE", ruleFired: "r", trigger: {}, confidence: "TINGGI", explanation: "e" } },
      ],
      urgentFollowUps: [
        { id: "l1", name: "A", status: "BERKUALITAS", estimatedValueJuta: 1, triage: "URGENT", reason: "r", silentDays: 3, ghostingRisk: false, closingProbabilityPct: 30, noorHandle: true, noorReason: "urgen hari ini" },
        { id: "l2", name: "B", status: "BERKUALITAS", estimatedValueJuta: 2, triage: "URGENT", reason: "r", silentDays: 3, ghostingRisk: false, closingProbabilityPct: 30, noorHandle: true, noorReason: "urgen hari ini" },
      ],
      openWarRoomDecisions: [{ decision: "KILL_KAMPANYE", reason: "x" }],
    });
    expect(items).toHaveLength(5);
    expect(items.map((i) => i.rank)).toEqual([1, 2, 3, 4, 5]);
  });
  it("tanpa masalah ⇒ daftar bisa kosong (tidak mengarang prioritas)", () => {
    expect(buildTop5(emptyInput)).toHaveLength(0);
  });
});
