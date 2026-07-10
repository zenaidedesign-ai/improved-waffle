import { describe, expect, it } from "vitest";
import {
  computePilotProgress,
  PHASE_B_LOCK_MESSAGE,
  phaseBGate,
  pilotDay,
  type PhaseBGateInput,
  type PilotCounts,
} from "../../src/lib/engine/pilot";

const counts = (over: Partial<PilotCounts> = {}): PilotCounts => ({
  realLeads: 0, realPosts: 0, realAdsCsvImports: 0, warRoomSessions: 0,
  auditTypesRun: 0, realSnapshots: 0, pilotLearnings: 0, ...over,
});

describe("computePilotProgress", () => {
  it("nol data ⇒ nol kriteria terpenuhi, tidak ready", () => {
    const p = computePilotProgress(counts());
    expect(p.metCount).toBe(0);
    expect(p.ready).toBe(false);
  });
  it("ambang sesuai kriteria sukses pilot (50 lead, 10 post, 1 CSV, 1 war room)", () => {
    const p = computePilotProgress(counts({ realLeads: 50, realPosts: 10, realAdsCsvImports: 1, warRoomSessions: 1, auditTypesRun: 3, realSnapshots: 2, pilotLearnings: 1 }));
    expect(p.ready).toBe(true);
    expect(p.metCount).toBe(p.totalAuto);
  });
  it("49 lead belum memenuhi — tidak dibulatkan ke atas", () => {
    const p = computePilotProgress(counts({ realLeads: 49 }));
    expect(p.criteria.find((c) => c.key === "leads")?.met).toBe(false);
  });
  it("kriteria penilaian Noor ditandai manual & TIDAK pernah otomatis lolos", () => {
    const p = computePilotProgress(counts({ realLeads: 999, realPosts: 999 }));
    const manual = p.criteria.filter((c) => c.manual);
    expect(manual).toHaveLength(2);
    expect(manual.every((c) => !c.met)).toBe(true);
  });
});

const gateInput = (over: Partial<PhaseBGateInput> = {}): PhaseBGateInput => ({
  realLeads: 0, realPosts: 0, realAdsCsvImports: 0, realWarRooms: 0,
  pilotLearnings: 0, repeatedRealPatterns: 0, exampleRowsRemaining: 0,
  pilotDayNumber: null, ...over,
});

const ALL_MET: Partial<PhaseBGateInput> = {
  realLeads: 50, realPosts: 10, realAdsCsvImports: 1, realWarRooms: 1,
  pilotLearnings: 5, repeatedRealPatterns: 2, exampleRowsRemaining: 0, pilotDayNumber: 14,
};

describe("phaseBGate — Pilot Lock Mode", () => {
  it("nol data ⇒ terkunci, dengan pesan kunci persis dari owner", () => {
    const g = phaseBGate(gateInput());
    expect(g.locked).toBe(true);
    expect(g.lockMessage).toBe(
      "Fase B belum boleh dimulai. Sistem masih mengumpulkan bukti nyata. Jangan naikkan belief atau threshold sebelum 14 hari data pilot selesai.",
    );
    expect(g.lockMessage).toBe(PHASE_B_LOCK_MESSAGE);
  });
  it("semua syarat terukur + hari ≥ 14 ⇒ gerbang terbuka", () => {
    const g = phaseBGate(gateInput(ALL_MET));
    expect(g.autoMet).toBe(g.totalAuto);
    expect(g.daysDone).toBe(true);
    expect(g.locked).toBe(false);
  });
  it("semua syarat terpenuhi TAPI baru hari 13 ⇒ tetap terkunci — 14 hari tidak bisa dipercepat", () => {
    const g = phaseBGate(gateInput({ ...ALL_MET, pilotDayNumber: 13 }));
    expect(g.locked).toBe(true);
  });
  it("pilot belum dimulai ⇒ terkunci walau angka lain penuh", () => {
    const g = phaseBGate(gateInput({ ...ALL_MET, pilotDayNumber: null }));
    expect(g.locked).toBe(true);
  });
  it("[PILOT] butuh ≥ 5 (lebih ketat dari kriteria pilot); 4 belum cukup", () => {
    const g = phaseBGate(gateInput({ ...ALL_MET, pilotLearnings: 4 }));
    expect(g.conditions.find((c) => c.key === "pilotNotes")?.met).toBe(false);
    expect(g.locked).toBe(true);
  });
  it("pola berulang butuh ≥ 2 learning ber-bukti ganda dari ledger nyata", () => {
    const g = phaseBGate(gateInput({ ...ALL_MET, repeatedRealPatterns: 1 }));
    expect(g.conditions.find((c) => c.key === "patterns")?.met).toBe(false);
    expect(g.locked).toBe(true);
  });
  it("satu baris data contoh tersisa ⇒ syarat bersih-contoh gagal", () => {
    const g = phaseBGate(gateInput({ ...ALL_MET, exampleRowsRemaining: 1 }));
    expect(g.conditions.find((c) => c.key === "noExample")?.met).toBe(false);
    expect(g.locked).toBe(true);
  });
  it("penelusuran triase oleh Noor = manual, TIDAK pernah otomatis lolos", () => {
    const g = phaseBGate(gateInput(ALL_MET));
    const m = g.conditions.find((c) => c.key === "triageReview")!;
    expect(m.manual).toBe(true);
    expect(m.met).toBe(false); // sistem tidak berhak mencentang ini
  });
});

describe("pilotDay (kalender WIB)", () => {
  it("belum mulai ⇒ BELUM_MULAI", () => {
    expect(pilotDay(null, new Date()).phase).toBe("BELUM_MULAI");
  });
  it("hari yang sama ⇒ HARI_1; hari ke-5 ⇒ HARIAN; ke-14 ⇒ HARI_14; ke-15 ⇒ SELESAI", () => {
    const start = new Date("2026-07-01T02:00:00Z"); // 09:00 WIB
    expect(pilotDay(start, new Date("2026-07-01T10:00:00Z")).phase).toBe("HARI_1");
    expect(pilotDay(start, new Date("2026-07-05T10:00:00Z")).day).toBe(5);
    expect(pilotDay(start, new Date("2026-07-14T10:00:00Z")).phase).toBe("HARI_14");
    expect(pilotDay(start, new Date("2026-07-15T10:00:00Z")).phase).toBe("SELESAI");
  });
  it("pergantian hari mengikuti tengah malam WIB, bukan UTC", () => {
    const start = new Date("2026-07-01T02:00:00Z");
    // 30 Jun 18:00 UTC = 1 Jul 01:00 WIB → hari yang sama dengan start (1 Jul WIB)
    expect(pilotDay(start, new Date("2026-07-01T16:59:00Z")).day).toBe(1); // masih 1 Jul 23:59 WIB
    expect(pilotDay(start, new Date("2026-07-01T17:01:00Z")).day).toBe(2); // 2 Jul 00:01 WIB
  });
});
