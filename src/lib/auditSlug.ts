import type { AuditType } from "./domain/enums";

export const SLUG_TO_TYPE: Record<string, AuditType> = {
  "meta-account": "META_ACCOUNT",
  rekomendasi: "REKOMENDASI",
  tracking: "TRACKING",
};

export const TYPE_TO_SLUG: Record<AuditType, string> = {
  META_ACCOUNT: "meta-account",
  REKOMENDASI: "rekomendasi",
  TRACKING: "tracking",
};

export const AUDIT_INTRO: Record<AuditType, string> = {
  META_ACCOUNT:
    "Sistem tidak punya akses API Meta — audit ini memandu Anda mengecek sendiri di Meta Business Suite, lalu mencatat apa yang Anda lihat. Item MEMBLOKIR yang merah akan mengunci semua vonis kampanye & konten.",
  REKOMENDASI:
    "Cek kelayakan rekomendasi langsung di aplikasi Instagram (Pengaturan → Status Akun). Akun yang dikeluarkan dari rekomendasi kehilangan hampir seluruh reach non-follower.",
  TRACKING:
    "Pertanyaan intinya: kalau besok 10 chat masuk, bisakah kita tahu chat mana dari kampanye mana? Kalau tidak, semua angka biaya per hasil adalah tebakan.",
};
