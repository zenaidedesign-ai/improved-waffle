// Diagnosa Distribusi Instagram — murni fungsi, tanpa dependensi framework.

import { CONFIG, SIGNAL_WEIGHTS } from "../domain/config";
import { PILAR_PEMULIHAN, type Pilar } from "../domain/enums";
import type { IgPostInput } from "./types";

/** Persentil sederhana (interpolasi terdekat-bawah) di data kecil. */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx];
}

function rate(part: number | null, whole: number | null): number | null {
  if (part == null || whole == null || whole === 0) return null;
  return (part / whole) * 100;
}

/**
 * Skor sinyal per post 0–100 — heuristik dengan bobot dari config (bisa disetel),
 * BUKAN klaim algoritma. null kalau reach kosong ATAU saves/shares/klik WA
 * semuanya kosong — tidak tahu ≠ nol.
 */
export function computeSignalScore(post: IgPostInput): number | null {
  if (post.reach == null || post.reach === 0) return null;
  if (post.saves == null && post.shares == null && post.waClicks == null) return null;
  const w = SIGNAL_WEIGHTS;
  const saveRate = rate(post.saves, post.reach) ?? 0; // per 100 reach
  const shareRate = rate(post.shares, post.reach) ?? 0;
  const visitRate = rate(post.profileVisits, post.reach) ?? 0;
  const waRate = rate(post.waClicks, post.reach) ?? 0;
  const nonFollowerPct = rate(post.reachNonFollower, post.reach) ?? 0;
  const raw =
    saveRate * w.saveRatePer100Reach +
    shareRate * w.shareRatePer100Reach +
    visitRate * w.profileVisitRatePer100Reach +
    waRate * w.waClickRatePer100Reach +
    nonFollowerPct * w.nonFollowerPct +
    post.qualifiedLeadsAttributed * w.perQualifiedLead;
  return Math.round(Math.min(100, raw) * 10) / 10;
}

export interface BestFormatResult {
  insufficient: boolean;
  best: { format: string; n: number; reason: string } | null;
}

/** Format terbaik saat ini — butuh ≥ bestFormatMinPosts per format agar jujur. */
export function bestFormat(posts: IgPostInput[]): BestFormatResult {
  const rows = compareByDimension(posts, "format").filter((r) => r.n >= CONFIG.bestFormatMinPosts);
  if (rows.length === 0) return { insufficient: true, best: null };
  const scored = rows
    .map((r) => ({
      ...r,
      // Peringkat berdasarkan sinyal niat + bisnis (median), lead sebagai penentu seri.
      rankScore:
        (r.medianSaves ?? 0) + (r.medianShares ?? 0) * 1.5 + (r.medianWaClicks ?? 0) * 3 + r.totalQualifiedLeads * 10,
    }))
    .sort((a, b) => b.rankScore - a.rankScore);
  const top = scored[0];
  if (top.rankScore === 0) return { insufficient: true, best: null };
  return {
    insufficient: false,
    best: {
      format: top.key,
      n: top.n,
      reason: `median saves ${top.medianSaves ?? 0}, shares ${top.medianShares ?? 0}, klik WA ${top.medianWaClicks ?? 0}, ${top.totalQualifiedLeads} lead berkualitas dari ${top.n} post`,
    },
  };
}

export interface WinnerResult {
  insufficient: boolean;
  minNeeded: number;
  winners: Array<{ postId: string; reasons: string[] }>;
}

/** Pemenang organik: saves/shares/klikWA ≥ persentil-80 DAN ≥ 1 lead terlacak. */
export function detectOrganicWinners(posts: IgPostInput[]): WinnerResult {
  if (posts.length < CONFIG.winnerMinPosts) {
    return { insufficient: true, minNeeded: CONFIG.winnerMinPosts, winners: [] };
  }
  const p = CONFIG.winnerPercentile;
  const savesP = percentile(posts.map((x) => x.saves ?? 0), p);
  const sharesP = percentile(posts.map((x) => x.shares ?? 0), p);
  const waP = percentile(posts.map((x) => x.waClicks ?? 0), p);

  const winners = posts
    .map((post) => {
      const reasons: string[] = [];
      if ((post.saves ?? 0) >= savesP && savesP > 0)
        reasons.push(`saves ${post.saves} (ambang p80: ${savesP})`);
      if ((post.shares ?? 0) >= sharesP && sharesP > 0)
        reasons.push(`shares ${post.shares} (ambang p80: ${sharesP})`);
      if ((post.waClicks ?? 0) >= waP && waP > 0)
        reasons.push(`klik WA ${post.waClicks} (ambang p80: ${waP})`);
      const hasLead = post.leadsAttributed >= 1;
      if (reasons.length > 0 && hasLead) {
        reasons.push(`${post.leadsAttributed} lead terlacak`);
        return { postId: post.id, reasons };
      }
      return null;
    })
    .filter((w): w is { postId: string; reasons: string[] } => w !== null);

  return { insufficient: false, minNeeded: CONFIG.winnerMinPosts, winners };
}

export interface TrendResult {
  direction: "NAIK" | "DATAR" | "TURUN" | "DATA_KURANG";
  slopePctPerWeek: number | null;
}

/** Tren % reach non-follower dari snapshot mingguan (regresi linier sederhana). */
export function nonFollowerTrend(points: Array<{ date: Date; pct: number }>): TrendResult {
  if (points.length < CONFIG.trendMinPoints) {
    return { direction: "DATA_KURANG", slopePctPerWeek: null };
  }
  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0].date.getTime();
  const week = 7 * 24 * 3600 * 1000;
  const xs = sorted.map((p) => (p.date.getTime() - t0) / week);
  const ys = sorted.map((p) => p.pct);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const denom = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = denom === 0 ? 0 : xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / denom;
  const rounded = Math.round(slope * 10) / 10;
  const direction = rounded > 0.5 ? "NAIK" : rounded < -0.5 ? "TURUN" : "DATAR";
  return { direction, slopePctPerWeek: rounded };
}

export interface DimensionCompareRow {
  key: string;
  n: number;
  medianReach: number | null;
  medianSaves: number | null;
  medianShares: number | null;
  medianWaClicks: number | null;
  totalQualifiedLeads: number;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function compareByDimension(
  posts: IgPostInput[],
  dim: "format" | "pillar",
): DimensionCompareRow[] {
  const groups = new Map<string, IgPostInput[]>();
  for (const p of posts) {
    const k = dim === "format" ? p.format : p.pillar;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      n: g.length,
      medianReach: median(g.map((x) => x.reach ?? 0)),
      medianSaves: median(g.map((x) => x.saves ?? 0)),
      medianShares: median(g.map((x) => x.shares ?? 0)),
      medianWaClicks: median(g.map((x) => x.waClicks ?? 0)),
      totalQualifiedLeads: g.reduce((s, x) => s + x.qualifiedLeadsAttributed, 0),
    }))
    .sort((a, b) => b.n - a.n);
}

export interface MixResult {
  insufficient: boolean;
  portfolioSharePct: number;
  tooPortfolioHeavy: boolean;
  missingPillars: Pilar[];
  countsByPillar: Record<string, number>;
}

/** Analisis campuran konten: terlalu berat portofolio? Pilar pemulihan apa yang kosong? */
export function contentMixAnalysis(posts: IgPostInput[]): MixResult {
  const countsByPillar: Record<string, number> = {};
  for (const p of posts) countsByPillar[p.pillar] = (countsByPillar[p.pillar] ?? 0) + 1;

  if (posts.length < CONFIG.winnerMinPosts) {
    return {
      insufficient: true,
      portfolioSharePct: 0,
      tooPortfolioHeavy: false,
      missingPillars: [],
      countsByPillar,
    };
  }

  const portfolioCount =
    (countsByPillar["PORTFOLIO_LAIN"] ?? 0) + (countsByPillar["BEFORE_AFTER"] ?? 0);
  const portfolioSharePct = Math.round((portfolioCount / posts.length) * 100);
  const missingPillars = PILAR_PEMULIHAN.filter((p) => !(countsByPillar[p] > 0));

  return {
    insufficient: false,
    portfolioSharePct,
    tooPortfolioHeavy: portfolioSharePct > CONFIG.portfolioHeavyPct,
    missingPillars,
    countsByPillar,
  };
}
