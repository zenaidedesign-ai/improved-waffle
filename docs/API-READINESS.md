# API Readiness — Zenaide Revenue Engine

**Status: TIDAK ADA API live yang terpasang.** Semua data masuk lewat input manual dan impor CSV
(`/impor`), keluar lewat ekspor CSV. Dokumen ini adalah syarat yang HARUS dipenuhi (dan disetujui
owner) sebelum satu pun API dinyalakan. Jangan pernah mengklaim otomasi live sebelum benar-benar
terpasang dan teruji.

Struktur impor CSV saat ini sudah kompatibel dengan ekspor standar platform:

| Sumber | Jalur hari ini | Kolom yang dipetakan otomatis |
|---|---|---|
| Meta Ads Manager | Ekspor CSV → `/impor` (Metrik Iklan) | Campaign name, Day, Amount spent, Impressions, Link clicks, Results |
| Instagram Insights | Input manual / template CSV | Reach, saves, shares, dst. |
| Google Ads / TikTok Ads | Template Metrik Iklan (kolom sama) | kampanye, tanggal, spend, impresi, klik |
| Threads | Input manual (belum ada ekspor resmi) | — |
| WhatsApp lead | Template Lead CSV / form manual | nama, sumber, sinyal, status |
| Tautan kompetitor / Google Business | Input manual di Competitor Lab | — |

## Penilaian per API (sebelum dinyalakan)

### 1. Meta Marketing API (baca performa iklan)
- **Kebutuhan:** Meta App + Business Manager terverifikasi; token sistem user.
- **Izin:** `ads_read` (App Review Meta diperlukan untuk akses jangka panjang).
- **Risiko biaya:** API gratis, tapi kesalahan tulis (jika pakai izin tulis) bisa mengubah budget nyata → hanya minta READ.
- **Risiko privasi:** data performa & audiens tersimpan lokal; SQLite tidak terenkripsi — putuskan kebijakan cadangan dulu.
- **Mode gagal:** token kedaluwarsa (60 hari), rate limit, akun dibatasi → data berhenti mengalir DIAM-DIAM.
- **Rencana rollback:** matikan sinkronisasi → sistem otomatis kembali ke impor CSV (jalur ini tetap dipertahankan selamanya sebagai fallback).
- **Prasyarat tambahan:** Gerbang 0 harus HIJAU dulu — menyambungkan API ke fondasi akun yang bermasalah mempercepat kekacauan, bukan memperbaikinya.

### 2. Instagram Graph API (insight organik)
- **Kebutuhan:** akun IG profesional + Page tertaut + App Review (`instagram_manage_insights`).
- **Risiko biaya:** gratis; biaya nyata = waktu App Review (minggu-an).
- **Mode gagal:** metrik tertentu (mis. reach non-follower per post) TIDAK tersedia via API — jangan janjikan paritas penuh dengan tampilan aplikasi.
- **Rollback:** form 60 detik tetap ada.

### 3. Google Ads API
- **Kebutuhan:** developer token Google (proses persetujuan), OAuth, MCC disarankan.
- **Risiko biaya:** gratis, tapi effort integrasi tinggi; baru masuk akal setelah Google Ads berjalan rutin.
- **Rollback:** template CSV Metrik Iklan sudah menampung datanya hari ini.

### 4. WhatsApp Business API
- **Kebutuhan:** WABA + BSP (penyedia pihak ketiga) — **BERBAYAR per percakapan**.
- **Risiko privasi:** isi chat klien = data pribadi; wajib putuskan retensi & akses sebelum menyimpan.
- **Mode gagal:** salah kirim pesan massal = nomor diblokir → kanal revenue utama mati. Risiko terbesar di seluruh daftar ini.
- **Rekomendasi:** JANGAN otomasi kirim. Kalau pun dipakai, mulai dari baca/label saja.

### 5. TikTok Ads API / Threads API
- Threads: API resmi masih terbatas (publikasi, bukan analitik penuh). TikTok: baru relevan jika kanalnya terbukti. Keduanya: tunda.

### 6. LLM (fitur generator/asisten: saran balasan WA, generator POV, dsb.)
- **Kebutuhan:** API key Anthropic; **BERBAYAR per token** — butuh persetujuan owner eksplisit.
- **Risiko privasi:** jangan kirim isi chat klien tanpa keputusan sadar owner.
- **Mode gagal:** output meyakinkan tapi salah → semua output LLM harus lewat pagar anti-halusinasi yang sama (label keyakinan, tidak mengarang angka).
- **Rollback:** perpustakaan template (pain point + keberatan + skrip) bekerja tanpa LLM.

## Urutan yang disarankan kalau mau mulai
1. Meta Marketing API read-only (setelah Gerbang 0 hijau stabil ≥ 1 bulan)
2. Instagram Graph API insight
3. Sisanya menunggu bukti kebutuhan.
