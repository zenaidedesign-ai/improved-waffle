import { describe, expect, it } from "vitest";
import {
  compareByDimension,
  computeSignalScore,
  contentMixAnalysis,
  detectOrganicWinners,
  nonFollowerTrend,
} from "../../src/lib/engine/igDiagnosis";
import type { IgPostInput } from "../../src/lib/engine/types";

let seq = 0;
function post(over: Partial<IgPostInput> = {}): IgPostInput {
  seq += 1;
  return {
    id: `p${seq}`,
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
  };
}

describe("computeSignalScore", () => {
  it("tanpa reach ⇒ null (data belum cukup, bukan skor 0)", () => {
    expect(computeSignalScore(post({ reach: null }))).toBeNull();
    expect(computeSignalScore(post({ reach: 0 }))).toBeNull();
  });
  it("lead berkualitas menaikkan skor tajam", () => {
    const tanpa = computeSignalScore(post())!;
    const dengan = computeSignalScore(post({ qualifiedLeadsAttributed: 2 }))!;
    expect(dengan).toBeGreaterThan(tanpa);
  });
  it("terpatok maksimal 100", () => {
    const s = computeSignalScore(post({ saves: 5000, shares: 5000, waClicks: 5000, qualifiedLeadsAttributed: 50 }));
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe("detectOrganicWinners — penjaga data tipis", () => {
  it("7 post ⇒ insufficient, TANPA pemenang", () => {
    const r = detectOrganicWinners(Array.from({ length: 7 }, () => post()));
    expect(r.insufficient).toBe(true);
    expect(r.winners).toHaveLength(0);
    expect(r.minNeeded).toBe(8);
  });

  it("pemenang butuh sinyal p80 DAN minimal 1 lead", () => {
    const posts = [
      ...Array.from({ length: 9 }, () => post({ saves: 5, shares: 2, waClicks: 1 })),
      post({ saves: 100, shares: 60, waClicks: 30, leadsAttributed: 2, qualifiedLeadsAttributed: 1 }),
      post({ saves: 90, shares: 50, waClicks: 25, leadsAttributed: 0 }), // sinyal tinggi TAPI nol lead
    ];
    const r = detectOrganicWinners(posts);
    expect(r.insufficient).toBe(false);
    const ids = r.winners.map((w) => w.postId);
    expect(ids).toContain(posts[9].id);
    expect(ids).not.toContain(posts[10].id);
    expect(r.winners[0].reasons.join(" ")).toContain("lead");
  });
});

describe("nonFollowerTrend", () => {
  it("kurang dari 3 titik ⇒ DATA_KURANG", () => {
    const r = nonFollowerTrend([
      { date: new Date("2026-06-01"), pct: 20 },
      { date: new Date("2026-06-08"), pct: 30 },
    ]);
    expect(r.direction).toBe("DATA_KURANG");
    expect(r.slopePctPerWeek).toBeNull();
  });
  it("tren naik terdeteksi", () => {
    const r = nonFollowerTrend([
      { date: new Date("2026-06-01"), pct: 10 },
      { date: new Date("2026-06-08"), pct: 20 },
      { date: new Date("2026-06-15"), pct: 30 },
    ]);
    expect(r.direction).toBe("NAIK");
    expect(r.slopePctPerWeek).toBe(10);
  });
  it("tren turun terdeteksi", () => {
    const r = nonFollowerTrend([
      { date: new Date("2026-06-01"), pct: 40 },
      { date: new Date("2026-06-08"), pct: 30 },
      { date: new Date("2026-06-15"), pct: 22 },
    ]);
    expect(r.direction).toBe("TURUN");
  });
});

describe("contentMixAnalysis", () => {
  it("70% portofolio ⇒ terlalu berat portofolio + pilar hilang terdaftar", () => {
    const posts = [
      ...Array.from({ length: 4 }, () => post({ pillar: "PORTFOLIO_LAIN" })),
      ...Array.from({ length: 3 }, () => post({ pillar: "BEFORE_AFTER" })),
      ...Array.from({ length: 3 }, () => post({ pillar: "PAIN_BASED" })),
    ];
    const r = contentMixAnalysis(posts);
    expect(r.insufficient).toBe(false);
    expect(r.portfolioSharePct).toBe(70);
    expect(r.tooPortfolioHeavy).toBe(true);
    expect(r.missingPillars).toContain("BUDGET_EDUKASI");
    expect(r.missingPillars).toContain("FOUNDER_POV");
    expect(r.missingPillars).not.toContain("PAIN_BASED");
    expect(r.missingPillars).not.toContain("BEFORE_AFTER");
  });
  it("di bawah 8 post ⇒ insufficient", () => {
    expect(contentMixAnalysis([post(), post()]).insufficient).toBe(true);
  });
});

describe("compareByDimension", () => {
  it("median dan total lead per grup benar", () => {
    const posts = [
      post({ format: "REELS", saves: 10, qualifiedLeadsAttributed: 1 }),
      post({ format: "REELS", saves: 20, qualifiedLeadsAttributed: 2 }),
      post({ format: "CAROUSEL", saves: 4 }),
    ];
    const rows = compareByDimension(posts, "format");
    const reels = rows.find((r) => r.key === "REELS")!;
    expect(reels.n).toBe(2);
    expect(reels.medianSaves).toBe(15);
    expect(reels.totalQualifiedLeads).toBe(3);
  });
});
