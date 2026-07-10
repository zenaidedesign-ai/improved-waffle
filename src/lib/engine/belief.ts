// Intelligence Layer — Fase A: Ledger + Proyeksi (docs/INTELLIGENCE-LAYER-ARCHITECTURE.md §10).
// Murni fungsi, tanpa klaim baru: fase ini HANYA mencatat bukti (EvidenceItem),
// merekam riwayat revisi (BeliefRevision), dan memproyeksikan learning yang sudah ada
// menjadi kematangan belief. Penilaian ulang otomatis (scoreBelief) = Fase B, BUKAN di sini.
//
// Dua sumbu (§2.1) — tidak boleh kabur:
// - Sumbu A (jenis BUKTI, properti EvidenceItem): FAKTA · OBSERVASI · ASUMSI_OWNER.
// - Sumbu B (kematangan KLAIM, properti Belief/Learning): hipotesis → pola → ... → terbukti.
// Belief tidak pernah "adalah" buktinya; bukti MENEMPEL pada belief.

import type { LearningSource, LearningStrength } from "./knowledge";

// ── Sumbu A: jenis bukti ──
export const EVIDENCE_TYPE = ["FAKTA", "OBSERVASI", "ASUMSI_OWNER"] as const;
export type EvidenceType = (typeof EVIDENCE_TYPE)[number];

export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  FAKTA: "Fakta (data internal yang terbukti sampai revenue)",
  OBSERVASI: "Observasi (satu titik data terukur, internal atau publik)",
  ASUMSI_OWNER: "Asumsi owner (pengetahuan belum terverifikasi)",
};

export const EVIDENCE_POLARITY = ["MENDUKUNG", "MENENTANG"] as const;
export type EvidencePolarity = (typeof EVIDENCE_POLARITY)[number];

/**
 * Jenis bukti diturunkan dari sumber learning (§2.2). FAKTA hanya untuk
 * DATA_INTERNAL yang SUDAH dikonfirmasi sampai revenue proyek — dan karena
 * penangkapan hasil proyek belum ada (lihat CAPTURE_GAPS), `revenueConfirmed`
 * default false: di Fase A hampir semua bukti internal jujurnya OBSERVASI.
 */
export function deriveEvidenceType(sourceKind: LearningSource, revenueConfirmed = false): EvidenceType {
  if (sourceKind === "DATA_INTERNAL") return revenueConfirmed ? "FAKTA" : "OBSERVASI";
  if (sourceKind === "PENGETAHUAN_OWNER" || sourceKind === "HIPOTESIS") return "ASUMSI_OWNER";
  return "OBSERVASI"; // OBSERVASI_KOMPETITOR / TREN_PUBLIK — terukur tapi publik
}

/** Cap C transitif: bukti dari pengamatan publik menandai belief-nya selamanya. */
export function isPublicEvidence(sourceKind: LearningSource): boolean {
  return sourceKind === "OBSERVASI_KOMPETITOR" || sourceKind === "TREN_PUBLIK";
}

/**
 * Keandalan bukti per sumber learning — dipetakan dari rentang RELIABILITY
 * di dataTruth.ts (nilai tengah), bukan angka baru:
 * DATA_INTERNAL lewat input manual/CSV ≈ MANUAL (60–90 → 75);
 * observasi kompetitor & tren publik = PUBLIC_LINK (40–70 → 55);
 * pengetahuan owner = batas bawah MANUAL (60); hipotesis di bawah publik (40).
 */
export const EVIDENCE_RELIABILITY_PCT: Record<LearningSource, number> = {
  DATA_INTERNAL: 75,
  PENGETAHUAN_OWNER: 60,
  OBSERVASI_KOMPETITOR: 55,
  TREN_PUBLIK: 55,
  HIPOTESIS: 40,
};

// ── Sumbu B: kematangan belief (proyeksi jujur, TANPA skoring baru) ──
export const BELIEF_MATURITY = ["HIPOTESIS", "POLA", "TERBUKTI"] as const;
export type BeliefMaturity = (typeof BELIEF_MATURITY)[number];

export const MATURITY_LABEL: Record<BeliefMaturity, string> = {
  HIPOTESIS: "Masih diuji (hipotesis)",
  POLA: "Mulai terlihat pola (belum terbukti)",
  TERBUKTI: "Sudah terbukti (keputusan owner)",
};

export interface EvidenceLike {
  polarity: EvidencePolarity | string;
  contributesToScore: boolean;
}

export interface MaturityProjection {
  maturity: BeliefMaturity;
  /** Ada bukti MENENTANG yang belum diadili — Fase A hanya MENANDAI, tidak menurunkan otomatis. */
  openContradiction: boolean;
  supportingCount: number;
  opposingCount: number;
  note: string;
}

/**
 * Proyeksi kematangan dari kekuatan tersimpan (§2.2 "Stored projection"):
 * LEMAH → HIPOTESIS · BERKEMBANG → POLA · TERBUKTI → TERBUKTI.
 * Bukti MENENTANG tidak menurunkan status di Fase A (itu wewenang Fase B /
 * keputusan owner) — tapi WAJIB terlihat sebagai kontradiksi terbuka.
 */
export function deriveMaturity(strength: LearningStrength | string, evidence: EvidenceLike[]): MaturityProjection {
  const counted = evidence.filter((e) => e.contributesToScore);
  const supportingCount = counted.filter((e) => e.polarity === "MENDUKUNG").length;
  const opposingCount = counted.filter((e) => e.polarity === "MENENTANG").length;
  const openContradiction = opposingCount > 0;
  const maturity: BeliefMaturity =
    strength === "TERBUKTI" ? "TERBUKTI" : strength === "BERKEMBANG" ? "POLA" : "HIPOTESIS";
  const note = openContradiction
    ? `Ada ${opposingCount} bukti MENENTANG yang belum diadili — status belum diturunkan otomatis; putuskan di knowledge.`
    : supportingCount === 0
      ? "Ledger bukti masih kosong — learning ini lahir sebelum ledger, atau buktinya belum dicatat."
      : `${supportingCount} bukti mendukung, ${opposingCount} menentang.`;
  return { maturity, openContradiction, supportingCount, opposingCount, note };
}

// ── Provenance: jawaban "kenapa sistem percaya ini?" (§4.2) ──
export interface RevisionLike {
  fromState: string | null;
  toState: string;
  trigger: string;
  actor: string;
  createdAt: Date;
}

export interface Provenance {
  projection: MaturityProjection;
  lastRevision: RevisionLike | null;
  honestyNotes: string[]; // ditampilkan apa adanya di UI
}

export function buildProvenance(input: {
  strength: LearningStrength | string;
  derivedFromPublic: boolean;
  falsifier: string | null;
  evidence: EvidenceLike[];
  revisions: RevisionLike[];
}): Provenance {
  const projection = deriveMaturity(input.strength, input.evidence);
  const lastRevision =
    input.revisions.length === 0
      ? null
      : [...input.revisions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const honestyNotes: string[] = [];
  if (input.derivedFromPublic) {
    honestyNotes.push(
      "Berakar dari pengamatan publik — performa privat kompetitor tidak diketahui; maksimal jadi bahan uji, bukan fakta internal.",
    );
  }
  if (!input.falsifier) {
    honestyNotes.push(
      "Belum punya falsifier (learning lama). Tambahkan: 'bukti apa yang akan memaksa kita membuangnya?'",
    );
  }
  if (projection.openContradiction) {
    honestyNotes.push("Kontradiksi terbuka — jangan pakai learning ini untuk keputusan budget sebelum diadili.");
  }
  if (projection.supportingCount === 0 && !projection.openContradiction) {
    honestyNotes.push("Belum ada bukti tercatat di ledger — klaim ini baru sekuat data pendukung awalnya.");
  }
  return { projection, lastRevision, honestyNotes };
}

// ── Capture-Gap Register (§5): titik buta yang DIAKUI sistem, bukan disembunyikan ──
export interface CaptureGap {
  key: string;
  label: string;
  why: string; // apa yang tidak bisa dilakukan sistem selama sumber ini belum ditangkap
}

export const CAPTURE_GAPS: readonly CaptureGap[] = [
  {
    key: "WA_CONVERSATION",
    label: "Isi percakapan WhatsApp",
    why: "Bahasa & keberatan calon klien tidak terbaca — pola keberatan hanya sekuat ingatan manual di Pain & Keberatan.",
  },
  {
    key: "PROPOSAL_RESULT",
    label: "Hasil proposal (menang/kalah + alasan)",
    why: "Tanpa ini rasio menang per jenis penawaran tidak bisa dihitung — 'penawaran X lebih laku' tetap asumsi.",
  },
  {
    key: "PROJECT_OUTCOME",
    label: "Hasil proyek terkirim (nilai & margin)",
    why: "Selama ini belum ditangkap, TIDAK ADA belief yang bisa jadi FAKTA ber-revenue — tier 'Terbukti' jujurnya menganggur.",
  },
  {
    key: "LOSS_REASON",
    label: "Alasan lead hilang",
    why: "Analisa kalah-menang (harga? timing? kompetitor?) tidak mungkin — jangan percaya siapa pun yang mengklaimnya dari data ini.",
  },
  {
    key: "MARKET_OBSERVATION",
    label: "Observasi pasar terstruktur (TREN_PUBLIK)",
    why: "Tren publik baru masuk sebagai catatan bebas — belum bisa dibandingkan antar waktu.",
  },
] as const;

// ── Template falsifier per kategori — membantu, tidak memaksa isi ──
export function falsifierTemplate(category: string): string {
  const map: Record<string, string> = {
    KONTEN: "Jika 8 post berikutnya di pilar ini menghasilkan 0 lead berkualitas, buang learning ini.",
    KANAL: "Jika 10 lead berikutnya dari kanal ini punya rasio kualifikasi ≥ 30%, buang learning ini.",
    KAMPANYE: "Jika kampanye serupa berikutnya mencapai CPQL ≤ target dengan kualifikasi ≥ 30%, buang learning ini.",
    AREA: "Jika 5 lead berikutnya dari area ini tidak menunjukkan pola yang sama, buang learning ini.",
    LEAD_SIGNAL: "Jika sinyal ini salah memprediksi kualitas pada 5 lead berikutnya, buang learning ini.",
  };
  return map[category] ?? "Tulis bukti spesifik yang, kalau terjadi, memaksa learning ini dibuang atau diturunkan.";
}
