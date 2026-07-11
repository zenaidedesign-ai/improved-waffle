# Operations Safety — Menjalankan Zenaide Revenue Engine dengan Aman (Pra-Auth)

Dokumen ini untuk Noor. Bahasanya sengaja langsung. Status keamanan hari ini, jujur:
**gerbang password owner (Auth Tahap 1) sudah dibangun, tapi hanya hidup kalau password
di-set** — tanpa itu aplikasi tetap terbuka penuh.

## 1. Cara aman menjalankan sistem

- **Langkah pertama, sekali saja: set password owner** —
  `node scripts/set-owner-password.mjs "PasswordKuatAnda"`, salin hasilnya ke `.env.local`,
  restart. Panduan lengkap: `docs/AUTH-READINESS.md` §0.
- Tetap jalankan HANYA di laptop pribadi owner, dengan password OS dan layar terkunci
  otomatis — login aplikasi TIDAK menggantikan kunci laptop.
- JANGAN deploy ke internet (masih HOLD). JANGAN pasang di komputer kantor bersama.
- JANGAN bagikan alamat aplikasi maupun password ke siapa pun — satu password = identitas owner.
- Peringatan oranye di layar sensitif adalah pengingat; gerbangnya adalah login + laptop terkunci.
- Basis data = SATU file: `prisma/dev.db`. Siapa pun yang memegang file itu (atau `.env.local`)
  memegang semua data bisnis. Perlakukan seperti buku rekening.

## 2. Cara backup (Pusat Cadangan, menu Impor & Ekspor)

**Rutin mingguan — tiap Senin, ±2 menit (sudah ada di rutinitas pilot):**
1. Buka Impor & Ekspor → **Pusat Cadangan**.
2. Unduh **file database (.db)** — cadangan lengkap semua tabel (snapshot konsisten).
3. Unduh 3 CSV (lead, post IG, metrik iklan) — cadangan yang bisa dibaca di Excel/Sheets.
4. Simpan ke folder pribadi tersinkron cloud milik owner (mis. Google Drive akun pribadi),
   beri nama bertanggal, simpan minimal 4 minggu terakhir.
5. Banner di Pusat Cadangan & Dashboard menagih kalau cadangan lebih tua dari 7 hari.

**Peringatan restore:** memulihkan cadangan MENIMPA semua data setelah tanggal cadangan itu.
Caranya (hanya kalau benar-benar perlu): matikan aplikasi → ganti `prisma/dev.db` dengan file
cadangan → nyalakan lagi. Kalau ragu, jangan lakukan sendiri — minta bantuan dulu.

**Jangan dibagikan:** file .db dan CSV berisi identitas lead, nilai proyek, dan strategi.
Jangan kirim lewat grup WA, email umum, atau folder bersama staf.

## 3. Data contoh vs data nyata — jangan pernah tercampur

- **Data contoh** = baris berlabel `[CONTOH]` yang dimuat tombol seed, ditandai `isExample: true`
  di database. **Data nyata** = semua yang Anda input/impor sendiri.
- Sistem memisahkannya secara struktural: kemajuan Pilot, Gerbang Fase B, dan pola berulang
  HANYA menghitung data nyata — teruji di suite E2E.
- Penghapusan data contoh (Dashboard): menampilkan jumlah baris per tabel, meminta centang
  konfirmasi, dan secara struktural hanya bisa menyentuh baris `isExample: true` — data asli
  tidak mungkin ikut terhapus lewat jalur ini.
- Aturan pilot: hapus data contoh di Hari 1 (Gerbang Fase B menuntut 0 baris contoh).
- Jangan pernah menginput data sungguhan lewat tombol seed, dan jangan menandai data nyata
  sebagai contoh.

## 4. Kapan staf boleh mulai memakai sistem

**Belum sekarang.** Syarat minimal sebelum staf pertama diberi akses:
1. ✅ Auth Tahap 1 terpasang & teruji — tinggal DIKONFIGURASI (set password) di perangkat owner.
2. Peran STAF dari rencana auth diberlakukan (staf = jalur input; owner = keputusan & uang).
3. Pilot 14 hari selesai — supaya yang diajarkan ke staf adalah alur yang sudah terbukti.
4. Cadangan mingguan sudah jadi kebiasaan (minimal 2 cadangan tersimpan).
Sampai keempatnya terpenuhi: staf boleh MELIHAT layar bersama owner, tidak memegang aplikasi sendiri.

## 5. Checklist Kesiapan Produksi (sebelum deployment apa pun)

| # | Pertanyaan | Status hari ini | Syarat lolos |
|---|---|---|---|
| 1 | Auth siap? | ⚠ Tahap 1 TERPASANG & teruji; hidup hanya jika `ZENAIDE_AUTH_HASH` di-set | Password owner di-set di perangkat yang dipakai + login terbukti jalan |
| 2 | Backup siap? | ✅ Jalur manual siap (Pusat Cadangan); disiplin mingguan belum terbukti | ≥ 2 cadangan mingguan berturut tersimpan |
| 3 | Database aman? | ⚠ SQLite satu file, aman selama lokal di laptop terkunci | File DB di disk terenkripsi + backup rutin; kalau multi-user: pindah server DB |
| 4 | Data contoh bersih? | Dicek live di Dashboard & Gerbang Fase B | 0 baris contoh |
| 5 | Pilot sudah jalan? | Belum dimulai (tombol ada di layar Pilot) | Pilot selesai 14 hari + Hari-14 dikerjakan |
| 6 | Akses per peran siap? | ❌ BELUM — semua orang = akses penuh | Peran OWNER/STAF/BACA-SAJA diberlakukan |
| 7 | Deployment disetujui? | ❌ **HOLD** — belum ada persetujuan owner | Persetujuan eksplisit owner SETELAH baris 1–6 hijau |
| 8 | Rencana rollback ada? | ✅ Didokumentasikan: matikan app → kembalikan file .db cadangan → nyalakan; kode kembali via git revert | Diuji sekali di luar jam kerja |

**Aturan bakunya:** selama baris mana pun masih ❌, jawaban untuk "boleh deploy?" adalah TIDAK.

## 6. Yang harus terjadi sebelum deployment (urutan)

1. Pilot 14 hari selesai + tuning Hari-14.
2. ✅ Auth Tahap 1 dibangun & diuji — pastikan password di-set di lingkungan tujuan
   (tanpa `ZENAIDE_AUTH_HASH`, aplikasi terbuka penuh — dilarang deploy begitu).
3. Kebiasaan backup terbukti (≥ 2 minggu berturut).
4. Uji restore satu kali dari cadangan sungguhan.
5. Keputusan deploy eksplisit dari owner — target, biaya, dan siapa yang bisa mengaksesnya
   tertulis. Sampai saat itu: **deployment = HOLD**.
