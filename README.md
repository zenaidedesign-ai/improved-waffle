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

**Catatan keamanan:** aplikasi ini single-user TANPA login — jalankan hanya di perangkat/jaringan
yang dipercaya. Basis data = satu file SQLite (`prisma/dev.db`); cadangkan lewat Ekspor CSV.

## Menjalankan

```bash
npm install
cp .env.example .env        # DATABASE_URL SQLite lokal
npx prisma migrate deploy   # membuat prisma/dev.db
npm run dev                 # buka http://localhost:3000
```

Di Ruang Kendali, klik **“Muat data contoh”** untuk melihat seluruh diagnosa bekerja dengan data
berlabel `[CONTOH]` (bisa dihapus satu klik, tidak menyentuh data asli).

Uji: `npm run test` (51 unit test mesin aturan) · smoke E2E: `scripts/e2e-smoke.mjs`.

## Fondasi yang sudah diputuskan

- Bahasa antarmuka: **Bahasa Indonesia**
- Stack: **Next.js full-stack + SQLite (Prisma)** — tanpa layanan eksternal, lokal dulu
- Fase 1: **input manual + impor CSV** (format ekspor standar Meta Ads Manager & IG Insights); API dan otomasi menyusul setelah logika bisnis terbukti benar
