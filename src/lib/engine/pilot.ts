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

export interface PilotDayInfo {
  started: boolean;
  day: number | null; // 1..∞ (WIB, hari kalender)
  phase: "BELUM_MULAI" | "HARI_1" | "HARIAN" | "HARI_14" | "SELESAI";
}

const WIB_MS = 7 * 3600 * 1000;
const dayFloorWIB = (d: Date) => Math.floor((d.getTime() + WIB_MS) / (24 * 3600 * 1000));

export function pilotDay(startedAt: Date | null, now: Date): PilotDayInfo {
  if (!startedAt) return { started: false, day: null, phase: "BELUM_MULAI" };
  const day = dayFloorWIB(now) - dayFloorWIB(startedAt) + 1;
  return {
    started: true,
    day,
    phase: day <= 1 ? "HARI_1" : day < 14 ? "HARIAN" : day === 14 ? "HARI_14" : "SELESAI",
  };
}
