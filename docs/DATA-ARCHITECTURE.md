# Arsitektur Sumber Data & Konektor — Zenaide Revenue Engine

**Aturan utama:** sistem bekerja HARI INI dengan manual, CSV, screenshot, dan Google Sheet — dan
siap untuk API resmi nanti. Tanpa bypass, tanpa scraping login, tanpa metode yang membahayakan
akun Instagram/Meta/Google/TikTok/WhatsApp Zenaide. Jembatan aman, bukan jalan pintas.

## Layer A — Sumber Data
Setiap baris data pembawa metrik menyimpan asal-usulnya:

| Kolom | Model |
|---|---|
| `sourceType` | `IgPost`, `IgAccountSnapshot`, `CampaignMetricDaily` |
| `sourceDataType` | `Lead` (dibedakan dari `sourceType` = asal LEAD-nya: iklan/organik) |
| `origin` | `ImportBatch` (CSV / GOOGLE_SHEET / EMAIL_REPORT) |
| `updatedAt` | semua model di atas — dasar peringatan kebasian |

Nilai: `MANUAL · CSV · SCREENSHOT · GOOGLE_SHEET · EMAIL_REPORT · PUBLIC_LINK · API_RESMI`
(kanonik di `src/lib/engine/dataTruth.ts`). Data kompetitor secara inheren `PUBLIC_LINK`.

## Layer B — Konektor
Semua jalur masuk menghasilkan objek internal yang SAMA:

| Objek internal | Ditulis oleh konektor | Dibaca oleh |
|---|---|---|
| `IgPostInput` (performa konten) | form manual, CSV, screenshot | igDiagnosis, igCoach, verdicts |
| `CampaignFunnelInput` → `CostChain` | form manual, CSV Ads, screenshot | adsRescue |
| `LeadTriageInput` | form lead, CSV lead | leadTriage, dashboard |
| Battle card kompetitor | form Competitor Lab (tautan publik) | halaman kompetitor |
| `WeekMetrics` (laporan mingguan) | diturunkan dari objek di atas | warRoom, weeklyReport |

Status konektor: **aktif** — manual, CSV, Google Sheet (via unduh CSV), screenshot (transkrip
berbantuan, tanpa OCR), tautan publik. **Disiapkan, belum aktif** — laporan email, semua API resmi.

## Layer C — Normalisasi
Satu kamus header di `src/lib/csv.ts`: Meta "Amount spent" = Google "Cost" = TikTok "Total cost"
→ `spend_ribu`. "Results/Conversions/Result" → `hasil_platform` (tidak pernah dipakai untuk vonis
— definisinya beda per platform). IG "Profile visits" ≈ TikTok "Profile views" → `kunjungan_profil`
dengan catatan: permukaan berbeda, bandingkan hanya di dalam platform yang sama.
Kamus tampil di layar `/impor`.

## Layer D — Mesin Keandalan
`RELIABILITY` di `dataTruth.ts` (kebijakan tetap): API resmi 95–100% · CSV 90–95% ·
Google Sheet 80–95% · laporan email 85–95% · manual 60–90% · screenshot 60–85% (wajib verifikasi
sebelum budget) · observasi publik 40–70% (wajib verifikasi). Keyakinan per titik data DITURUNKAN
dari sumbernya — deterministik, tidak disimpan ganda.

## Layer E — Peringatan Kebasian
`checkFreshness()`: Instagram > 7 hari · iklan > 3 hari · follow-up lead > 2 hari ·
kompetitor > 30 hari ⇒ *"Data basi. Jangan ambil keputusan budget tanpa refresh."*
Tidak ada data sama sekali juga peringatan — bukan diam.

## Layer F — Konflik Antar Sumber
`detectCampaignConflicts()`: (1) chat manual ≠ log lead, (2) lead berkualitas manual ≠ log,
(3) klaim "hasil" platform > 1.3× catatan sendiri. Konflik SELALU ditampilkan dengan kedua angka
dan rekomendasi *"Verifikasi sumber sebelum keputusan budget."* — tidak pernah diselesaikan
diam-diam. Panel Kebenaran Data tampil di dashboard, laporan mingguan, dan Ads Intelligence.

## Layer G — Jalur Naik ke API
Kontrak: **modul diagnosa tidak peduli asal data.** Engine (`src/lib/engine/*`) hanya membaca
objek ternormalisasi; metadata sumber menempel di baris DB. Menambahkan API resmi nanti =
menulis konektor baru yang mengisi baris yang sama dengan `sourceType: "API_RESMI"` —
nol perubahan pada logika bisnis. Syarat per API (izin, biaya, privasi, mode gagal, rollback):
`docs/API-READINESS.md`. Jalur CSV dipertahankan selamanya sebagai fallback.

## Kebijakan Kebenaran Data (ketat)
Kalimat baku di `TRUTH_PHRASES`, dipakai seragam:
- Data kurang → **"Data andal belum cukup."**
- Data basi → **"Data basi. Jangan ambil keputusan budget tanpa refresh."**
- Screenshot → **"Data hasil transkrip screenshot. Verifikasi sebelum keputusan budget atau kampanye."**
- Kompetitor → **"Observasi publik saja. Performa privat kompetitor tidak diketahui."**
- Selalu → **"Data ini TIDAK live"** + tanggal pembaruan terakhir per jenis data.

Sistem tidak memalsukan kepastian. Klaim "sinkron API selesai" hanya boleh muncul setelah
konektor benar-benar terpasang dan teruji.
