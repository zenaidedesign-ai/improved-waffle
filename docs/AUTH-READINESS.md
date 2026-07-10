# Auth Readiness Plan — Zenaide Revenue Engine

**Status hari ini (jujur): BELUM ADA AUTENTIKASI.** Siapa pun yang bisa membuka alamat aplikasi
bisa melihat dan mengubah SEMUA data. Ini keputusan sadar untuk fase lokal-single-user, bukan
kelalaian — tapi harus jelas batasnya, dan dokumen ini adalah rencananya. Aplikasi TIDAK BOLEH
disebut "aman" sebelum rencana ini diimplementasikan dan diuji.

## 1. Pendekatan auth yang direkomendasikan (saat waktunya tiba)

**Tahap 1 — kunci satu pintu (paling kecil yang bermakna):**
- Satu password owner, disimpan sebagai **hash** (argon2/bcrypt) di environment variable —
  BUKAN plaintext, BUKAN di database, BUKAN di repo.
- Session cookie ber-tanda-tangan (HttpOnly, Secure, SameSite=Lax) lewat `middleware.ts`
  Next.js yang memagari SEMUA route kecuali `/login`.
- Tanpa registrasi, tanpa reset password mandiri (reset = ganti env var oleh owner).
- Perkiraan kerja: kecil; tanpa dependensi layanan luar; cocok dengan SQLite lokal.

**Tahap 2 — multi-user (hanya jika staf benar-benar butuh akses):**
- Tabel `User` (id, nama, passwordHash, role) + session di database.
- Library yang disarankan: Auth.js (NextAuth) credentials provider ATAU Lucia — dua-duanya
  jalan tanpa layanan berbayar. JANGAN pakai OAuth publik (Google login dll.) untuk alat
  internal ini sebelum ada alasan kuat.
- Audit trail: kolom `actor` yang sudah ada di BeliefRevision menjadi userId.

## 2. Peran (role) yang direncanakan

| Peran | Siapa | Boleh | TIDAK boleh |
|---|---|---|---|
| **OWNER** | Noor | Semua: lihat/ubah data, hapus, ekspor/impor, ubah kekuatan learning (TERBUKTI), komit War Room, mulai pilot | — |
| **STAF** | Admin/marketing internal | Input lead & follow-up, input post IG + angka, input spend harian, catat bukti learning | Lihat nilai pipeline & closing total, ekspor/unduh cadangan, hapus apa pun, ubah kekuatan learning, komit War Room, layar Knowledge/Pilot/Laporan |
| **BACA-SAJA** | Mentor/konsultan sementara | Lihat dashboard & laporan TANPA identitas lead (nama disamarkan) | Semua aksi tulis, semua ekspor, detail lead |

Prinsip: staf menyentuh **jalur input**, owner memegang **jalur keputusan & uang**.

## 3. Layar sensitif (wajib di belakang OWNER saat auth ada)

Knowledge Engine · Pilot 14 Hari · Lead Intelligence (berisi identitas + nilai proyek) ·
Ads Intelligence/Kampanye (berisi spend) · War Room & Laporan Revenue (berisi nilai closing/pipeline) ·
Impor & Ekspor (bisa mengeluarkan seluruh database) · Dashboard (agregat uang).
Praktisnya: **hampir semua layar** — karena itu Tahap 1 memagari seluruh aplikasi, bukan per-halaman.

## 4. Alur login masa depan (Tahap 1)

1. Buka aplikasi → `middleware.ts` cek cookie sesi → tidak ada → redirect `/login`.
2. `/login`: satu kolom password → verifikasi hash → set cookie sesi (umur 7 hari, diperpanjang saat aktif).
3. Logout = hapus cookie. Salah password 5× berturut → jeda 15 menit (rate-limit sederhana di memori).
4. Tidak ada "ingat saya" di perangkat bersama — cookie berakhir, titik.

## 5. Risiko SELAMA auth belum ada (kondisi sekarang)

- **Siapa pun di perangkat/jaringan yang sama = akses penuh**, termasuk hapus data dan unduh
  seluruh database dari Pusat Cadangan.
- Karena itu aturan operasional pra-auth (docs/OPERATIONS-SAFETY.md): jalankan HANYA di laptop
  pribadi owner yang terkunci password OS, JANGAN di-deploy ke internet, JANGAN dibuka lewat
  Wi-Fi publik dengan port terbuka, JANGAN dibagikan alamatnya.
- Layar sensitif kini menampilkan peringatan permanen — itu PENGINGAT, bukan perlindungan.
- **Deployment tetap HOLD sampai minimal Tahap 1 terpasang + teruji.**

## 6. Pemicu implementasi

Auth Tahap 1 dibangun ketika salah satu terjadi: (a) aplikasi akan diakses dari luar laptop owner,
(b) staf pertama diberi akses, atau (c) owner memintanya. Implementasi = perubahan ber-review
sendiri, dengan tes login/logout/pagar middleware — bukan tempelan diam-diam.
