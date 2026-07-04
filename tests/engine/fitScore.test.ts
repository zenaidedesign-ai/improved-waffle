import { describe, expect, it } from "vitest";
import { DEFAULT_FIT_WEIGHTS } from "../../src/lib/domain/config";
import {
  comparePredictedActual,
  computeComposite,
  confidenceLabel,
  type FitRatings,
} from "../../src/lib/engine/fitScore";

const allRated = (v: number): FitRatings =>
  Object.fromEntries(Object.keys(DEFAULT_FIT_WEIGHTS).map((k) => [k, v])) as FitRatings;

describe("computeComposite", () => {
  it("semua 5 ⇒ 100, semua 0 ⇒ 0", () => {
    expect(computeComposite(allRated(5), DEFAULT_FIT_WEIGHTS).composite).toBe(100);
    expect(computeComposite(allRated(0), DEFAULT_FIT_WEIGHTS).composite).toBe(0);
  });
  it("kontribusi per dimensi menjumlah ke komposit", () => {
    const r = computeComposite(allRated(3), DEFAULT_FIT_WEIGHTS);
    const sum = r.perDimension.reduce((s, d) => s + d.contribution, 0);
    expect(Math.abs(sum - r.composite)).toBeLessThan(0.5);
  });
  it("rating di luar 0–5 dipatok", () => {
    const ratings = { ...allRated(3), hook3s: 99 };
    const r = computeComposite(ratings, DEFAULT_FIT_WEIGHTS);
    expect(r.perDimension.find((d) => d.dim === "hook3s")!.rating).toBe(5);
  });
  it("bobot nol semua ⇒ 0, tanpa NaN", () => {
    const zero = Object.fromEntries(
      Object.keys(DEFAULT_FIT_WEIGHTS).map((k) => [k, 0]),
    ) as unknown as typeof DEFAULT_FIT_WEIGHTS;
    const r = computeComposite(allRated(5), zero);
    expect(r.composite).toBe(0);
    expect(Number.isNaN(r.composite)).toBe(false);
  });
});

describe("confidenceLabel", () => {
  it("pemetaan 0–5 → label", () => {
    expect(confidenceLabel(0)).toBe("RENDAH");
    expect(confidenceLabel(2)).toBe("SEDANG");
    expect(confidenceLabel(4)).toBe("TINGGI");
  });
});

describe("comparePredictedActual — penjaga data tipis", () => {
  it("4 post ⇒ insufficient", () => {
    const r = comparePredictedActual(
      Array.from({ length: 4 }, (_, i) => ({ postId: `p${i}`, composite: 50, actualSignal: 10 })),
    );
    expect(r.insufficient).toBe(true);
  });
  it("post tanpa sinyal aktual tidak dihitung", () => {
    const r = comparePredictedActual(
      Array.from({ length: 5 }, (_, i) => ({ postId: `p${i}`, composite: 50, actualSignal: i < 2 ? null : 10 })),
    );
    expect(r.insufficient).toBe(true);
  });
  it("peringkat prediksi vs aktual dihitung", () => {
    const scores = [
      { postId: "a", composite: 90, actualSignal: 5 },
      { postId: "b", composite: 80, actualSignal: 50 },
      { postId: "c", composite: 70, actualSignal: 40 },
      { postId: "d", composite: 60, actualSignal: 30 },
      { postId: "e", composite: 50, actualSignal: 20 },
    ];
    const r = comparePredictedActual(scores);
    expect(r.insufficient).toBe(false);
    if (!r.insufficient) {
      const a = r.rows.find((x) => x.postId === "a")!;
      expect(a.predictedRank).toBe(1);
      expect(a.actualRank).toBe(5); // diskor tinggi tapi aktual terendah — rubrik ketahuan meleset
      expect(a.delta).toBe(-4);
    }
  });
});
