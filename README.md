# Zenaide Revenue Engine

Sistem operasi revenue internal untuk **Zenaide Design** (interior design & build, Surabaya).

Tujuan bisnis: menghasilkan lead interior berkualitas → percakapan WhatsApp → survei → proposal → proyek closing. Metrik utama adalah pipeline dan nilai closing — bukan likes, reach, atau followers.

## Status

**Fase 1 terbangun** — Instagram & Meta Recovery Engine versi input manual (tanpa API eksternal):
tiga audit gerbang (Akun Meta, Kelayakan Rekomendasi, Tracking), Diagnosa Distribusi Instagram,
Algorithm Fit Score, Meta Ads Rescue dengan mesin vonis, dan War Room Mingguan.

Dokumen desain:

- 📄 [`docs/BLUEPRINT-GOAL-1-INSTAGRAM-META-RECOVERY.md`](docs/BLUEPRINT-GOAL-1-INSTAGRAM-META-RECOVERY.md)
- 📄 [`docs/PLAN-GOAL-1-IMPLEMENTATION.md`](docs/PLAN-GOAL-1-IMPLEMENTATION.md)

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
