import { falsifierTemplate } from "./belief";

// Marketing Knowledge Engine (Phase 11) — saran learning DITURUNKAN dari data,
// owner yang memutuskan menyimpan. Satu kejadian BUKAN kebenaran:
// auto-saran maksimal berkekuatan BERKEMBANG; TERBUKTI harus diputuskan owner
// setelah pola berulang, dan hanya sah untuk sumber DATA_INTERNAL.

export const LEARNING_STRENGTH = ["TERBUKTI", "BERKEMBANG", "LEMAH"] as const;
export type LearningStrength = (typeof LEARNING_STRENGTH)[number];

export const LEARNING_SOURCE = [
  "DATA_INTERNAL",
  "PENGETAHUAN_OWNER",
  "OBSERVASI_KOMPETITOR",
  "TREN_PUBLIK",
  "HIPOTESIS",
] as const;
export type LearningSource = (typeof LEARNING_SOURCE)[number];

export const STRENGTH_LABEL: Record<LearningStrength, string> = {
  TERBUKTI: "Terbukti (pola berulang, data internal)",
  BERKEMBANG: "Berkembang (mulai terlihat, butuh pengulangan)",
  LEMAH: "Lemah (kejadian tunggal / sampel kecil)",
};

export const SOURCE_LABEL: Record<LearningSource, string> = {
  DATA_INTERNAL: "Data internal",
  PENGETAHUAN_OWNER: "Pengetahuan owner",
  OBSERVASI_KOMPETITOR: "Observasi kompetitor",
  TREN_PUBLIK: "Tren publik",
  HIPOTESIS: "Hipotesis",
};

export interface LearningSuggestion {
  category: string;
  insight: string;
  supportingData: string;
  sourceType: LearningSource;
  strength: LearningStrength; // dibatasi otomatis berdasar ukuran sampel
  confidence: "RENDAH" | "SEDANG" | "TINGGI";
  recommendedAction: string;
  falsifier: string; // Fase A: setiap saran lahir dengan syarat gugurnya sendiri
}

/** Kekuatan maksimal berdasar ukuran sampel — anti "satu kejadian jadi kebenaran". */
export function strengthCap(n: number): LearningStrength {
  if (n >= 8) return "BERKEMBANG"; // TERBUKTI tidak pernah otomatis
  return "LEMAH";
}

export interface SuggestInput {
  pillarStats: Array<{ pillar: string; n: number; qualifiedLeads: number; medianSaves: number | null }>;
  channelStats: Array<{ channel: string; leads: number; qualified: number }>;
  campaignRows: Array<{ name: string; decision: string; cpqlRibu: number | null; qualifiedLeads: number; qualRatePct: number | null }>;
}

export function suggestLearnings(i: SuggestInput): LearningSuggestion[] {
  const out: LearningSuggestion[] = [];

  // Pilar konten yang menghasilkan lead berkualitas.
  for (const p of i.pillarStats.filter((x) => x.qualifiedLeads >= 1 && x.n >= 2)) {
    out.push({
      category: "KONTEN",
      insight: `Pilar ${p.pillar} menghasilkan lead berkualitas dari konten organik.`,
      supportingData: `${p.qualifiedLeads} lead berkualitas dari ${p.n} post (median saves ${p.medianSaves ?? 0}).`,
      sourceType: "DATA_INTERNAL",
      strength: strengthCap(p.n),
      confidence: p.n >= 8 ? "SEDANG" : "RENDAH",
      recommendedAction: `Pertahankan ritme pilar ${p.pillar}; uji variasi hook lewat kartu eksperimen.`,
      falsifier: falsifierTemplate("KONTEN"),
    });
  }

  // Kanal yang menghasilkan lead kualitas rendah.
  for (const c of i.channelStats.filter((x) => x.leads >= 5)) {
    const rate = Math.round((c.qualified / c.leads) * 100);
    if (rate < 30) {
      out.push({
        category: "KANAL",
        insight: `Kanal ${c.channel} cenderung menghasilkan lead kualitas rendah.`,
        supportingData: `Hanya ${c.qualified}/${c.leads} (${rate}%) yang berkualitas.`,
        sourceType: "DATA_INTERNAL",
        strength: strengthCap(c.leads),
        confidence: c.leads >= 10 ? "SEDANG" : "RENDAH",
        recommendedAction: "Perketat penawaran/penyaringan di kanal ini, atau geser budget ke kanal dengan rasio kualifikasi lebih baik.",
        falsifier: falsifierTemplate("KANAL"),
      });
    }
  }

  // Pola kampanye yang harus dihindari (jebakan chat murah).
  for (const k of i.campaignRows.filter((x) => x.decision === "GANTI_PENAWARAN")) {
    out.push({
      category: "KAMPANYE",
      insight: `Pola kampanye seperti "${k.name}" (chat ramai, kualifikasi rendah) harus dihindari.`,
      supportingData: `Rasio kualifikasi ${k.qualRatePct ?? 0}% — jauh di bawah ambang 30%.`,
      sourceType: "DATA_INTERNAL",
      strength: "LEMAH",
      confidence: "SEDANG",
      recommendedAction: "Jangan ulangi penawaran/audiens serupa tanpa perubahan; catat pola ini saat merancang kampanye baru.",
      falsifier: falsifierTemplate("KAMPANYE"),
    });
  }

  // Pola kampanye yang layak diulang.
  for (const k of i.campaignRows.filter((x) => x.decision === "SCALE_KAMPANYE")) {
    out.push({
      category: "KAMPANYE",
      insight: `Pola kampanye seperti "${k.name}" layak diulang.`,
      supportingData: `CPQL Rp ${k.cpqlRibu} rb dengan ${k.qualifiedLeads} lead berkualitas.`,
      sourceType: "DATA_INTERNAL",
      strength: "LEMAH", // satu kampanye = satu kejadian
      confidence: "SEDANG",
      recommendedAction: "Ulangi struktur penawaran+audiens ini di kampanye berikutnya; naikkan ke BERKEMBANG setelah pola terjadi ≥ 2 kali.",
      falsifier: falsifierTemplate("KAMPANYE"),
    });
  }

  return out;
}
