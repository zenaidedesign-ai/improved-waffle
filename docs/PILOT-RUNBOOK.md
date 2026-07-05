# Runbook Pilot Data Nyata — 14 Hari

**Tujuan:** membuktikan Zenaide Revenue Engine dengan data sungguhan, lalu menyetel ambang di hari
ke-14. Status kemajuan live ada di layar **Pilot 14 Hari** (menu paling atas) — semua hitungan
HANYA dari data nyata; data contoh tidak dihitung.

**Aturan main pilot:**
- Jangan ubah kebiasaan bisnis demi menyenangkan sistem — sistem yang harus terbukti berguna.
- Setiap kali label/vonis sistem terasa SALAH, jangan diabaikan: catat sebagai learning
  berawalan `[PILOT]` di Knowledge Engine. Ketidaksetujuan adalah data tuning paling berharga.
- Selama pilot, keputusan budget tetap keputusan Noor — vonis sistem adalah usulan ber-alasan.

---

## Hari 1 — Fondasi (60–90 menit)

| # | Tugas | Di mana | Catatan |
|---|---|---|---|
| 1 | Jalankan ketiga audit dengan jawaban NYATA | Audit Akun Meta → Rekomendasi → Tracking | Item MEMBLOKIR yang merah akan mengunci vonis — itu fitur, bukan bug |
| 2 | Input lead 7 hari terakhir dari WhatsApp | Lead Intelligence → + Catat lead | SEMUA chat masuk, termasuk yang cuma tanya harga — penyaringan tugas sistem |
| 3 | Impor satu CSV Ads Manager nyata (jika iklan jalan) | Impor & Ekspor → Metrik Iklan Harian | Ekspor dari Ads Manager: breakdown per hari |
| 4 | Input 5 post Instagram terakhir + angkanya | Diagnosa Instagram → + Catat post | Angka dari IG Insights; kosongkan yang tidak ada |
| 5 | Buka Laporan Revenue pertama | Laporan Revenue | Baca 10 bagian — perhatikan bagian yang bilang "data belum cukup" |

## Hari 2–13 — Rutinitas HARIAN (±10 menit)

1. **Lead baru:** setiap chat WA baru = satu baris lead (sumber, 5 sinyal, estimasi nilai).
2. **Follow-up:** buka antrian follow-up, kerjakan yang 👑/urgen, tandai "✓ Sudah di-follow-up".
3. **Gerakan corong:** lead yang lanjut ke survei/proposal/closing → update statusnya hari itu juga.
4. **Post:** catat post yang tayang; lengkapi angka post kemarin di usia 24 jam, lalu 48 jam, lalu 7 hari.
5. **Iklan (jika jalan):** tambah spend harian + perbarui corong manual kampanye dari log WA.
6. **Prioritas:** lirik Top 5 di Dashboard — kerjakan nomor 1.

## Setiap Senin — Rutinitas MINGGUAN (±30 menit)

1. Snapshot IG mingguan (reach, % non-follower, status rekomendasi dari aplikasi IG).
2. Impor CSV Ads Manager minggu lalu (atau input manual).
3. Perbarui 1 battle card kompetitor dari pengamatan publik.
4. Baca Revenue War Room → komit maksimal 5 keputusan di War Room Mingguan.
5. Catat ketidaksetujuan minggu itu sebagai learning `[PILOT]` di Knowledge.
6. Ekspor CSV cadangan (Impor & Ekspor) — DB hanya satu file SQLite.

## Hari 14 — Tuning Ambang (60 menit)

1. **Uji triase:** telusuri semua lead; hitung label yang disetujui vs tidak → tulis persentasenya
   di learning `[PILOT]`. Target ≥ 80%. Untuk tiap yang salah: sinyal mana yang menyesatkan?
2. **Uji vonis kampanye:** setiap vonis harus bisa dijelaskan dalam satu kalimat ke orang lain.
   Yang tidak bisa = kandidat perbaikan aturan.
3. **Uji pola konten:** cocokkan Diagnosa + Pelatih Instagram dengan intuisi — di mana melesetnya?
4. **Kriteria manual:** adakah lead serius yang terlupakan? Apakah penanya-harga tersaring bersih?
5. **Usulan ambang baru:** daftar ambang aktif + alasannya ada di `src/lib/domain/config.ts`
   (target CPQL 300rb, lead berkualitas ≥ 60 & ≥ 3 jawaban, jebakan chat murah < 30%,
   pemenang p80 & min 8 post, Noor-flag ≥ 300 jt / prob ≥ 60%). Tulis daftar perubahan yang
   diinginkan — ambang disetel lewat satu perubahan ber-review, tidak diedit diam-diam.

## Kriteria sukses (dilacak live di layar Pilot)

- ≥ 50 lead nyata · ≥ 10 post nyata · ≥ 1 impor CSV ads nyata · ≥ 1 sesi War Room
- Ketiga audit dijalankan · ≥ 2 snapshot mingguan · ≥ 1 catatan `[PILOT]`
- **Dinilai Noor (tidak bisa dicentang sistem):** setuju triase ≥ 80% · tidak ada lead serius terlupakan
- Vonis kampanye bisa dijelaskan · lead sampah tersaring

Lolos semua → status proyek naik dari CONDITIONAL GO ke **GO**.
