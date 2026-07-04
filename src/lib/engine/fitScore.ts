// Algorithm Fit Score — rubrik berbobot yang transparan.
// Ini hipotesis sinyal yang BISA DIUJI (prediksi vs aktual), bukan klaim algoritma.

import type { FitWeights } from "../domain/config";
import { CONFIG } from "../domain/config";
import type { Keyakinan } from "../domain/enums";

export type FitRatings = Record<keyof FitWeights, number>; // 0–5 per dimensi

export interface CompositeResult {
  composite: number; // 0–100
  perDimension: Array<{
    dim: keyof FitWeights;
    rating: number;
    weight: number;
    contribution: number; // poin dari 100
  }>;
}

export function computeComposite(ratings: FitRatings, weights: FitWeights): CompositeResult {
  const dims = Object.keys(weights) as Array<keyof FitWeights>;
  const totalWeight = dims.reduce((s, d) => s + weights[d], 0);
  if (totalWeight <= 0) {
    return { composite: 0, perDimension: dims.map((d) => ({ dim: d, rating: ratings[d] ?? 0, weight: 0, contribution: 0 })) };
  }
  const perDimension = dims.map((d) => {
    const rating = Math.max(0, Math.min(5, ratings[d] ?? 0));
    const weight = weights[d];
    const contribution = (rating / 5) * (weight / totalWeight) * 100;
    return { dim: d, rating, weight, contribution: Math.round(contribution * 10) / 10 };
  });
  const composite =
    Math.round(perDimension.reduce((s, x) => s + x.contribution, 0) * 10) / 10;
  return { composite, perDimension };
}

export function confidenceLabel(confidence0to5: number): Keyakinan {
  if (confidence0to5 >= 4) return "TINGGI";
  if (confidence0to5 >= 2) return "SEDANG";
  return "RENDAH";
}

export interface PredActualRow {
  postId: string;
  predictedRank: number; // 1 = skor komposit tertinggi
  actualRank: number; // 1 = sinyal aktual tertinggi
  delta: number; // predictedRank - actualRank
}

export type PredActualResult =
  | { insufficient: true; minNeeded: number }
  | { insufficient: false; rows: PredActualRow[] };

/**
 * Pembanding prediksi-vs-aktual berbasis peringkat: apakah post yang diskor
 * tinggi memang menghasilkan sinyal nyata lebih tinggi? Menguji rubriknya sendiri.
 */
export function comparePredictedActual(
  scores: Array<{ postId: string; composite: number; actualSignal: number | null }>,
): PredActualResult {
  const usable = scores.filter((s) => s.actualSignal !== null);
  if (usable.length < CONFIG.predVsActualMinPosts) {
    return { insufficient: true, minNeeded: CONFIG.predVsActualMinPosts };
  }
  const byPredicted = [...usable].sort((a, b) => b.composite - a.composite);
  const byActual = [...usable].sort((a, b) => (b.actualSignal ?? 0) - (a.actualSignal ?? 0));
  const predRank = new Map(byPredicted.map((s, i) => [s.postId, i + 1]));
  const actRank = new Map(byActual.map((s, i) => [s.postId, i + 1]));
  return {
    insufficient: false,
    rows: usable.map((s) => {
      const p = predRank.get(s.postId)!;
      const a = actRank.get(s.postId)!;
      return { postId: s.postId, predictedRank: p, actualRank: a, delta: p - a };
    }),
  };
}
