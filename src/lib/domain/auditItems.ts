// Definisi item audit — copy produk, diversi di git, BUKAN baris database.
// Setiap item: pertanyaan, kenapa penting, langkah cek manual (tanpa API),
// dan flag memblokir (merah pada item blocking = gerbang terkunci).

import type { AuditType } from "./enums";

export interface AuditItemDef {
  key: string;
  question: string;
  whyItMatters: string;
  howToCheck: string; // langkah klik di Meta Business Suite / IG
  isBlocking: boolean;
}

export const META_ACCOUNT_ITEMS: AuditItemDef[] = [
  {
    key: "A1",
    question: "Apakah status ad account AKTIF (bukan dibatasi atau dinonaktifkan)?",
    whyItMatters:
      "Akun yang dibatasi membuat iklan tayang terbatas atau tidak tayang sama sekali — uang keluar, hasil dicekik diam-diam.",
    howToCheck:
      "Buka business.facebook.com → Pengaturan Bisnis → Akun → Akun Iklan. Lihat label status di samping nama akun.",
    isBlocking: true,
  },
  {
    key: "A2",
    question:
      "Apakah ad account berada di Business Manager milik Zenaide (bukan akun pribadi atau BM orang lain)?",
    whyItMatters:
      "Salah kepemilikan berarti Zenaide bisa kehilangan akses aset iklan kapan saja, dan riwayat masalah pemilik lama ikut menular.",
    howToCheck:
      "Pengaturan Bisnis → Akun Iklan → lihat kolom 'Dimiliki oleh'. Harus nama bisnis Zenaide, bukan nama orang.",
    isBlocking: true,
  },
  {
    key: "A3",
    question:
      "Apakah ada silsilah koneksi ke akun Facebook lama yang pernah dinonaktifkan (admin lama, BM lama, Page lama)?",
    whyItMatters:
      "Riwayat pelanggaran menular lewat koneksi aset. Satu admin bermasalah bisa menyeret seluruh BM.",
    howToCheck:
      "Pengaturan Bisnis → Orang: cek semua admin. → Halaman & Akun Iklan: cek apakah ada aset yang dulu dibuat dari akun lama yang bermasalah.",
    isBlocking: true,
  },
  {
    key: "A4",
    question: "Apakah Account Quality bersih (tanpa pembatasan atau peringatan)?",
    whyItMatters:
      "Halaman Account Quality adalah sumber kebenaran resmi Meta soal status akun — bukan tebakan.",
    howToCheck:
      "Buka business.facebook.com/accountquality. Lihat semua tab: akun iklan, Halaman, katalog. Catat setiap peringatan.",
    isBlocking: true,
  },
  {
    key: "A5",
    question:
      "Apakah Halaman Facebook dan akun Instagram profesional terhubung ke BM yang sama dan benar?",
    whyItMatters:
      "Iklan Instagram butuh koneksi Page–IG–BM yang bersih. Koneksi silang membuat iklan gagal atau tampil dari identitas yang salah.",
    howToCheck:
      "Pengaturan Bisnis → Akun → Halaman & Akun Instagram: keduanya harus muncul di BM Zenaide. Di IG: Pengaturan → Pusat Akun → cek Page yang terhubung.",
    isBlocking: true,
  },
  {
    key: "A6",
    question: "Apakah metode pembayaran sehat dan tidak pernah gagal bayar?",
    whyItMatters:
      "Gagal bayar memicu pembatasan otomatis dan menghentikan semua kampanye tanpa peringatan jelas.",
    howToCheck:
      "Ads Manager → Penagihan & Pembayaran → cek metode pembayaran aktif dan riwayat transaksi 3 bulan terakhir.",
    isBlocking: true,
  },
  {
    key: "A7",
    question: "Apakah Pixel / dataset dimiliki BM Zenaide (bukan pihak ketiga)?",
    whyItMatters:
      "Pemilik pixel mengontrol data konversi. Kalau dimiliki agency lama, Zenaide kehilangan data saat hubungan putus.",
    howToCheck: "Events Manager → pilih pixel/dataset → Pengaturan → lihat 'Dimiliki oleh'.",
    isBlocking: false,
  },
  {
    key: "A8",
    question: "Apakah domain terverifikasi di BM (kalau memakai landing page)?",
    whyItMatters:
      "Verifikasi domain mempengaruhi atribusi dan kepercayaan akun. Tanpa landing page, item ini boleh Kuning.",
    howToCheck: "Pengaturan Bisnis → Keamanan Merek → Domain.",
    isBlocking: false,
  },
  {
    key: "A9",
    question:
      "Apakah nomor WhatsApp bisnis terhubung resmi ke ad account untuk iklan click-to-WA?",
    whyItMatters:
      "Iklan WA tanpa koneksi resmi membuat data tujuan kacau dan hasil tidak terlacak.",
    howToCheck:
      "Pengaturan Bisnis → Akun → Akun WhatsApp. Atau saat membuat iklan: apakah nomor WA muncul sebagai tujuan resmi?",
    isBlocking: false,
  },
  {
    key: "A10",
    question: "Apakah ada minimal dua admin BM aktif (bukan satu akun pribadi saja)?",
    whyItMatters:
      "Kalau satu-satunya admin kena masalah (akun dikunci/di-hack), seluruh aset iklan ikut terkunci.",
    howToCheck: "Pengaturan Bisnis → Orang → hitung yang berperan Admin.",
    isBlocking: false,
  },
  {
    key: "A11",
    question:
      "Apakah TIDAK ada tanda pembatasan berjalan saat ini (iklan sering ditolak, jangkauan anjlok mendadak, fitur hilang)?",
    whyItMatters:
      "Pembatasan kadang tidak muncul sebagai label jelas — polanya terlihat dari gejala. Ini cek gejala, bukan cek label.",
    howToCheck:
      "Ingat 30 hari terakhir: ada iklan ditolak beruntun? Jangkauan tiba-tiba turun >50%? Fitur (musik, tautan) hilang?",
    isBlocking: true,
  },
  {
    key: "A12",
    question:
      "Apakah akun Facebook lama yang pernah dinonaktifkan SUDAH benar-benar diputus dari semua aset aktif?",
    whyItMatters:
      "Akun lama yang masih jadi admin/pemilik aset adalah bom waktu — Meta bisa mengunci aset yang terhubung kapan saja.",
    howToCheck:
      "Telusuri: Page lama dibuat siapa? BM dibuat siapa? Pixel dibuat siapa? Pastikan akun lama tidak punya peran apa pun lagi.",
    isBlocking: true,
  },
  {
    key: "A13",
    question:
      "Apakah kesiapan dasar tracking sudah ada? (Detail dinilai di Audit Tracking — ini penanda awal saja)",
    whyItMatters:
      "Tanpa dasar tracking, semua angka biaya per hasil adalah tebakan. Audit Tracking (Gerbang 1) menilai ini lebih dalam.",
    howToCheck:
      "Cek cepat: apakah ada cara membedakan chat dari iklan vs organik? Kalau ragu, jawab Kuning dan lanjutkan ke Audit Tracking.",
    isBlocking: false,
  },
];

export const REKOMENDASI_ITEMS: AuditItemDef[] = [
  {
    key: "R1",
    question:
      "Apakah TIDAK ada konten yang ditandai 'tidak dapat direkomendasikan' di Status Akun Instagram?",
    whyItMatters:
      "Konten yang ditandai membuat akun dikeluarkan dari Explore, Reels feed, dan rekomendasi — reach non-follower mati.",
    howToCheck:
      "IG → Pengaturan → Status Akun (Account Status) → 'Apa yang tidak dapat direkomendasikan'. Harus kosong.",
    isBlocking: true,
  },
  {
    key: "R2",
    question: "Apakah TIDAK ada pelanggaran pedoman komunitas atau peringatan aktif?",
    whyItMatters:
      "Pelanggaran aktif menekan distribusi seluruh akun, bukan hanya konten yang melanggar.",
    howToCheck: "IG → Pengaturan → Status Akun → 'Penghapusan konten' dan peringatan.",
    isBlocking: true,
  },
  {
    key: "R3",
    question: "Apakah TIDAK ada pembatasan fitur (musik, tautan, monetisasi, live)?",
    whyItMatters:
      "Pembatasan fitur biasanya menandakan akun sedang dalam pengawasan — sinyal kesehatan menurun.",
    howToCheck: "IG → Pengaturan → Status Akun → cek bagian fitur. Coba tambah musik di Reels draf.",
    isBlocking: false,
  },
  {
    key: "R4",
    question:
      "Apakah konten bebas dari watermark platform lain dan bukan daur ulang mentah (repost TikTok dsb.)?",
    whyItMatters:
      "Meta menyatakan konten ber-watermark dan daur ulang tidak diprioritaskan untuk rekomendasi. Ini kebijakan publik, bukan tebakan algoritma.",
    howToCheck: "Scroll 20 post terakhir: ada watermark TikTok/aplikasi lain? Ada repost mentah?",
    isBlocking: false,
  },
  {
    key: "R5",
    question:
      "Apakah caption bebas dari pola engagement-bait kasar dan hashtag berisiko?",
    whyItMatters:
      "Pola 'follow-like-comment berhadiah' dan hashtag yang pernah dibatasi menekan distribusi.",
    howToCheck:
      "Baca 20 caption terakhir. Cek hashtag yang dipakai berulang: cari hashtag itu di IG — kalau hasilnya disembunyikan, hashtag bermasalah.",
    isBlocking: false,
  },
  {
    key: "R6",
    question: "Apakah mayoritas konten adalah karya asli Zenaide (bukan repost karya orang)?",
    whyItMatters:
      "Meta menyatakan konten asli diprioritaskan. Akun yang didominasi repost kalah distribusi.",
    howToCheck: "Hitung dari 20 post terakhir: berapa yang benar-benar produksi sendiri?",
    isBlocking: false,
  },
];

export const TRACKING_ITEMS: AuditItemDef[] = [
  {
    key: "T1",
    question:
      "Apakah setiap kampanye punya cara membedakan sumber chat (kode pesan pembuka, nomor berbeda, atau pertanyaan 'tahu Zenaide dari mana?')?",
    whyItMatters:
      "Tanpa pembeda sumber, mustahil tahu kampanye mana yang menghasilkan dan mana yang membakar uang.",
    howToCheck:
      "Lihat pengaturan iklan click-to-WA: apakah pesan pembuka tiap kampanye berbeda? Kalau tidak, apakah tim selalu bertanya sumber?",
    isBlocking: true,
  },
  {
    key: "T2",
    question:
      "Apakah ada log lead — setiap chat masuk dicatat (tanggal, sumber, isi singkat)? Manual pun sah.",
    whyItMatters:
      "Log lead adalah fondasi kebenaran seluruh sistem ini. Tanpa log, vonis kampanye adalah tebakan.",
    howToCheck: "Tanya diri sendiri: kalau saya tanya 'ada berapa chat masuk minggu lalu, dari mana saja?' — bisa dijawab dengan bukti?",
    isBlocking: true,
  },
  {
    key: "T3",
    question: "Apakah definisi 'lead berkualitas' sudah disepakati tertulis?",
    whyItMatters:
      "Tanpa definisi tertulis, 'berkualitas' berubah-ubah sesuai mood — vonis jadi tidak konsisten.",
    howToCheck:
      "Default sistem: skor ≥ 60 dari 5 sinyal (budget, jenis proyek, lokasi, urgensi, keseriusan) DAN bersedia menjawab ≥ 3 pertanyaan kualifikasi.",
    isBlocking: true,
  },
  {
    key: "T4",
    question:
      "Apakah angka Ads Manager pernah dicocokkan dengan chat nyata minimal satu kali?",
    whyItMatters:
      "Ads Manager sering melaporkan 'hasil' lebih banyak dari chat nyata. Sekali mencocokkan langsung kelihatan seberapa bisa dipercaya.",
    howToCheck:
      "Ambil satu hari: Ads Manager bilang berapa chat? WhatsApp nyata berapa chat baru hari itu?",
    isBlocking: false,
  },
  {
    key: "T5",
    question: "Kalau memakai landing page: apakah UTM konsisten?",
    whyItMatters: "UTM acak membuat data sumber di analytics tidak bisa dibaca.",
    howToCheck: "Cek tautan di 3 iklan terakhir: ada utm_source/utm_campaign yang konsisten? Tanpa landing page, jawab Hijau.",
    isBlocking: false,
  },
];

export const AUDIT_ITEMS: Record<AuditType, AuditItemDef[]> = {
  META_ACCOUNT: META_ACCOUNT_ITEMS,
  REKOMENDASI: REKOMENDASI_ITEMS,
  TRACKING: TRACKING_ITEMS,
};
