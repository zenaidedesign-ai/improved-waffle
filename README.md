# Zenaide Revenue Engine

Sistem operasi revenue internal untuk **Zenaide Design** (interior design & build, Surabaya).

Tujuan bisnis: menghasilkan lead interior berkualitas → percakapan WhatsApp → survei → proposal → proyek closing. Metrik utama adalah pipeline dan nilai closing — bukan likes, reach, atau followers.

## Status

**Terbangun & teruji (semua input manual/CSV/screenshot — TANPA API live):** tiga audit gerbang,
Diagnosa Distribusi Instagram + Pelatih Instagram, Algorithm Fit Score, Eksperimen 30 Hari +
perpustakaan pain/keberatan, Lead Intelligence (triase deterministik), Ads Intelligence
multi-kanal dengan mesin vonis, Competitor Lab (observasi publik manual), Knowledge Engine,
Dashboard Intelijen, Revenue War Room mingguan, dan lapisan Kebenaran Data (sumber, keandalan,
kebasian, konflik). **Belum dibangun:** Threads Intelligence, Local Search, fitur generator/asisten
(menunggu keputusan LLM), integrasi API resmi apa pun.

Dokumen:

- 📄 [`docs/BLUEPRINT-GOAL-1-INSTAGRAM-META-RECOVERY.md`](docs/BLUEPRINT-GOAL-1-INSTAGRAM-META-RECOVERY.md)
- 📄 [`docs/PLAN-GOAL-1-IMPLEMENTATION.md`](docs/PLAN-GOAL-1-IMPLEMENTATION.md)
- 📄 [`docs/DATA-ARCHITECTURE.md`](docs/DATA-ARCHITECTURE.md) · [`docs/API-READINESS.md`](docs/API-READINESS.md)

**Catatan keamanan:** aplikasi ini punya **gerbang login owner (Auth Tahap 1)** — satu password,
hash scrypt di env var. PENTING: kalau password BELUM di-set, aplikasi berjalan TERBUKA penuh
(banner peringatan tampil). Jalankan hanya di perangkat yang dipercaya; basis data = satu file
SQLite (`prisma/dev.db`); cadangkan lewat **Pusat Cadangan** (menu Impor & Ekspor). Detail:
`docs/AUTH-READINESS.md` · `docs/OPERATIONS-SAFETY.md`.

## Menjalankan

```bash
npm install
cp .env.example .env.local  # auth membaca .env.local — JANGAN di-commit
npx prisma migrate deploy   # membuat prisma/dev.db
npm run dev                 # buka http://localhost:3000
```

## Urutan langkah pertama (WAJIB, sebelum data nyata)

1. **Set password owner:** `node scripts/set-owner-password.mjs "PasswordKuatAnda"` →
   salin 2 baris hasilnya ke `.env.local` → restart aplikasi.
2. **Login** di layar yang muncul.
3. (Opsional untuk belajar) klik **"Muat data contoh"** di Dashboard — semua berlabel `[CONTOH]`.
4. **Hapus data contoh** (Dashboard, dengan centang konfirmasi) sebelum mulai serius.
5. **Jalankan 3 audit** dengan jawaban nyata: Akun Meta → Rekomendasi → Tracking.
6. **Mulai pilot** di layar Pilot 14 Hari.
7. **Input data nyata**: lead WA 7 hari terakhir, 5 post IG terakhir, CSV Ads Manager (kalau ada).
8. **Baca Laporan Mingguan pertama** dan komit keputusan di layar Keputusan Mingguan.

Uji: `npm run test` (unit test mesin aturan) · smoke E2E: `scripts/e2e-smoke.mjs`
(lihat header file untuk ritual reset DB + env auth).

## Fondasi yang sudah diputuskan

- Bahasa antarmuka: **Bahasa Indonesia**
- Stack: **Next.js full-stack + SQLite (Prisma)** — tanpa layanan eksternal, lokal dulu
- Fase 1: **input manual + impor CSV** (format ekspor standar Meta Ads Manager & IG Insights); API dan otomasi menyusul setelah logika bisnis terbukti benar
