# Blueprint Goal 1 — Instagram & Meta Recovery Engine

**Zenaide Revenue Engine** · Dokumen desain (belum ada kode) · Bahasa: Indonesia · Status: menunggu persetujuan owner

---

## 1. Untuk apa modul ini

Pipeline proyek baru bulan ini lemah. Sebelum bicara konten, TikTok, atau kompetitor, sistem harus bisa menjawab tiga pertanyaan yang sekarang tidak terjawab:

1. **Apakah fondasi akun Meta sehat?** (Ada riwayat akun Facebook lama yang di-disable dan kemungkinan koneksi Business Manager yang salah.)
2. **Apakah angka yang kita lihat bisa dipercaya?** (Chat murah belum tentu iklan bekerja.)
3. **Apakah setiap rupiah iklan menghasilkan lead berkualitas yang bergerak ke survei → proposal → closing?**

Prinsip inti: **sistem menolak memberi vonis kampanye sebelum fondasi dicek.** Ini yang membedakan Recovery Engine dari dashboard biasa — dashboard menampilkan angka, Recovery Engine menahan kesimpulan sampai kesimpulan itu layak dipercaya.

### Metrik utama vs metrik sekunder

| Utama (menentukan keputusan) | Sekunder (hanya sinyal diagnosa) |
|---|---|
| Lead berkualitas (qualified) | Reach, impresi |
| Booking survei | Likes, komentar |
| Proposal terkirim | Followers |
| Nilai closing & nilai pipeline | CTR, CPM |
| Biaya per lead berkualitas (CPQL) | Biaya per chat |

Metrik sekunder tetap dicatat — tapi **tidak pernah dilaporkan sebagai keberhasilan**.

---

## 2. Arsitektur gerbang (gate architecture)

Semua diagnosa mengalir lewat tiga gerbang berurutan. Gerbang yang merah **mengunci** vonis di tahap berikutnya.

```
GERBANG 0 · Kesehatan Akun Meta      → merah = "PERBAIKI AKUN DULU"
        ↓ hijau/kuning
GERBANG 1 · Keandalan Tracking       → merah = "PERBAIKI TRACKING DULU"
        ↓ hijau/kuning
GERBANG 2 · Vonis Kampanye & Konten  → kill / hold / iterate / scale / pindah budget
        ↓
KEPUTUSAN MINGGU INI (maks. 5 keputusan, bahasa langsung)
```

Kalau Gerbang 0 merah, layar kampanye tetap menampilkan data, tapi vonisnya diganti label: *"Vonis dikunci — perbaiki akun dulu. Alasan: [item audit yang merah]."* Ini mencegah owner mengambil keputusan budget di atas fondasi yang rapuh.

---

## 3. Modul A — Audit Kesehatan & Silsilah Akun Meta (Gerbang 0)

**Pemilik virtual:** Performance Ads Director + QA/Truth Auditor.
**Cara kerja Fase 1:** wizard terpandu. Sistem TIDAK punya akses API Meta — sistem memandu owner mengecek sendiri di Meta Business Suite, lalu owner mengisi jawabannya. Setiap item punya: pertanyaan, kenapa penting, cara mengecek (langkah klik), dan bobot (memblokir / tidak memblokir).

### Daftar item audit (blocking = merah mengunci Gerbang 2)

| # | Item | Blocking? | Kenapa penting |
|---|---|---|---|
| A1 | Status ad account: aktif / dibatasi / disabled? | ✅ | Akun dibatasi = delivery dicekik diam-diam |
| A2 | Ad account ada di Business Manager yang benar & dimiliki Zenaide (bukan personal / BM orang lain)? | ✅ | Salah kepemilikan = risiko kehilangan aset & pembatasan |
| A3 | Ada silsilah ke akun Facebook lama yang pernah di-disable? (admin lama, BM lama, page lama) | ✅ | Riwayat pelanggaran menular lewat koneksi aset |
| A4 | Account Quality (business.facebook.com/accountquality): ada pembatasan / peringatan? | ✅ | Sumber kebenaran resmi status akun |
| A5 | Halaman FB & akun IG profesional terhubung ke BM yang sama dan benar? | ✅ | Iklan IG butuh koneksi ini bersih |
| A6 | Metode pembayaran sehat, tidak pernah gagal bayar? | ✅ | Gagal bayar = pembatasan otomatis |
| A7 | Pixel / dataset dimiliki BM Zenaide (bukan pihak ketiga)? | ⬜ | Menentukan siapa yang mengontrol data konversi |
| A8 | Domain terverifikasi di BM (kalau pakai landing page)? | ⬜ | Mempengaruhi atribusi & kepercayaan akun |
| A9 | Nomor WhatsApp bisnis terhubung resmi ke ad account untuk iklan click-to-WA? | ⬜ | Iklan WA tanpa koneksi resmi = data tujuan kacau |
| A10 | Dua orang admin BM aktif (bukan satu akun pribadi saja)? | ⬜ | Mitigasi kalau satu akun kena masalah |

### Skor & vonis Gerbang 0

- **Merah** — ada item blocking yang bermasalah → vonis tunggal: **"Perbaiki akun dulu"** + rencana perbaikan berurutan (item mana dulu, langkahnya apa, kapan dicek ulang).
- **Kuning** — blocking aman, non-blocking ada masalah → kampanye boleh divonis, tapi setiap vonis membawa catatan risiko.
- **Hijau** — semua aman → Gerbang 1 terbuka penuh.

Audit disimpan sebagai *AuditRun* bertanggal — supaya terlihat riwayatnya: kapan terakhir dicek, apa yang berubah. Sistem mengingatkan audit ulang tiap 30 hari atau setelah kejadian (iklan ditolak, pembatasan baru).

---

## 4. Modul B — Audit Keandalan Tracking (Gerbang 1)

**Pemilik virtual:** Performance Ads Director + Marketing Data Analyst.

Pertanyaan yang dijawab: *"Kalau besok ada 10 chat WhatsApp masuk, bisakah kita tahu chat mana dari kampanye mana?"* Kalau tidak bisa, semua angka biaya per hasil adalah tebakan.

### Item audit tracking

| # | Item | Blocking? |
|---|---|---|
| T1 | Setiap kampanye punya cara membedakan sumber chat (pesan pembuka berkode, nomor berbeda, atau pertanyaan "tahu Zenaide dari mana?") | ✅ |
| T2 | Ada log lead: setiap chat masuk dicatat (tanggal, sumber, isi singkat) — manual pun boleh | ✅ |
| T3 | Definisi "lead berkualitas" disepakati tertulis (lihat Modul E) | ✅ |
| T4 | Angka Ads Manager pernah dicocokkan dengan chat nyata minimal 1x (mis. Ads Manager bilang 20 chat, WhatsApp nyata berapa?) | ⬜ |
| T5 | Kalau ada landing page: UTM konsisten | ⬜ |

**Merah** → vonis tunggal: **"Perbaiki tracking dulu"** + template praktis (format log lead, kode pesan pembuka per kampanye, pertanyaan kualifikasi standar). Ini sengaja sederhana — disiplin manual dulu, otomasi belakangan.

---

## 5. Modul C — Diagnosa Kampanye & Mesin Vonis (Gerbang 2, sisi iklan)

**Pemilik virtual:** Performance Ads Director.

### Data yang dicatat (manual / impor CSV Ads Manager)

Hierarki: **Campaign → Ad Set → Ad → metrik harian/mingguan**. Dari CSV Ads Manager standar diambil: spend, impresi, klik, hasil (chat dimulai / lead). Dari log lead (Modul E) disambungkan: jumlah lead, lead berkualitas, survei, proposal, closing, nilai pipeline per kampanye.

### Rantai kebenaran biaya

```
Spend → Biaya per chat → Biaya per lead berkualitas (CPQL) → Biaya per survei → Nilai pipeline / Spend
```

Vonis **tidak pernah** berhenti di "biaya per chat". Chat murah dengan kualifikasi 0% = kampanye buruk yang kelihatan bagus.

### Aturan vonis (default — bisa disetel owner, setiap angka default punya alasan tertulis di layar pengaturan)

Prasyarat data: **tidak ada vonis sebelum spend ≥ 3× target CPQL ATAU ≥ 10 chat masuk.** Sebelum itu vonisnya jujur: **"Tahan — data belum cukup."** (Aturan anti-halusinasi: sistem tidak boleh sok tahu di data tipis.)

| Kondisi (setelah data cukup) | Vonis |
|---|---|
| Spend ≥ 3× target CPQL dan lead berkualitas = 0 | **KILL** |
| CPQL ≤ target, ≥ 3 lead berkualitas, ada gerakan ke survei | **SCALE** (naik budget bertahap +20–30%, bukan digandakan) |
| Chat banyak & murah tapi rasio kualifikasi < 30% | **ITERATE — masalah penawaran/audiens** (bukan kreatif) |
| CTR rendah & chat mahal | **ITERATE — masalah kreatif/hook** |
| CTR sehat tapi chat sedikit | **ITERATE — masalah CTA/friksi** |
| CPQL 1–2× target, tren membaik | **HOLD** (beri 1 siklus lagi, tanggal evaluasi otomatis) |
| Dua kampanye aktif, satu CPQL jauh lebih baik | **PINDAH BUDGET** ke pemenang |

Setiap vonis di layar selalu menampilkan: **aturan mana yang menyala, angka pemicunya, dan tingkat keyakinan** (tinggi/sedang/rendah berdasarkan volume data). Diagnosa membedakan lapisan masalah: delivery / kreatif / penawaran / audiens / kualitas lead — supaya "iterate" selalu spesifik, bukan "coba-coba lagi".

---

## 6. Modul D — Instagram Recovery Analyst (Gerbang 2, sisi organik)

**Pemilik virtual:** Instagram Recovery Analyst + Content Strategist.

### Kesehatan akun (input manual dari IG Insights, snapshot mingguan)

- % reach dari **non-follower** (sinyal distribusi/rekomendasi paling penting)
- Tren reach 30 hari (naik/datar/turun)
- Checklist kelayakan rekomendasi (dipandu, dicek di Pengaturan IG → Status Akun): ada konten yang ditandai tidak layak direkomendasikan? pelanggaran? 
- Rasio kunjungan profil → follow (kecocokan positioning)
- Save rate & share rate per konten (sinyal niat, bukan vanity — save = "saya mau pakai ini", share = "ini layak disebarkan")
- Chat/DM yang lahir dari konten (sinyal bisnis paling nyata)

### Log konten per posting (input manual, ±60 detik per post)

Format (Reels/Carousel/Foto/Threads) · pilar · hook · CTA · reach follower vs non-follower · saves · shares · kunjungan profil · chat yang dihasilkan → sistem menghitung **skor sinyal** per post dan menandai **pemenang organik** (kandidat "jadikan iklan").

### Kartu hipotesis — bukan klaim algoritma

Sistem **tidak pernah** mengklaim tahu algoritma. Setiap rekomendasi konten berbentuk kartu eksperimen:

> **Hipotesis:** Reels transformasi before-after dengan angka budget di 3 detik pertama menaikkan reach non-follower.
> **Sinyal yang dibidik:** share rate & reach non-follower. **Reaksi yang diharapkan:** share ke pasangan/keluarga yang sedang renovasi. **Hasil bisnis yang diharapkan:** chat masuk bertanya estimasi. **Metrik sukses:** ≥ X share & ≥ 1 chat per post dalam 7 hari, dari 3 post uji. **Aturan keputusan setelah uji:** lolos → jadikan pilar rutin + kandidat iklan; gagal → ganti angle hook, bukan ganti format dulu.

Enam kolom itu **wajib** — kartu tanpa enam kolom tidak bisa disimpan. Inilah pagar anti-"content calendar generik".

---

## 7. Modul E — Lead & Corong WhatsApp (fondasi kebenaran)

**Pemilik virtual:** CRM & WhatsApp Funnel Analyst. Modul ini minimum-tapi-wajib di Goal 1, karena vonis iklan dan konten bersandar padanya.

### Entitas Lead

- **Sumber:** kampanye tertentu / organik IG (post tertentu) / referral / lainnya
- **Status pipeline:** Chat baru → Merespons → Berkualitas → Survei terjadwal → Survei selesai → Proposal terkirim → Negosiasi → **Closing menang / kalah / menghilang (ghosting)**
- **Skor kualitas (0–100), dari 5 sinyal manual:** sinyal budget (menyebut angka / tanya "berapa harga termurah"), jenis proyek (rumah penuh vs 1 ruangan), lokasi (Surabaya & sekitar vs luar jangkauan), urgensi (sudah punya rumah/serah terima vs "masih rencana"), keseriusan komunikasi (menjawab pertanyaan kualifikasi vs satu kata)
- **Nilai:** estimasi nilai proyek → nilai pipeline = Σ estimasi lead aktif berbobot status
- **Pengingat:** lead berkualitas tanpa balasan > 2 hari → muncul di antrian follow-up dengan risiko ghosting

Definisi **"lead berkualitas"** default: skor ≥ 60 **dan** bersedia menjawab minimal 3 pertanyaan kualifikasi. Definisi ini tertulis, bisa disetel, dan dipakai konsisten oleh semua vonis.

---

## 8. Kosakata keputusan (tetap & terbatas)

Setiap layar berakhir dengan satu/beberapa dari daftar ini — tidak ada keputusan di luar daftar:

`Perbaiki akun dulu` · `Perbaiki tracking dulu` · `Perbaiki kreatif` · `Ganti penawaran` · `Ganti audiens` · `Ganti CTA` · `Kill kampanye` · `Hold kampanye` · `Iterate kampanye` · `Scale kampanye` · `Pindah budget` · `Jadikan pemenang organik sebagai iklan` · `Tahan — data belum cukup`

---

## 9. Model data (garis besar skema Prisma / SQLite)

```
AuditRun            (jenis: META_ACCOUNT | TRACKING, tanggal, vonis)
AuditAnswer         (auditRunId, itemKey, jawaban, status R/K/H, catatan)
Campaign / AdSet / Ad
AdMetricDaily       (adId|adSetId, tanggal, spend, impresi, klik, hasilPlatform)
Lead                (sumberJenis, campaignId?, igPostId?, status, skorKualitas,
                     sinyalBudget/Proyek/Lokasi/Urgensi/Keseriusan, estimasiNilai)
LeadEvent           (leadId, tanggal, perubahanStatus/catatan)  ← riwayat corong
IgAccountSnapshot   (mingguKe, reachNonFollowerPct, trenReach, statusRekomendasi, ...)
IgPost              (tanggal, format, pilar, hook, cta, metrik..., skorSinyal, pemenang?)
Hypothesis          (6 kolom wajib, status: draft/uji/lolos/gagal, hasil)
Verdict             (subjek: campaign|post|akun, aturanYangMenyala, angkaPemicu,
                     keyakinan, keputusan, tanggal)  ← log keputusan, bisa diaudit ulang
Setting             (targetCPQL, ambangKualifikasi, ambangSkorLead, ... + alasanDefault)
```

Semua vonis disimpan sebagai `Verdict` — jejak keputusan bisa ditinjau ulang (peran QA/Truth Auditor).

### Impor CSV Fase 1

1. **Meta Ads Manager export** (kolom standar: Campaign name, Ad set name, Ad name, Day, Amount spent, Impressions, Link clicks, Results) → pemetaan kolom dengan pratinjau sebelum masuk.
2. **Grid manual IG** — template CSV sederhana yang disediakan sistem untuk log konten & snapshot mingguan.
3. **Log lead** — template CSV kalau owner sudah terlanjur mencatat di spreadsheet.

Semua impor: pratinjau → konfirmasi → masuk. Tidak ada penimpaan diam-diam.

---

## 10. Layar (7 layar, semua Bahasa Indonesia, semua berakhir di keputusan)

| Layar | Isi inti | Keputusan di akhir layar |
|---|---|---|
| **Ruang Kendali** | Status 3 gerbang, nilai pipeline, lead berkualitas bulan ini, 5 keputusan minggu ini | Antrian keputusan |
| **Audit Akun Meta** | Wizard A1–A10 + rencana perbaikan | Perbaiki akun dulu / lanjut |
| **Audit Tracking** | Wizard T1–T5 + template log & kode kampanye | Perbaiki tracking dulu / lanjut |
| **Kampanye** | Tabel kampanye dengan rantai biaya penuh + vonis per baris | Kill/hold/iterate/scale/pindah budget |
| **Instagram** | Kesehatan akun, log konten, pemenang organik, kartu hipotesis | Uji hipotesis / jadikan iklan |
| **Leads** | Papan pipeline + antrian follow-up + risiko ghosting | Follow-up / jadwalkan survei / tandai |
| **Pengaturan & Kebenaran** | Target CPQL, definisi lead berkualitas, ambang vonis + alasan default | Setel ambang |

---

## 11. Pemetaan tim virtual → modul

| Peran | Modul yang dimiliki |
|---|---|
| AI CMO | Ruang Kendali, prioritas keputusan mingguan |
| Instagram Recovery Analyst | Modul D |
| Performance Ads Director | Modul A, C |
| CRM & WhatsApp Funnel Analyst | Modul E |
| Marketing Data Analyst | Modul B, semua tabel & impor |
| Content Strategist + Creative Director + Copywriter | Kartu hipotesis & pemenang organik (Modul D) |
| QA / Truth Auditor | Prasyarat data, log Verdict, label keyakinan, larangan klaim algoritma |
| Competitor Intelligence Analyst | **Belum aktif** — Goal berikutnya |

---

## 12. Urutan pembangunan (setelah blueprint disetujui)

1. **Scaffold** — Next.js + Prisma/SQLite + kerangka 7 layar *(lane: CHEAP/STANDARD)*
2. **Skema & seed** — model data §9 *(STANDARD; review integritas: EXPERT)*
3. **Audit Akun Meta + Audit Tracking** — wizard & logika gerbang *(logika: EXPERT, UI: STANDARD)*
4. **Modul Lead** — pipeline, skor, follow-up *(skor: EXPERT, CRUD: CHEAP)*
5. **Modul Kampanye** — impor CSV, rantai biaya, mesin vonis *(aturan vonis: EXPERT)*
6. **Modul Instagram** — snapshot, log konten, kartu hipotesis *(STANDARD + EXPERT untuk skor sinyal)*
7. **Ruang Kendali** — agregasi keputusan minggu ini *(STANDARD)*
8. **Audit akhir QA/Truth** — uji vonis di data tipis, cek anti-halusinasi *(EXPERT)*

### Yang sengaja TIDAK dibangun di Goal 1
TikTok · Google Ads · modul kompetitor · kalender konten otomatis · integrasi API live · scraping · otomasi WhatsApp. Semua menunggu fondasi ini benar.

---

*Dokumen ini adalah keluaran lane EXPERT: arsitektur produk, logika revenue, dan aturan keputusan. Implementasi kode belum dimulai — menunggu persetujuan owner atas blueprint ini.*
