// Vonis formal untuk temuan Instagram — semua rekomendasi lewat VerdictProposal
// (keputusan dari kosakata tetap + keyakinan + aturan + angka pemicu).

import { PILAR_LABEL, type Pilar } from "../domain/enums";
import type { MixResult } from "./igDiagnosis";
import type { IgPostInput, VerdictProposal } from "./types";

/**
 * Pemenang organik → usulan "jadikan iklan".
 * Memenuhi aturan konten: menyebut sinyal yang dibidik, metrik sukses,
 * dan aturan keputusan setelah uji.
 */
export function decideIgWinner(
  post: IgPostInput,
  reasons: string[],
  totalPosts: number,
): VerdictProposal {
  const confidence =
    post.qualifiedLeadsAttributed >= 1 && totalPosts >= 12
      ? "TINGGI"
      : post.qualifiedLeadsAttributed >= 1
        ? "SEDANG"
        : "RENDAH";
  return {
    decision: "JADIKAN_IKLAN",
    ruleFired: "IG_WINNER_P80_PLUS_LEAD",
    trigger: {
      postId: post.id,
      saves: post.saves ?? 0,
      shares: post.shares ?? 0,
      waClicks: post.waClicks ?? 0,
      leads: post.leadsAttributed,
      qualifiedLeads: post.qualifiedLeadsAttributed,
      totalPosts,
    },
    confidence,
    explanation:
      `Pemenang organik (${reasons.join(", ")}). Uji sebagai iklan: pertahankan hook, CTA langsung ke WA. ` +
      `Sinyal yang dibidik: klik WA → chat berkualitas. Metrik sukses: CPQL iklan ≤ target dalam 14 hari. ` +
      `Aturan keputusan: lolos → scale bertahap; gagal → matikan iklannya, konten tetap jadi pilar organik.`,
  };
}

export interface AdCandidate {
  postId: string;
  score: number; // 0–100, relatif antar-kandidat — alat pengurut, bukan klaim absolut
  reasons: string[];
}

/**
 * Peringkat kandidat iklan di antara pemenang organik.
 * Komposit: 60% skor sinyal (save/share/WA per reach) + 40% lead berkualitas
 * relatif terhadap kandidat terbaik. Heuristik pengurut — bukan prediksi ROI.
 */
export function rankAdCandidates(
  candidates: Array<{ post: IgPostInput; signalScore: number | null; reasons: string[] }>,
): AdCandidate[] {
  const usable = candidates.filter((c) => c.signalScore !== null);
  if (usable.length === 0) return [];
  const maxSignal = Math.max(...usable.map((c) => c.signalScore!), 1);
  const maxQualified = Math.max(...usable.map((c) => c.post.qualifiedLeadsAttributed), 1);
  return usable
    .map((c) => ({
      postId: c.post.id,
      score:
        Math.round(
          ((c.signalScore! / maxSignal) * 60 + (c.post.qualifiedLeadsAttributed / maxQualified) * 40) * 10,
        ) / 10,
      reasons: c.reasons,
    }))
    .sort((a, b) => b.score - a.score);
}

/** Campuran konten terlalu berat portofolio → vonis perbaiki kreatif (strategi konten). */
export function decideContentMix(mix: MixResult, totalPosts: number): VerdictProposal | null {
  if (mix.insufficient || !mix.tooPortfolioHeavy) return null;
  const missing = mix.missingPillars.map((p) => PILAR_LABEL[p as Pilar]).join(", ");
  return {
    decision: "PERBAIKI_KREATIF",
    ruleFired: "IG_MIX_PORTFOLIO_HEAVY",
    trigger: { portfolioSharePct: mix.portfolioSharePct, totalPosts, missingPillars: mix.missingPillars.join(",") },
    confidence: totalPosts >= 15 ? "TINGGI" : "SEDANG",
    explanation:
      `${mix.portfolioSharePct}% konten adalah portofolio — non-follower belum kenal Zenaide dan tidak punya alasan peduli. ` +
      (missing ? `Pilar yang kosong: ${missing}. ` : "") +
      `Sinyal yang dibidik: reach non-follower & shares. Metrik sukses: % reach non-follower naik dalam 4 minggu setelah campuran diubah. ` +
      `Aturan keputusan: naik → pertahankan campuran baru; datar → ganti angle pilar, bukan kembali ke portofolio.`,
  };
}
