// Ambang & bobot default — setiap angka punya alasan tertulis.
// Fase 1: dibaca sebagai konstanta. Layar Pengaturan (fase berikut) akan
// menyimpan override di tabel Setting.

export interface FitWeights {
  hook3s: number;
  visualStopScroll: number;
  painPointClarity: number;
  originality: number;
  savePotential: number;
  sharePotential: number;
  profileVisitPotential: number;
  waLeadPotential: number;
  brandFit: number;
  recommendationSafety: number;
  businessValue: number;
}

export const DEFAULT_FIT_WEIGHTS: FitWeights = {
  // Bobot lebih besar pada dimensi yang paling dekat ke uang (waLead, businessValue)
  // dan sinyal distribusi (save/share). Total tidak harus 100 — komposit dinormalkan.
  hook3s: 12,
  visualStopScroll: 8,
  painPointClarity: 10,
  originality: 6,
  savePotential: 10,
  sharePotential: 10,
  profileVisitPotential: 8,
  waLeadPotential: 14,
  brandFit: 6,
  recommendationSafety: 6,
  businessValue: 10,
};

/** Bobot skor sinyal per post — heuristik yang BISA disetel, bukan klaim algoritma.
 *  Alasan bobot: sinyal niat (save/share) dan jembatan bisnis (klik WA, kunjungan
 *  profil) diberi bobot terbesar karena paling dekat ke chat & proyek; lead
 *  berkualitas adalah sinyal bisnis nyata sehingga bonusnya paling besar. */
export const SIGNAL_WEIGHTS = {
  saveRatePer100Reach: 8,
  shareRatePer100Reach: 10,
  profileVisitRatePer100Reach: 5,
  waClickRatePer100Reach: 12,
  nonFollowerPct: 0.3,
  perQualifiedLead: 15,
} as const;

export const CONFIG = {
  /** Minimal post sebelum deteksi pemenang organik & analisis campuran konten.
   *  Alasan: di bawah 8 post, persentil ke-80 hanya 1–2 post dan menyesatkan. */
  winnerMinPosts: 8,
  /** Persentil ambang pemenang (saves/shares/klik WA). */
  winnerPercentile: 0.8,

  /** Batas "terlalu portfolio": > 60% konten berpilar PORTFOLIO_LAIN / BEFORE_AFTER.
   *  Alasan: akun jasa premium tetap butuh bukti karya, tapi tanpa konten
   *  masalah-solusi & edukasi budget, non-follower tidak punya alasan peduli. */
  portfolioHeavyPct: 60,

  /** Lead berkualitas: skor ≥ 60 dari 100 DAN menjawab ≥ 3 pertanyaan kualifikasi. */
  leadQualifiedMinScore: 60,
  leadQualifiedMinAnswers: 3,
  /** Lead berkualitas senyap > 2 hari masuk antrian follow-up. */
  leadMaxSilentDays: 2,

  /** Target CPQL default (ribu rupiah): Rp 300 rb per lead berkualitas.
   *  Alasan: proyek interior bernilai puluhan-ratusan juta; CPQL Rp 300 rb
   *  dengan closing rate 10% berarti biaya akuisisi ~Rp 3 jt per proyek — sehat.
   *  Angka ini HARUS disetel owner sesuai realita. */
  adsTargetCpqlRibu: 300,
  /** Tidak ada vonis kampanye sebelum spend ≥ 3× target CPQL ATAU ≥ 10 chat.
   *  Alasan: di bawah itu variasi acak lebih besar daripada sinyal. */
  adsMinSpendMultiple: 3,
  adsMinChats: 10,
  /** Jebakan chat murah: chat ≥ ambang & rasio kualifikasi < 30%. */
  adsCheapChatMinChats: 8,
  adsCheapChatQualRatePct: 30,
  /** CTR di bawah 1% = indikasi masalah kreatif (tolok ukur kasar industri jasa). */
  adsLowCtrPct: 1.0,
  /** Scale bertahap: naikkan budget 20–30%, bukan digandakan. */
  adsScaleStepPct: 25,

  /** Tren reach non-follower butuh ≥ 3 titik data mingguan. */
  trendMinPoints: 3,
  /** Pembanding prediksi-vs-aktual butuh ≥ 5 post yang diskor dan sudah tayang. */
  predVsActualMinPosts: 5,

  /** Maks keputusan per sesi War Room. Alasan: > 5 keputusan = tidak ada yang jalan. */
  warRoomMaxDecisions: 5,

  /** Split test: dua kampanye ber-CPQL sehat yang selisihnya < 25% dianggap
   *  "sama dalam batas noise" — memindah budget di selisih sekecil ini = menebak. */
  splitTestCpqlNoisePct: 25,

  /** Lead yang WAJIB ditangani Noor sendiri: nilai ≥ 300 jt (satu proyek besar
   *  menutup CAC berbulan-bulan), status negosiasi, atau prob. closing ≥ 60%. */
  noorHandleValueJuta: 300,
  noorHandleClosingProbPct: 60,

  /** Audit lebih tua dari 30 hari = kadaluarsa; status HIJAU turun ke KUNING.
   *  Alasan: kondisi akun Meta bisa berubah tanpa pemberitahuan. */
  auditMaxAgeDays: 30,

  /** Ingatkan cadangan CSV kalau ekspor terakhir > 7 hari (DB = 1 file SQLite). */
  backupMaxAgeDays: 7,

  /** Pindah budget: kampanye terbaik CPQL ≤ target DAN terburuk ≥ 2× targetnya.
   *  Alasan: selisih < 2× masih bisa noise; ≥ 2× adalah perbedaan nyata. */
  adsMoveBudgetWorstMultiple: 2,

  /** Minimal post per format sebelum format boleh disebut "terbaik".
   *  Alasan: 1 post bagus bukan bukti format bagus. */
  bestFormatMinPosts: 3,
} as const;

export type EngineConfig = typeof CONFIG;
