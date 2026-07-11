import { dayFloorWIB } from "./time";

// Pilot Data Nyata 14 Hari — pelacak kriteria sukses, murni fungsi.
// PENTING: semua hitungan HANYA dari data nyata (isExample: false) —
// data contoh tidak pernah dihitung sebagai kemajuan pilot.

export interface PilotCounts {
  realLeads: number;
  realPosts: number;
  realAdsCsvImports: number; // ImportBatch type ADS_METRIC, non-contoh
  warRoomSessions: number;
  auditTypesRun: number; // berapa dari 3 jenis audit yang punya run nyata
  realSnapshots: number;
  pilotLearnings: number; // Learning berawalan [PILOT] — catatan tuning/ketidaksetujuan
}

export interface PilotCriterion {
  key: string;
  label: string;
  target: number;
  actual: number;
  met: boolean;
  manual?: boolean; // kriteria yang hanya bisa dinilai Noor, bukan sistem
  note?: string;
}

export interface PilotProgress {
  criteria: PilotCriterion[];
  metCount: number;
  totalAuto: number; // kriteria yang bisa diukur sistem
  ready: boolean; // semua kriteria otomatis terpenuhi
}

export function computePilotProgress(c: PilotCounts): PilotProgress {
  const criteria: PilotCriterion[] = [
    { key: "leads", label: "Lead nyata tercatat", target: 50, actual: c.realLeads, met: c.realLeads >= 50 },
    { key: "posts", label: "Post Instagram nyata tercatat", target: 10, actual: c.realPosts, met: c.realPosts >= 10 },
    { key: "adsCsv", label: "Impor CSV Ads Manager nyata", target: 1, actual: c.realAdsCsvImports, met: c.realAdsCsvImports >= 1 },
    { key: "warRoom", label: "Sesi War Room mingguan", target: 1, actual: c.warRoomSessions, met: c.warRoomSessions >= 1 },
    { key: "audits", label: "Ketiga audit dijalankan dengan jawaban nyata", target: 3, actual: c.auditTypesRun, met: c.auditTypesRun >= 3 },
    { key: "snapshots", label: "Snapshot IG mingguan", target: 2, actual: c.realSnapshots, met: c.realSnapshots >= 2 },
    {
      key: "tuning", label: "Catatan tuning/ketidaksetujuan [PILOT] di Knowledge", target: 1,
      actual: c.pilotLearnings, met: c.pilotLearnings >= 1,
      note: "Setiap kali label sistem salah menurut Noor, catat sebagai learning berawalan [PILOT].",
    },
    {
      key: "agreement", label: "Noor setuju dengan triase lead ≥ 80%", target: 80, actual: 0, met: false, manual: true,
      note: "Hanya Noor yang bisa menilai ini — hitung dari catatan [PILOT] di hari ke-14 (setuju / total yang dicek).",
    },
    {
      key: "noForgotten", label: "Tidak ada lead serius yang terlupakan", target: 1, actual: 0, met: false, manual: true,
      note: "Cek di hari ke-14: adakah lead bernilai yang lolos dari antrian follow-up? Kalau ada, itu bug prioritas satu.",
    },
  ];
  const auto = criteria.filter((x) => !x.manual);
  const metCount = auto.filter((x) => x.met).length;
  return { criteria, metCount, totalAuto: auto.length, ready: metCount === auto.length };
}

/** Prefix kanonis catatan pilot — SATU-SATUNYA definisi; jangan tulis string-nya di tempat lain. */
export const PILOT_PREFIX = "[PILOT]";

/** Tandai insight sebagai catatan pilot tanpa mengandalkan ketikan manual (anti salah ketik). */
export function applyPilotTag(insight: string, isPilotNote: boolean): string {
  const clean = insight.trim();
  if (!isPilotNote) return clean;
  return clean.startsWith(PILOT_PREFIX) ? clean : `${PILOT_PREFIX} ${clean}`;
}

// ── Gerbang Fase B — Pilot Lock Mode ──
// Fase B (skoring + lifecycle otomatis) DILARANG dimulai sebelum semua syarat
// data nyata di bawah terpenuhi DAN pilot 14 hari selesai. Gerbang ini murni
// pembaca keadaan: dia tidak membangun apa pun, hanya menolak overbuilding.

export const PHASE_B_LOCK_MESSAGE =
  "Fase B belum boleh dimulai. Sistem masih mengumpulkan bukti nyata. " +
  "Jangan naikkan belief atau threshold sebelum 14 hari data pilot selesai.";

export interface PhaseBGateInput {
  realLeads: number;
  realPosts: number;
  realAdsCsvImports: number;
  realWarRooms: number; // sesi war room non-contoh
  pilotLearnings: number; // learning [PILOT] — ketidaksetujuan ATAU konfirmasi
  repeatedRealPatterns: number; // learning nyata dengan ≥2 bukti MENDUKUNG DATA_INTERNAL nyata di ledger
  exampleRowsRemaining: number; // baris contoh tersisa (lead + post + kampanye)
  pilotDayNumber: number | null; // null = pilot belum dimulai
}

export interface PhaseBGate {
  conditions: PilotCriterion[];
  autoMet: number;
  totalAuto: number;
  daysDone: boolean; // pilot sudah berjalan ≥ 14 hari
  locked: boolean; // true = Fase B DILARANG — ada syarat terukur yang belum terpenuhi
  lockMessage: string;
}

export function phaseBGate(i: PhaseBGateInput): PhaseBGate {
  const conditions: PilotCriterion[] = [
    { key: "leads", label: "Lead nyata tercatat", target: 50, actual: i.realLeads, met: i.realLeads >= 50 },
    { key: "posts", label: "Post Instagram nyata tercatat", target: 10, actual: i.realPosts, met: i.realPosts >= 10 },
    { key: "adsCsv", label: "CSV Ads Manager nyata diimpor", target: 1, actual: i.realAdsCsvImports, met: i.realAdsCsvImports >= 1 },
    { key: "warRoom", label: "War Room mingguan dari data nyata", target: 1, actual: i.realWarRooms, met: i.realWarRooms >= 1 },
    {
      key: "pilotNotes", label: "Ketidaksetujuan/konfirmasi [PILOT] tercatat di Knowledge", target: 5,
      actual: i.pilotLearnings, met: i.pilotLearnings >= 5,
      note: "Setuju maupun tidak setuju dengan vonis sistem — dua-duanya bukti tuning. Awali insight dengan [PILOT].",
    },
    {
      key: "triageReview", label: "Noor sudah menelusuri semua triase lead vs penilaiannya sendiri", target: 1, actual: 0,
      met: false, manual: true,
      note: "Hanya Noor yang bisa menilai ini — kerjakan di hari 14, tulis persentase setuju di learning [PILOT].",
    },
    {
      key: "patterns", label: "Pola berulang dari data nyata (≥2 bukti internal per learning)", target: 2,
      actual: i.repeatedRealPatterns, met: i.repeatedRealPatterns >= 2,
      note: "Dihitung dari ledger bukti Fase A: learning nyata yang punya ≥2 bukti MENDUKUNG bersumber data internal.",
    },
    {
      key: "noExample", label: "Data contoh dihapus (lead/post/kampanye)", target: 0,
      actual: i.exampleRowsRemaining, met: i.exampleRowsRemaining === 0,
      note: "Hitungan pilot memang sudah mengecualikan data contoh secara struktural, tapi gerbang Fase B menuntut layar bersih dari contoh.",
    },
  ];
  const auto = conditions.filter((x) => !x.manual);
  const autoMet = auto.filter((x) => x.met).length;
  const daysDone = i.pilotDayNumber !== null && i.pilotDayNumber >= 14;
  return {
    conditions,
    autoMet,
    totalAuto: auto.length,
    daysDone,
    locked: !daysDone || autoMet < auto.length,
    lockMessage: PHASE_B_LOCK_MESSAGE,
  };
}

export interface PilotDayInfo {
  started: boolean;
  day: number | null; // 1..∞ (WIB, hari kalender)
  phase: "BELUM_MULAI" | "HARI_1" | "HARIAN" | "HARI_14" | "SELESAI";
}

export function pilotDay(startedAt: Date | null, now: Date): PilotDayInfo {
  if (!startedAt) return { started: false, day: null, phase: "BELUM_MULAI" };
  const day = dayFloorWIB(now) - dayFloorWIB(startedAt) + 1;
  return {
    started: true,
    day,
    phase: day <= 1 ? "HARI_1" : day < 14 ? "HARIAN" : day === 14 ? "HARI_14" : "SELESAI",
  };
}
