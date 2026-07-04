// Teks jangkar rubrik Algorithm Fit Score — 11 dimensi, nilai 0–5.
// Skor ini adalah HIPOTESIS SINYAL yang bisa diuji, bukan kepastian algoritma.

import type { FitWeights } from "./config";

export interface FitDimensionDef {
  key: keyof FitWeights;
  label: string;
  anchor0: string; // arti nilai 0
  anchor5: string; // arti nilai 5
}

export const FIT_DIMENSIONS: FitDimensionDef[] = [
  {
    key: "hook3s",
    label: "Hook 3 detik pertama",
    anchor0: "Pembuka datar, tidak ada alasan berhenti scroll",
    anchor5: "Kalimat/visual pertama langsung menohok masalah atau angka",
  },
  {
    key: "visualStopScroll",
    label: "Kekuatan visual stop-scroll",
    anchor0: "Visual biasa, mirip semua akun interior lain",
    anchor5: "Frame pertama beda sendiri di feed — kontras, gerak, atau kejutan",
  },
  {
    key: "painPointClarity",
    label: "Kejelasan masalah klien",
    anchor0: "Tidak menyentuh masalah siapa pun",
    anchor5: "Penonton langsung merasa 'ini masalah saya'",
  },
  {
    key: "originality",
    label: "Orisinalitas",
    anchor0: "Meniru template yang sudah jenuh",
    anchor5: "Sudut pandang yang belum dipakai kompetitor",
  },
  {
    key: "savePotential",
    label: "Potensi disimpan (save)",
    anchor0: "Tidak ada alasan menyimpan",
    anchor5: "Berisi referensi/checklist/angka yang ingin dibuka lagi",
  },
  {
    key: "sharePotential",
    label: "Potensi dibagikan (share)",
    anchor0: "Tidak ada alasan mengirim ke orang lain",
    anchor5: "Pasangan/keluarga yang sedang renovasi PASTI dikirimi ini",
  },
  {
    key: "profileVisitPotential",
    label: "Potensi kunjungan profil",
    anchor0: "Selesai ditonton, tidak penasaran siapa pembuatnya",
    anchor5: "Memancing 'siapa ini?' → klik profil",
  },
  {
    key: "waLeadPotential",
    label: "Potensi chat WA / lead",
    anchor0: "Tidak ada jembatan ke percakapan",
    anchor5: "Ajakan chat terasa wajar dan mudah (tanya estimasi, minta survei)",
  },
  {
    key: "brandFit",
    label: "Kecocokan brand Zenaide",
    anchor0: "Merusak positioning premium",
    anchor5: "Memperkuat citra design & build premium Surabaya",
  },
  {
    key: "recommendationSafety",
    label: "Keamanan rekomendasi",
    anchor0: "Berisiko ditandai (musik ilegal, klaim medis/uang, watermark)",
    anchor5: "Sepenuhnya aman untuk direkomendasikan",
  },
  {
    key: "businessValue",
    label: "Nilai bisnis",
    anchor0: "Sekadar ramai, tidak mendekatkan ke proyek",
    anchor5: "Langsung mendorong survei/proposal atau menyaring budget",
  },
];
