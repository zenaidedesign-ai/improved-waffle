// Definisi format CSV — satu sumber untuk template, impor, dan ekspor.
// Header Bahasa Indonesia, identik dengan urutan form manual.

export const CSV_TYPES = ["IG_POST", "LEAD", "ADS_METRIC"] as const;
export type CsvType = (typeof CSV_TYPES)[number];

export const CSV_DEF: Record<
  CsvType,
  { label: string; headers: string[]; example: string[]; aliases: Record<string, string> }
> = {
  IG_POST: {
    label: "Post Instagram",
    headers: ["tanggal", "format", "pilar", "hook", "cta", "reach", "reach_non_follower", "plays", "likes", "komentar", "saves", "shares", "kunjungan_profil", "follows", "klik_dm", "klik_wa", "leads", "leads_berkualitas"],
    example: ["2026-06-01", "REELS", "BUDGET_EDUKASI", "[CONTOH] Interior 2BR mulai dari berapa?", "DM SURVEI", "6800", "4200", "7000", "320", "35", "260", "95", "140", "30", "4", "18", "4", "2"],
    aliases: {
      "accounts reached": "reach",
      "akun yang dijangkau": "reach",
      "tanggal tayang": "tanggal",
      "comments": "komentar",
      "profile visits": "kunjungan_profil",
      // TikTok "profile views" ≈ kunjungan profil IG — permukaan berbeda,
      // bandingkan hanya dalam platform yang sama (catatan Layer C).
      "profile views": "kunjungan_profil",
    },
  },
  LEAD: {
    label: "Lead",
    headers: ["nama", "sumber", "status", "sinyal_budget", "sinyal_proyek", "sinyal_lokasi", "sinyal_urgensi", "sinyal_keseriusan", "jawaban_kualifikasi", "estimasi_nilai_juta", "tanggal_masuk"],
    example: ["[CONTOH] Bu Ani — 2BR", "ADS", "MERESPONS", "14", "12", "18", "10", "12", "3", "150", "2026-06-20"],
    aliases: { name: "nama", source: "sumber" },
  },
  ADS_METRIC: {
    label: "Metrik Iklan Harian",
    headers: ["kampanye", "tanggal", "spend_ribu", "impresi", "klik", "hasil_platform"],
    example: ["[CONTOH] Promo Kitchen Set — Broad", "2026-06-25", "350", "21000", "380", "9"],
    aliases: {
      // Meta Ads Manager
      "campaign name": "kampanye",
      "day": "tanggal",
      "amount spent (idr)": "spend_ribu",
      "amount spent": "spend_ribu",
      "impressions": "impresi",
      "link clicks": "klik",
      "results": "hasil_platform",
      // Google Ads — "cost" dinormalkan ke spend
      "campaign": "kampanye",
      "cost": "spend_ribu",
      "cost (idr)": "spend_ribu",
      "clicks": "klik",
      "impr.": "impresi",
      "conversions": "hasil_platform",
      // TikTok Ads — "total cost" dinormalkan ke spend
      "campaign_name": "kampanye",
      "total cost": "spend_ribu",
      "date": "tanggal",
      "result": "hasil_platform",
    },
  },
};

export function toCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\r\n");
}

/** Petakan header file → header kanonik (case-insensitive + alias). */
/** Catatan normalisasi lintas platform — ditampilkan di layar Impor (Layer C). */
export const NORMALIZATION_NOTES: Array<{ canonical: string; sources: string; note: string }> = [
  { canonical: "spend_ribu", sources: 'Meta "Amount spent" · Google "Cost" · TikTok "Total cost"', note: "Semua dinormalkan ke ribu rupiah. Cek mata uang akun iklan sebelum impor." },
  { canonical: "hasil_platform", sources: 'Meta "Results" · Google "Conversions" · TikTok "Result"', note: "Definisi 'hasil' BERBEDA per platform — tidak pernah dipakai untuk vonis, hanya pembanding kejujuran." },
  { canonical: "kunjungan_profil", sources: 'IG "Profile visits" · TikTok "Profile views"', note: "Permukaan berbeda; bandingkan hanya di dalam platform yang sama." },
];

export function mapHeader(raw: string, type: CsvType): string | null {
  const low = raw.trim().toLowerCase();
  const def = CSV_DEF[type];
  if (def.headers.includes(low)) return low;
  return def.aliases[low] ?? null;
}
