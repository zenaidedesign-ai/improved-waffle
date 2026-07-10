# Runbook Pilot Data Nyata — 14 Hari

**Tujuan:** membuktikan Zenaide Revenue Engine dengan data sungguhan, lalu menyetel ambang di hari
ke-14. Status kemajuan live ada di layar **Pilot 14 Hari** (menu paling atas) — semua hitungan
HANYA dari data nyata; data contoh tidak dihitung.

## 🔒 PILOT LEARNING MODE (kunci pembangunan)

Selama 14 hari pilot, sistem DIKUNCI dari pembangunan lanjutan:

> **Fase B belum boleh dimulai. Sistem masih mengumpulkan bukti nyata. Jangan naikkan belief
> atau threshold sebelum 14 hari data pilot selesai.**

- **TIDAK dibangun selama pilot:** Fase B (skoring & lifecycle belief otomatis), modul baru,
  PR, API apa pun, deploy, perubahan threshold di `config.ts`.
- **YANG dikerjakan selama pilot:** input data nyata dengan disiplin, catat learning `[PILOT]`
  (selalu dengan falsifier), catat bukti di ledger Knowledge (Fase A).
- **Belief tidak naik kelas tanpa bukti:** kenaikan ke Terbukti butuh pola berulang dari data
  internal nyata + keputusan Noor. Banner merah di layar Pilot & Knowledge menjaga ini.
- Status 8 syarat pembuka Fase B tampil live di kartu **Gerbang Fase B** pada layar Pilot.

**Aturan main pilot:**
- Jangan ubah kebiasaan bisnis demi menyenangkan sistem — sistem yang harus terbukti berguna.
- Setiap kali label/vonis sistem terasa SALAH **atau justru terasa TEPAT**, catat dua-duanya
  sebagai learning berawalan `[PILOT]` di Knowledge (target ≥ 5 selama pilot). Ketidaksetujuan
  adalah data tuning paling berharga; konfirmasi adalah bukti kalibrasi.
- Selama pilot, keputusan budget tetap keputusan Noor — vonis sistem adalah usulan ber-alasan.

---

## Hari 1 — Fondasi (60–90 menit)

| # | Tugas | Di mana | Catatan |
|---|---|---|---|
| 0 | Hapus data contoh | Dashboard → hapus data contoh | Gerbang Fase B menuntut layar bersih dari contoh |
| 1 | Jalankan ketiga audit dengan jawaban NYATA | Audit Akun Meta → Rekomendasi → Tracking | Item MEMBLOKIR yang merah akan mengunci vonis — itu fitur, bukan bug |
| 2 | Input lead 7 hari terakhir dari WhatsApp | Lead Intelligence → + Catat lead | SEMUA chat masuk, termasuk yang cuma tanya harga — penyaringan tugas sistem |
| 3 | Impor satu CSV Ads Manager nyata (jika iklan jalan) | Impor & Ekspor → Metrik Iklan Harian | Ekspor dari Ads Manager: breakdown per hari |
| 4 | Input 5 post Instagram terakhir + angkanya | Diagnosa Instagram → + Catat post | Angka dari IG Insights; kosongkan yang tidak ada |
| 5 | Buka Laporan Revenue pertama | Laporan Revenue | Baca 10 bagian — perhatikan bagian yang bilang "data belum cukup" |
| 6 | Tekan "Mulai pilot hari ini" | Pilot 14 Hari | Menandai hari-1; hitungan 14 hari mulai dari sini (WIB) |

## Hari 2–13 — Rutinitas HARIAN (±10 menit)

1. **Lead baru:** setiap chat WA baru = satu baris lead (sumber, 5 sinyal, estimasi nilai).
2. **Follow-up:** buka antrian follow-up, kerjakan yang 👑/urgen, tandai "✓ Sudah di-follow-up".
3. **Gerakan corong:** lead yang lanjut ke survei/proposal/closing → update statusnya hari itu juga.
4. **Post:** catat post yang tayang; lengkapi angka post kemarin di usia 24 jam, lalu 48 jam, lalu 7 hari.
5. **Iklan (jika jalan):** tambah spend harian + perbarui corong manual kampanye dari log WA.
6. **Prioritas:** lirik Top 5 di Dashboard — kerjakan nomor 1.
7. **Vonis meleset / tepat?** Catat learning `[PILOT]` saat itu juga (dengan falsifier) —
   jangan tunggu Senin; ingatan 3 hari tidak bisa dipercaya.

## Setiap Senin — Rutinitas MINGGUAN (±30 menit)

1. Snapshot IG mingguan (reach, % non-follower, status rekomendasi dari aplikasi IG).
2. Impor CSV Ads Manager minggu lalu (atau input manual).
3. Perbarui 1 battle card kompetitor dari pengamatan publik.
4. Baca Revenue War Room → komit maksimal 5 keputusan di War Room Mingguan.
5. Catat ketidaksetujuan/konfirmasi minggu itu sebagai learning `[PILOT]` di Knowledge —
   lengkap dengan falsifier ("bukti apa yang membatalkan catatan ini?").
6. **Ledger bukti:** untuk learning yang sudah ada, catat bukti minggu ini di expander
   "Kenapa percaya ini?" — mendukung ATAU menentang, dua-duanya dicatat. Learning dengan
   ≥ 2 bukti internal mendukung = "pola berulang" yang dihitung Gerbang Fase B.
7. Ekspor CSV cadangan (Impor & Ekspor) — DB hanya satu file SQLite.

## Hari 14 — Tuning Ambang (60 menit)

1. **Uji triase:** telusuri semua lead; hitung label yang disetujui vs tidak → tulis persentasenya
   di learning `[PILOT]`. Target ≥ 80%. Untuk tiap yang salah: sinyal mana yang menyesatkan?
2. **Uji vonis kampanye:** setiap vonis harus bisa dijelaskan dalam satu kalimat ke orang lain.
   Yang tidak bisa = kandidat perbaikan aturan.
3. **Uji pola konten:** cocokkan Diagnosa + Pelatih Instagram dengan intuisi — di mana melesetnya?
4. **Kriteria manual:** adakah lead serius yang terlupakan? Apakah penanya-harga tersaring bersih?
5. **Adili kontradiksi:** buka Knowledge, cari badge "⚠ kontradiksi terbuka" — putuskan tiap
   learning yang buktinya bertentangan: turunkan, pertahankan, atau buang (tercatat di riwayat).
6. **Usulan ambang baru:** daftar ambang aktif + alasannya ada di `src/lib/domain/config.ts`
   (target CPQL 300rb, lead berkualitas ≥ 60 & ≥ 3 jawaban, jebakan chat murah < 30%,
   pemenang p80 & min 8 post, Noor-flag ≥ 300 jt / prob ≥ 60%). Tulis daftar perubahan yang
   diinginkan — ambang disetel lewat satu perubahan ber-review, tidak diedit diam-diam.
7. **Cek Gerbang Fase B** di layar Pilot — syarat mana yang belum terpenuhi menentukan
   apakah pilot diperpanjang atau Fase B boleh diminta.

## Kriteria sukses pilot (dilacak live di layar Pilot)

- ≥ 50 lead nyata · ≥ 10 post nyata · ≥ 1 impor CSV ads nyata · ≥ 1 sesi War Room
- Ketiga audit dijalankan · ≥ 2 snapshot mingguan · ≥ 1 catatan `[PILOT]`
- **Dinilai Noor (tidak bisa dicentang sistem):** setuju triase ≥ 80% · tidak ada lead serius terlupakan
- Vonis kampanye bisa dijelaskan · lead sampah tersaring

Lolos semua → status proyek naik dari CONDITIONAL GO ke **GO**.

## Gerbang Fase B — data nyata yang WAJIB ada sebelum Fase B

Fase B (skoring & lifecycle belief otomatis) hanya boleh dimulai jika SEMUA ini terpenuhi
(dilacak live di kartu "Gerbang Fase B" layar Pilot):

| # | Syarat | Target | Dicek oleh |
|---|---|---|---|
| 1 | Lead nyata tercatat | ≥ 50 | sistem |
| 2 | Post Instagram nyata tercatat | ≥ 10 | sistem |
| 3 | CSV Ads Manager nyata diimpor | ≥ 1 | sistem |
| 4 | War Room mingguan dari data nyata | ≥ 1 | sistem |
| 5 | Ketidaksetujuan/konfirmasi `[PILOT]` di Knowledge | ≥ 5 | sistem |
| 6 | Noor menelusuri triase AI vs penilaiannya sendiri | selesai | **Noor** (hari 14) |
| 7 | Pola berulang dari data nyata (learning dengan ≥ 2 bukti internal mendukung) | ≥ 2 | sistem (ledger Fase A) |
| 8 | Data contoh dihapus (lead/post/kampanye) | 0 tersisa | sistem |

Ditambah: pilot harus sudah berjalan **≥ 14 hari**. Selama satu saja belum terpenuhi, banner
kunci tetap tampil dan Fase B tidak boleh diminta maupun dibangun.
