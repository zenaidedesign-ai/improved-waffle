# Zenaide Revenue Engine

Sistem operasi revenue internal untuk **Zenaide Design** (interior design & build, Surabaya).

Tujuan bisnis: menghasilkan lead interior berkualitas → percakapan WhatsApp → survei → proposal → proyek closing. Metrik utama adalah pipeline dan nilai closing — bukan likes, reach, atau followers.

## Status

**Fase desain.** Belum ada kode aplikasi. Goal 1 (wajib pertama) adalah **Instagram & Meta Recovery Engine** — lihat blueprint lengkap:

📄 [`docs/BLUEPRINT-GOAL-1-INSTAGRAM-META-RECOVERY.md`](docs/BLUEPRINT-GOAL-1-INSTAGRAM-META-RECOVERY.md)

## Fondasi yang sudah diputuskan

- Bahasa antarmuka: **Bahasa Indonesia**
- Stack: **Next.js full-stack + SQLite (Prisma)** — tanpa layanan eksternal, lokal dulu
- Fase 1: **input manual + impor CSV** (format ekspor standar Meta Ads Manager & IG Insights); API dan otomasi menyusul setelah logika bisnis terbukti benar
