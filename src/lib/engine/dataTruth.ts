// Kebijakan Kebenaran Data (Layer D, E, F) — murni fungsi, teruji.
// Aturan utama: sistem TIDAK PERNAH berpura-pura data itu live.
// Setiap titik data membawa: sumber, keandalan, tanggal, dan catatannya.

export const DATA_SOURCE = [
  "MANUAL",
  "CSV",
  "SCREENSHOT",
  "GOOGLE_SHEET",
  "EMAIL_REPORT",
  "PUBLIC_LINK",
  "API_RESMI",
] as const;
export type DataSource = (typeof DATA_SOURCE)[number];

export const DATA_SOURCE_LABEL: Record<DataSource, string> = {
  MANUAL: "Input manual",
  CSV: "Impor CSV (ekspor resmi)",
  SCREENSHOT: "Transkrip dari screenshot",
  GOOGLE_SHEET: "Google Sheet",
  EMAIL_REPORT: "Laporan email",
  PUBLIC_LINK: "Observasi tautan publik",
  API_RESMI: "API resmi",
};

// ── Layer D: Keandalan per sumber (rentang %, sesuai kebijakan owner) ──
export interface Reliability {
  minPct: number;
  maxPct: number;
  note: string; // catatan keandalan — ditampilkan apa adanya
  verifyBeforeBudget: boolean; // wajib verifikasi sebelum keputusan budget?
}

export const RELIABILITY: Record<DataSource, Reliability> = {
  API_RESMI: {
    minPct: 95, maxPct: 100, verifyBeforeBudget: false,
    note: "Sinkron resmi — BELUM AKTIF di sistem ini. Jangan percaya klaim 'live' sampai benar-benar terpasang & teruji.",
  },
  CSV: {
    minPct: 90, maxPct: 95, verifyBeforeBudget: false,
    note: "Ekspor resmi platform — akurat pada saat ekspor; membeku setelahnya.",
  },
  GOOGLE_SHEET: {
    minPct: 80, maxPct: 95, verifyBeforeBudget: false,
    note: "Tergantung disiplin pengisian sheet — angka hanya sebaik orang yang mengetiknya.",
  },
  MANUAL: {
    minPct: 60, maxPct: 90, verifyBeforeBudget: false,
    note: "Input manual — rawan salah ketik dan salah ingat; cocokkan berkala dengan sumber aslinya.",
  },
  SCREENSHOT: {
    minPct: 60, maxPct: 85, verifyBeforeBudget: true,
    note: "Data hasil transkrip screenshot. Verifikasi sebelum keputusan budget atau kampanye.",
  },
  PUBLIC_LINK: {
    minPct: 40, maxPct: 70, verifyBeforeBudget: true,
    note: "Observasi publik saja. Performa privat kompetitor TIDAK diketahui — jangan perlakukan sebagai fakta internal.",
  },
  EMAIL_REPORT: {
    minPct: 85, maxPct: 95, verifyBeforeBudget: false,
    note: "Laporan email platform — jalur disiapkan, BELUM AKTIF.",
  },
};

export type ConfidenceLabel = "RENDAH" | "SEDANG" | "TINGGI";

export function sourceConfidence(source: DataSource): { pct: number; label: ConfidenceLabel; note: string } {
  const r = RELIABILITY[source];
  const pct = Math.round((r.minPct + r.maxPct) / 2);
  return { pct, label: pct >= 88 ? "TINGGI" : pct >= 70 ? "SEDANG" : "RENDAH", note: r.note };
}

// ── Layer E: Peringatan kebasian data ──
export const FRESHNESS_DAYS = {
  INSTAGRAM: 7,
  ADS: 3,
  LEAD_FOLLOWUP: 2,
  KOMPETITOR: 30,
} as const;
export type FreshnessKind = keyof typeof FRESHNESS_DAYS;

const KIND_LABEL: Record<FreshnessKind, string> = {
  INSTAGRAM: "Data Instagram",
  ADS: "Data iklan",
  LEAD_FOLLOWUP: "Data follow-up lead",
  KOMPETITOR: "Data kompetitor",
};

export interface FreshnessWarning {
  kind: FreshnessKind;
  ageDays: number | null; // null = tidak ada data sama sekali
  thresholdDays: number;
  message: string;
}

/** null lastUpdate = tidak ada data — itu juga peringatan, bukan diam. */
export function checkFreshness(kind: FreshnessKind, lastUpdate: Date | null, now: Date): FreshnessWarning | null {
  const threshold = FRESHNESS_DAYS[kind];
  if (lastUpdate === null) {
    return {
      kind, ageDays: null, thresholdDays: threshold,
      message: `${KIND_LABEL[kind]}: belum ada data sama sekali.`,
    };
  }
  const ageDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (24 * 3600 * 1000));
  if (ageDays <= threshold) return null;
  return {
    kind, ageDays, thresholdDays: threshold,
    message: `${KIND_LABEL[kind]} basi (${ageDays} hari, ambang ${threshold} hari). Jangan ambil keputusan budget tanpa refresh.`,
  };
}

// ── Layer F: Konflik antar sumber — tidak pernah disembunyikan ──
export interface SourceConflict {
  subject: string;
  field: string;
  sides: Array<{ source: string; value: number }>;
  message: string;
  recommendation: string;
}

export interface CampaignConflictInput {
  name: string;
  manualChats: number;
  linkedChats: number; // baris Lead tertaut
  manualQualified: number;
  linkedQualified: number;
  resultsPlatform: number | null;
  chatsUsed: number; // angka yang dipakai engine (max)
}

const REKOMENDASI_VERIFIKASI = "Verifikasi sumber sebelum mengambil keputusan budget.";

export function detectCampaignConflicts(c: CampaignConflictInput): SourceConflict[] {
  const out: SourceConflict[] = [];

  if (c.manualChats > 0 && c.linkedChats > 0 && c.manualChats !== c.linkedChats) {
    out.push({
      subject: c.name,
      field: "chat masuk",
      sides: [
        { source: "Input manual", value: c.manualChats },
        { source: "Log lead", value: c.linkedChats },
      ],
      message: `Konflik data terdeteksi — chat masuk "${c.name}": input manual ${c.manualChats}, log lead ${c.linkedChats}.`,
      recommendation: REKOMENDASI_VERIFIKASI,
    });
  }

  if (c.manualQualified > 0 && c.linkedQualified > 0 && c.manualQualified !== c.linkedQualified) {
    out.push({
      subject: c.name,
      field: "lead berkualitas",
      sides: [
        { source: "Input manual", value: c.manualQualified },
        { source: "Log lead", value: c.linkedQualified },
      ],
      message: `Konflik data terdeteksi — lead berkualitas "${c.name}": input manual ${c.manualQualified}, log lead ${c.linkedQualified}.`,
      recommendation: REKOMENDASI_VERIFIKASI,
    });
  }

  // Klaim platform jauh di atas catatan sendiri = konflik yang harus terlihat.
  if (c.resultsPlatform !== null && c.chatsUsed > 0 && c.resultsPlatform > Math.ceil(c.chatsUsed * 1.3)) {
    out.push({
      subject: c.name,
      field: "hasil vs catatan",
      sides: [
        { source: "Klaim Ads Manager", value: c.resultsPlatform },
        { source: "Catatan sendiri", value: c.chatsUsed },
      ],
      message: `Konflik data terdeteksi — "${c.name}": Ads Manager mengklaim ${c.resultsPlatform} hasil, catatan sendiri ${c.chatsUsed} chat.`,
      recommendation: "Cek pembeda sumber chat (Audit Tracking T1) — selisih sebesar ini biasanya berarti tracking bocor.",
    });
  }

  return out;
}

// ── Kalimat kebijakan tetap (dipakai seragam di seluruh UI) ──
export const TRUTH_PHRASES = {
  notEnough: "Data andal belum cukup.",
  stale: "Data basi. Jangan ambil keputusan budget tanpa refresh.",
  screenshot: "Data hasil transkrip screenshot. Verifikasi sebelum keputusan budget atau kampanye.",
  publicOnly: "Observasi publik saja. Performa privat kompetitor tidak diketahui.",
  notLive: "Data ini TIDAK live — sumbernya manual/CSV/screenshot dengan tanggal tercatat.",
} as const;
