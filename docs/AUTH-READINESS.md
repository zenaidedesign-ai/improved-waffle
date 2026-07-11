# Auth Readiness Plan — Zenaide Revenue Engine

**Status hari ini (jujur): Tahap 1 TERPASANG, aktif hanya jika dikonfigurasi.**
Gerbang password owner sudah dibangun dan diuji (unit + E2E). PENTING: kalau env var
`ZENAIDE_AUTH_HASH` TIDAK di-set, aplikasi berjalan MODE TANPA LOGIN — terbuka penuh,
dengan banner peringatan. Aplikasi baru boleh disebut "terkunci" setelah password di-set
dan login terbukti jalan di perangkat itu. Ini gerbang satu-owner, BUKAN keamanan kelas
produksi multi-user.

## 0. Cara pakai Tahap 1 (setup, login, logout)

**Set password (sekali):**
1. `node scripts/set-owner-password.mjs "PasswordKuatAnda"` (minimal 8 karakter).
2. Salin DUA baris hasilnya (`ZENAIDE_AUTH_HASH` + `ZENAIDE_SESSION_SECRET`) ke file
   `.env.local` di folder proyek. File ini di-gitignore — JANGAN di-commit, jangan
   dikirim lewat chat/email. Contoh kerangka: `.env.example`.
3. Restart aplikasi. Semua halaman & API kini menuntut login.

**Login:** buka aplikasi → diarahkan ke `/login` → masukkan password → masuk.
Salah 5× berturut = jeda 15 menit.

**Logout:** tombol "🚪 Keluar" di bawah menu samping.

**Perilaku sesi:** cookie HttpOnly bertanda tangan HMAC, umur 7 hari, lalu harus login
ulang. Logout menghapus cookie DI BROWSER ITU SAJA — token yang sudah dicuri tetap sah
sampai kedaluwarsa. Mencabut SEMUA sesi sekaligus: ganti nilai `ZENAIDE_SESSION_SECRET`
(atau ganti password) lalu restart.

**Ganti password:** ulangi langkah set password dengan password baru — semua sesi lama
otomatis gugur.

**Lupa password:** tidak ada reset mandiri (by design). Jalankan ulang skrip set password
dari terminal laptop yang memegang proyek.

## 1. Pendekatan auth yang direkomendasikan (saat waktunya tiba)

**Tahap 1 — kunci satu pintu — ✅ TERPASANG (Juli 2026):**
- Satu password owner, disimpan sebagai hash **scrypt** bersalt di env var
  `ZENAIDE_AUTH_HASH` — BUKAN plaintext, BUKAN di database, BUKAN di repo
  (`src/lib/auth.ts`; node:crypto, tanpa dependensi baru).
- Cookie sesi bertanda tangan HMAC-SHA256 (HttpOnly, SameSite=Lax, Secure di produksi),
  divalidasi `src/middleware.ts` yang memagari SEMUA route kecuali `/login` dan aset statis.
  API tanpa sesi mendapat 401; halaman diarahkan ke `/login`.
- Lapis kedua: route pengeluaran data (unduh DB `/api/backup/db`, ekspor `/api/export/*`)
  memeriksa sesinya sendiri (`src/lib/apiAuth.ts`) — tidak menggantungkan diri pada matcher.
- Tanpa registrasi, tanpa reset mandiri; rate-limit login 5×/15 menit (in-memory).

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

## 4. Alur login (Tahap 1 — terpasang)

1. Buka aplikasi → `middleware.ts` cek cookie sesi → tidak valid → redirect `/login`
   (API → 401).
2. `/login`: satu kolom password → verifikasi hash scrypt → set cookie sesi umur 7 hari
   (TIDAK diperpanjang otomatis — habis ya login ulang).
3. Logout = hapus cookie. Salah password 5× berturut → jeda 15 menit (in-memory).
4. Tidak ada "ingat saya" — cookie berakhir, titik.

## 5. Yang MASIH tidak aman setelah Tahap 1 (jujur)

- **Env belum di-set = terbuka penuh.** Gerbang hanya hidup kalau `ZENAIDE_AUTH_HASH` ada.
  Layar login dan banner menyatakannya terang-terangan; checklist produksi menahannya.
- **Satu password bersama = satu identitas.** Tidak ada audit "siapa melakukan apa";
  siapa pun yang tahu password adalah "owner".
- **Logout tidak mencabut token di perangkat lain** (sesi stateless) — pencabutan total
  hanya lewat ganti secret/password.
- **Rate-limit in-memory** hilang saat restart; bukan perlindungan brute-force kelas produksi.
- **Transportasi:** di luar localhost, keamanan cookie bergantung HTTPS — alasan tambahan
  deployment tetap HOLD sampai ada TLS.
- Fisik tetap fisik: laptop tak terkunci = semua terbuka; file `dev.db` dan `.env.local`
  yang dicuri = semua data + gerbangnya.

## 6. Pemicu Tahap 2 (multi-user)

Tahap 2 dibangun HANYA ketika staf pertama benar-benar akan memegang aplikasi sendiri:
tabel User + peran STAF/BACA-SAJA sesuai matriks §2, audit trail actor per aksi, dan
review keamanan ulang. Sampai saat itu, staf-use = HOLD (lihat docs/OPERATIONS-SAFETY.md §4).
