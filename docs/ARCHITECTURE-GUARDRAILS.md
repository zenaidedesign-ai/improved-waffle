# ARCHITECTURE GUARDRAILS — Zenaide Intelligence OS

Hasil System Maturity Review (Juli 2026, pra-pilot). Dokumen ini adalah **aturan baku** —
setiap pengembangan berikutnya tunduk padanya. Tujuannya satu: mencegah arsitektur
tambal-sulam seperti proyek ERP sebelumnya. Vonis review: **CONDITIONAL GO untuk pilot**
(lihat §6 — 10 perbaikan kecil pra-pilot).

---

## 1. Peta Lapisan (dibekukan)

Arah dependensi WAJIB satu arah, dari bawah ke atas. Lapisan hanya boleh memanggil
lapisan di bawahnya, tidak pernah sebaliknya.

```
11. Layar Staf (masa depan)     — BELUM ADA (auth Tahap 2 dulu)          [skor 2]
10. Dashboard Owner             — app/page.tsx + lib/dashboard.ts        [skor 6]
 9. Lapisan Keputusan           — VerdictProposal + KEPUTUSAN + gateLock [skor 8]
 8. Intelligence Layer          — belief.ts Fase A (ledger + proyeksi)   [skor 4 — by design]
 7. Knowledge / Belief Ledger   — knowledge.ts + EvidenceItem/Revision   [skor 8]
 6. Revenue Engine              — adsRescue/warRoom/weeklyReport/priorities [skor 8]
 5. Modul Operasional           — leads/kampanye/instagram/eksperimen    [skor 6]
 4. Lapisan Keandalan Data      — dataTruth.ts (terbaik di sistem)       [skor 9]
 3. Lapisan Normalisasi         — csv.ts alias + data.ts mapPostToInput  [skor 8]
 2. Lapisan Konektor            — importCsv (batch, bisa dibatalkan)     [skor 7]
 1. Lapisan Sumber Data         — form manual / CSV / screenshot / link  [skor 7]
```

Aturan per lapisan:
- **Engine (`src/lib/engine/*`)** = fungsi murni. DILARANG import `db`, `next/*`, actions,
  atau file assembly (`lib/*.ts`). Pelanggaran yang ada: `weeklyReport.ts:5` mengimpor
  `CampaignRow` dari `lib/dashboard` — tipe itu pindah ke `engine/types.ts` (perbaikan #6, §6).
- **Assembly (`src/lib/*.ts`)** = ambil dari DB → petakan → serahkan ke engine. TANPA
  matematika bisnis sendiri. Pelanggar terbesar saat ini: `dashboard.ts` (CPQL/cost-per-X
  dihitung tangan, 9 kueri mentah).
- **Pages (`src/app/*`)** = render + panggil assembly/engine. TANPA aturan keputusan.
  Pelanggaran yang ada: aturan kelayakan TERBUKTI di JSX `knowledge/page.tsx`.
- **Actions (`src/actions/*`)** = validasi zod → tulis DB → revalidate. Aturan penilaian
  (skor, vonis) dipanggil dari engine, tidak ditulis ulang.

## 2. Aturan Anti-Tambal-Sulam (WAJIB, berlaku sekarang)

1. **Tidak ada modul baru yang membaca data impor mentah langsung.** Semua konsumsi lewat
   Lapisan Normalisasi (`csv.ts` alias → objek ternormalisasi + metadata sumber).
2. **Semua vonis mengkonsumsi objek ternormalisasi ber-metadata keandalan.** Angka tanpa
   `sourceType`/reliability tidak boleh menggerakkan keputusan budget.
3. **Semua rekomendasi menampilkan keyakinan** (chip KEYAKINAN) + frasa TRUTH_PHRASES saat
   tipis/basi/screenshot/publik. Tanpa pengecualian.
4. **Tidak ada API live yang melewati Lapisan Konektor.** Prasyarat per-API ada di
   `docs/API-READINESS.md`; API masuk sebagai konektor yang menghasilkan objek
   ternormalisasi — logika bisnis tidak berubah (Layer G).
5. **Tidak ada tile dashboard baru tanpa keputusan/aksi.** Setiap angka baru harus
   menjawab "lalu Noor harus apa?" — kalau tidak bisa, itu vanity dan ditolak.
6. **Tidak ada promosi belief tanpa bukti ledger.** TERBUKTI = keputusan owner + sumber
   DATA_INTERNAL + bukan akar publik (Cap C) + pola berulang. Aturan ini pindah ke engine
   (satu fungsi `canPromote()`), bukan tersebar di JSX.
7. **Tidak ada modul baru tanpa deklarasi lapisan & batas.** Sebelum kode: tulis 5 baris —
   lapisan tempatnya, tanggung jawab intinya, apa yang BUKAN tanggung jawabnya,
   dependensinya, dan siapa konsumennya. Tanpa itu, tidak dibangun.
8. **Tidak ada logika penilaian ganda.** Satu konsep = satu fungsi engine:
   `computeQualityScore` (skor lead), `isQualified`, `gateLock`, `decideCampaign`,
   `sourceConfidence`, `weekStartOf`. Menyalin rumus = bug arsitektur, bukan gaya.
9. **Tidak ada data contoh tersembunyi di laporan nyata.** Setiap tabel seedable punya
   `isExample`; setiap agregat pilot/gerbang HANYA menghitung `isExample: false` lewat
   konstanta `REAL` bersama; tombol "Hapus data contoh" wajib menghapus SEMUA tabel contoh.
10. **Vokabuler keputusan dibekukan.** 15 label KEPUTUSAN + 3 KEYAKINAN + TRUTH_PHRASES.
    Label baru = review arsitektur, bukan tambahan diam-diam.
11. **Konstanta ambang hanya di `domain/config.ts`** dengan alasan tertulis; ambang di-tune
    lewat satu perubahan ber-review (proses hari-14 pilot), tidak diedit di tempat lain.
12. **Setiap vonis yang DILIHAT owner harus tercatat** (`recordVerdict`) — layar yang
    menghitung vonis tanpa mencatatnya harus melewati jalur log yang sama (utang saat ini:
    dashboard/kampanye/instagram menghitung tanpa mencatat).

## 3. Standar Penamaan

**Kode:** identifier bahasa Inggris (verbNoun: `computeGateVerdict`, `triageLead`).
Pengecualian tunggal yang disahkan: unit domain Indonesia pada nama (`formatJuta`,
`spendRibu`, `estimatedValueJuta`) — konsisten sufiks `*Ribu/*Juta/*Pct/*Sec`.
Token enum: yang sudah ada dibekukan apa adanya (campuran `KILL_KAMPANYE`/`PINDAH_BUDGET`
tidak diutak-atik — stabilitas > estetika); token BARU wajib pola `KATA_KERJA_OBJEK` Indonesia.
Satu nama = satu makna: `Lead.sourceType` (sumber lead) vs `IgPost.sourceType` (sumber data)
adalah tabrakan yang harus diselesaikan (perbaikan #7, §6).

**UI (glosarium final — dipakai seragam):**
| Konsep | Istilah UI baku |
|---|---|
| qualified lead | Lead berkualitas |
| verdict | Vonis |
| gate | Gerbang |
| learning | Pelajaran (istilah "learning" dihapus bertahap) |
| falsifier | Syarat gugur (sekali sebut "falsifier" dalam kurung) |
| backup | Cadangan / Pusat Cadangan |
| KILL_KAMPANYE | "Matikan kampanye" (bukan "Kill") |
| SCALE_KAMPANYE | "Perbesar kampanye" (bukan "Scale") |
| HOLD_KAMPANYE | "Tahan kampanye" |
| ITERATE_KAMPANYE | "Perbaiki & ulangi" |
| SPLIT_TEST | "Uji banding dulu" |
| Lead Intelligence | Pusat Lead |
| Ads Intelligence | Diagnosa Iklan |
| Knowledge Engine | Pustaka Pelajaran |
| Algorithm Fit Score | Skor Kelayakan Konten (JANGAN mengklaim tahu algoritma) |
| /laporan vs /war-room | "Laporan Mingguan" (baca) vs "Keputusan Mingguan" (komit) |
| Competitor Lab | Pantau Kompetitor |

Prinsip: isi layar sudah jujur & terkalibrasi — **judul/navigasi harus turun ke tingkat
kejujuran yang sama** ("Intelligence/Engine/Algorithm" mengklaim lebih dari kenyataan).

## 4. Pembekuan Backlog

| Item | Kelas | Alasan / dependensi | Risiko kalau dibangun sekarang |
|---|---|---|---|
| 10 perbaikan §6 | **STABILKAN PRA-PILOT** | menjaga integritas pengukuran pilot | — |
| Rename UI glosarium §3 | **STABILKAN PRA-PILOT** (batch satu perubahan) | Noor belajar istilah SEKALI, sebelum kebiasaan terbentuk | ganti label setelah pilot = membingungkan owner |
| Ekstraksi `primaryMetrics()` dari dashboard, CriteriaChecklist/WinnerCard JSX, TRIAGE_STYLE, isGateRed | **BOLEH TUNGGU pasca-pilot** | kualitas internal, bukan kebenaran | churn menjelang pilot |
| Persist vonis layar via recordVerdict | **BOLEH TUNGGU pasca-pilot** | butuh desain de-dup (vonis per render ≠ per keputusan) | log bengkak kalau naif |
| Fase B (scoreBelief, lifecycle) | **TUNGGU DATA NYATA** | Gerbang Fase B (8 syarat + 14 hari) | skoring terkalibrasi ke data contoh = sistem belajar fiksi |
| Fase C (Prediction, calibration, revenue loop) + tabel ProjectOutcome/ProposalResult/LossReason | **TUNGGU DATA NYATA** (setelah Fase B) | butuh siklus sales nyata | ledger prediksi kosong yang berpura-pura hidup |
| Model Conversation (impor chat WA) | **TUNGGU DATA NYATA + persetujuan owner** | capture gap terdaftar; format ekspor WA harus diuji dulu | tabel mati + ekspektasi palsu |
| Peran STAF/BACA-SAJA, tabel User, userId di semua baris | **TUNGGU AUTH TAHAP 2** | pemicu: staf pertama benar-benar pegang aplikasi | kompleksitas auth tanpa pengguna kedua |
| IgPost → SocialPost multi-kanal (TikTok/Threads organik) | **TUNGGU PERSETUJUAN** (setelah IG terbukti pulih) | Goal 1 = IG/Meta dulu; TikTok eksperimental | generalisasi prematur atas 1 kanal yang belum sembuh |
| API live (IG Graph/Meta/Google/TikTok), OCR screenshot, laporan email | **TUNGGU PERSETUJUAN API** | prasyarat per-API di API-READINESS.md | melanggar kebijakan "no paid API first" |
| Market Brain / Founder Brain / Opportunity Engine | **TUNGGU DATA NYATA + review arsitektur** | modul intelijen di atas belief yang belum berisi | menara di atas fondasi kosong |
| Fitur LLM/generator konten | **SEBAIKNYA TIDAK DIBANGUN** (kecuali owner minta ulang) | kebijakan no-paid-API; template library sudah dipilih | biaya berulang + risiko konten generik yang justru dilarang non-negotiable #3 |
| Dashboard tile vanity (follower growth chart dll.) | **TIDAK DIBANGUN** | melanggar aturan #5 & non-negotiable #2 | kembali jadi dashboard marketing biasa |

## 5. Kontrol Perubahan

- Perubahan yang WAJIB review arsitektur (bukan langsung koding): model Prisma baru,
  label KEPUTUSAN baru, lapisan baru, dependensi eksternal baru, semua yang menyentuh
  `gateLock`/`recordVerdict`/`dataTruth`, integrasi apa pun yang keluar jaringan.
- Perubahan bebas (dalam batas lapisan): copy UI, kolom form, tes, dokumen, threshold
  via config (dengan alasan).
- Setiap PR/commit fitur menyebut lapisan yang disentuh. Kalau menyentuh > 2 lapisan
  sekaligus, itu sinyal desain salah — berhenti dan tinjau.

## 6. Sepuluh Perbaikan Pra-Pilot (urutan eksekusi)

Kecil, terisolasi, menjaga kebenaran pengukuran pilot:
1. `computeQualityScore()` tunggal di engine — ganti 4 salinan penjumlahan sinyal
   (LeadForm, actions/lead, actions/seed, actions/importCsv).
2. `isQualified()` tunggal — ganti 3 salinan predikat (data.ts, leadTriage, LeadForm).
3. `getPhaseBGate` mengembalikan hitungannya; halaman pilot berhenti mengulang kueri
   yang sama; satu konstanta `REAL` + `PILOT_PREFIX` diekspor.
4. `src/lib/time.ts`: `DAY_MS`, `WIB_MS`, `ageDays()`, `dayFloorWIB`, satu `weekStartOf` —
   ganti 3 deklarasi WIB & ±18 inlining `24*3600*1000`.
5. Perbaiki `importCsv.ts:130`: `channel` tidak lagi dipaku "META" (baca dari CSV/pilihan).
6. Pindahkan `CampaignRow` ke `engine/types.ts` (hapus impor-naik `weeklyReport.ts:5`);
   ekstrak `campaignRows()` bersama untuk dashboard + kampanye.
7. Selesaikan tabrakan nama `Lead.sourceType` vs `IgPost.sourceType` (rename kolom lead
   → `leadSource`, migrasi additive + copy data).
8. `clearExample` menghapus Learning/EvidenceItem/BeliefRevision contoh (atau putuskan
   ledger tidak pernah seedable dan hapus kolomnya) — tombol "Hapus data contoh" harus jujur.
9. README diperbaiki: hapus klaim "TANPA login" yang basi, `cp .env.example .env.local`
   (bukan `.env`), tambah blok "Urutan langkah pertama": password → hapus contoh →
   3 audit → mulai pilot.
10. Checkbox "Catatan pilot" di form learning yang otomatis menambah prefix `[PILOT]` —
    prefix ketik-manual adalah titik gagal senyap Gerbang Fase B.

Satu aturan penutup: **kalau ragu sebuah ide melanggar dokumen ini, anggap melanggar,
dan tanya dulu.**
