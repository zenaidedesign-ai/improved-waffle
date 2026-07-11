// Sumber tunggal semua nilai "enum" (SQLite tidak mendukung enum Prisma).
// Setiap dropdown, validasi zod, dan penulisan DB mengimpor dari file ini.

export const STATUS_LAMPU = ["MERAH", "KUNING", "HIJAU"] as const;
export type StatusLampu = (typeof STATUS_LAMPU)[number];

export const STATUS_AUDIT_ITEM = [...STATUS_LAMPU, "BELUM_DICEK"] as const;
export type StatusAuditItem = (typeof STATUS_AUDIT_ITEM)[number];

export const KEYAKINAN = ["RENDAH", "SEDANG", "TINGGI"] as const;
export type Keyakinan = (typeof KEYAKINAN)[number];

export const AUDIT_TYPE = ["META_ACCOUNT", "REKOMENDASI", "TRACKING"] as const;
export type AuditType = (typeof AUDIT_TYPE)[number];

export const AUDIT_TYPE_LABEL: Record<AuditType, string> = {
  META_ACCOUNT: "Audit Akun Meta",
  REKOMENDASI: "Audit Kelayakan Rekomendasi",
  TRACKING: "Audit Tracking",
};

// ── Kosakata keputusan TETAP — tidak ada vonis di luar daftar ini ──
export const KEPUTUSAN = [
  "PERBAIKI_AKUN_DULU",
  "PERBAIKI_TRACKING_DULU",
  "PERBAIKI_KREATIF",
  "GANTI_PENAWARAN",
  "GANTI_AUDIENS",
  "GANTI_CTA",
  "KILL_KAMPANYE",
  "HOLD_KAMPANYE",
  "ITERATE_KAMPANYE",
  "SCALE_KAMPANYE",
  "PINDAH_BUDGET",
  "SPLIT_TEST",
  "JADIKAN_IKLAN",
  "TAHAN_DATA_BELUM_CUKUP",
  "LANJUT",
] as const;
export type Keputusan = (typeof KEPUTUSAN)[number];

export const KEPUTUSAN_LABEL: Record<Keputusan, string> = {
  PERBAIKI_AKUN_DULU: "Perbaiki akun dulu",
  PERBAIKI_TRACKING_DULU: "Perbaiki tracking dulu",
  PERBAIKI_KREATIF: "Perbaiki kreatif",
  GANTI_PENAWARAN: "Ganti penawaran",
  GANTI_AUDIENS: "Ganti audiens",
  GANTI_CTA: "Ganti CTA",
  KILL_KAMPANYE: "Matikan kampanye",
  HOLD_KAMPANYE: "Tahan kampanye",
  ITERATE_KAMPANYE: "Perbaiki & ulangi kampanye",
  SCALE_KAMPANYE: "Perbesar kampanye",
  PINDAH_BUDGET: "Pindah budget",
  SPLIT_TEST: "Uji banding dulu",
  JADIKAN_IKLAN: "Jadikan iklan",
  TAHAN_DATA_BELUM_CUKUP: "Tahan — data belum cukup",
  LANJUT: "Lanjut — tidak ada masalah",
};

// ── Instagram ──
export const IG_FORMAT = ["REELS", "CAROUSEL", "FOTO", "STORY"] as const;
export type IgFormat = (typeof IG_FORMAT)[number];
export const IG_FORMAT_LABEL: Record<IgFormat, string> = {
  REELS: "Reels",
  CAROUSEL: "Carousel",
  FOTO: "Foto",
  STORY: "Story",
};

export const PILAR = [
  "PAIN_BASED",
  "BEFORE_AFTER",
  "FOUNDER_POV",
  "BUDGET_EDUKASI",
  "PROSES_BUKTI",
  "OBJECTION_HANDLING",
  "KONVERSI",
  "PORTFOLIO_LAIN",
] as const;
export type Pilar = (typeof PILAR)[number];
export const PILAR_LABEL: Record<Pilar, string> = {
  PAIN_BASED: "Pain-based (masalah klien)",
  BEFORE_AFTER: "Before–After portofolio",
  FOUNDER_POV: "Sudut pandang founder",
  BUDGET_EDUKASI: "Edukasi budget",
  PROSES_BUKTI: "Proses & bukti",
  OBJECTION_HANDLING: "Menjawab keberatan",
  KONVERSI: "Konversi (ajakan aksi)",
  PORTFOLIO_LAIN: "Portofolio lain / umum",
};
/** 7 pilar pemulihan — PORTFOLIO_LAIN bukan pilar pemulihan */
export const PILAR_PEMULIHAN = PILAR.filter((p) => p !== "PORTFOLIO_LAIN");

export const REKOMENDASI_STATUS = [
  "LAYAK",
  "ADA_KONTEN_DITANDAI",
  "PELANGGARAN",
  "BELUM_DICEK",
] as const;
export type RekomendasiStatus = (typeof REKOMENDASI_STATUS)[number];

// ── Kampanye ──
export const AD_CHANNEL = ["META", "GOOGLE", "TIKTOK", "THREADS"] as const;
export type AdChannel = (typeof AD_CHANNEL)[number];
export const AD_CHANNEL_LABEL: Record<AdChannel, string> = {
  META: "Meta Ads",
  GOOGLE: "Google Ads",
  TIKTOK: "TikTok Ads",
  THREADS: "Threads Placement",
};

export const CAMPAIGN_OBJECTIVE = ["CHAT_WA", "LEAD_FORM", "TRAFFIC", "LAINNYA"] as const;
export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVE)[number];
export const CAMPAIGN_OBJECTIVE_LABEL: Record<CampaignObjective, string> = {
  CHAT_WA: "Chat WhatsApp",
  LEAD_FORM: "Formulir lead",
  TRAFFIC: "Traffic",
  LAINNYA: "Lainnya",
};

export const CAMPAIGN_STATUS = ["AKTIF", "PAUSED", "SELESAI"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS)[number];

// Lapisan masalah — diagnosa berlapis Meta Ads Rescue
export const LAPISAN_MASALAH = [
  "AKUN",
  "TRACKING",
  "DELIVERY",
  "KREATIF",
  "PENAWARAN_AUDIENS",
  "CTA_FRIKSI",
  "WA_FLOW",
  "FOLLOW_UP",
  "TIDAK_ADA",
] as const;
export type LapisanMasalah = (typeof LAPISAN_MASALAH)[number];
export const LAPISAN_LABEL: Record<LapisanMasalah, string> = {
  AKUN: "Fondasi akun",
  TRACKING: "Tracking",
  DELIVERY: "Delivery (penayangan)",
  KREATIF: "Kreatif / hook",
  PENAWARAN_AUDIENS: "Penawaran / audiens",
  CTA_FRIKSI: "CTA / friksi",
  WA_FLOW: "Alur WhatsApp",
  FOLLOW_UP: "Follow-up",
  TIDAK_ADA: "Tidak ada masalah terdeteksi",
};

// ── Lead ──
export const LEAD_STATUS = [
  "CHAT_BARU",
  "MERESPONS",
  "BERKUALITAS",
  "SURVEI_TERJADWAL",
  "SURVEI_SELESAI",
  "PROPOSAL_TERKIRIM",
  "NEGOSIASI",
  "CLOSING_MENANG",
  "CLOSING_KALAH",
  "GHOSTING",
] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

export const LEAD_SOURCE = ["ADS", "IG_ORGANIK", "REFERRAL", "LAINNYA"] as const;
export type LeadSource = (typeof LEAD_SOURCE)[number];

// ── War Room ──
export const WARROOM_DECISION_STATUS = ["TERBUKA", "SELESAI", "BATAL"] as const;

export const STATUS_LABEL: Record<StatusAuditItem, string> = {
  MERAH: "Merah",
  KUNING: "Kuning",
  HIJAU: "Hijau",
  BELUM_DICEK: "Belum dicek",
};
