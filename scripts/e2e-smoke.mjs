// Jalankan: reset DB (rm prisma/dev.db && npx prisma migrate deploy),
// start server BARU dengan auth aktif:
//   ZENAIDE_AUTH_HASH=$(node -e 'const{scryptSync}=require("crypto");const s="e2esalt00000000";console.log(`scrypt:${s}:${scryptSync("zenaide-e2e","" + s,32).toString("hex")}`)') \
//   npm run start -- -p 3100
// lalu: node scripts/e2e-smoke.mjs   (password uji: E2E_PASSWORD, default "zenaide-e2e")
// E2E smoke test: gerbang auth dulu, lalu muat data contoh & jalankan semua layar.
import { chromium } from "playwright-core";

const BASE = "http://localhost:3100";
const PASSWORD = process.env.E2E_PASSWORD ?? "zenaide-e2e";
const SHOTS = process.env.SHOTS_DIR ?? "./e2e-shots";
import { mkdirSync } from "fs";
mkdirSync(SHOTS, { recursive: true });

const CHROME =
  process.env.CHROME_PATH ??
  (await import("fs")).globSync?.("/opt/pw-browsers/chromium-*/chrome-linux/chrome")?.[0] ??
  "/usr/bin/chromium";
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (e) {
    results.push(`FAIL  ${name}: ${e.message.split("\n")[0]}`);
  }
}

// 0. Auth Tahap 1 — SEMUA terkunci sebelum login; API mengembalikan 401, bukan data.
await check("auth: tanpa login halaman redirect & API sensitif 401", async () => {
  await page.goto(BASE + "/leads");
  await page.waitForURL(/\/login/, { timeout: 15000 });
  for (const api of ["/api/backup/db", "/api/export/lead"]) {
    const r = await page.request.get(BASE + api);
    if (r.status() !== 401) throw new Error(`${api} tanpa login harus 401, dapat ${r.status()}`);
  }
});

await check("auth: password salah ditolak, password benar masuk", async () => {
  await page.goto(BASE + "/login");
  await page.fill('input[name="password"]', "password-yang-salah");
  await page.click('button:has-text("Masuk")');
  await page.waitForURL(/error=salah/, { timeout: 15000 });
  const body = await page.textContent("body");
  if (!body.includes("Password salah")) throw new Error("pesan password salah tidak tampil");
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button:has-text("Masuk")');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  await page.waitForSelector("text=Dashboard Intelijen Pemasaran");
});
await page.screenshot({ path: SHOTS + "/00-login.png", fullPage: true });

// 1. Ruang Kendali kosong — semua gerbang belum diaudit, banner kunci tampil
await check("home: gerbang terkunci saat DB kosong", async () => {
  await page.goto(BASE + "/");
  await page.waitForSelector("text=Dashboard Intelijen Pemasaran");
  const banner = await page.textContent("body");
  if (!banner.includes("Vonis dikunci")) throw new Error("banner kunci tidak tampil");
  if (!banner.includes("Belum diaudit")) throw new Error("status belum diaudit tidak tampil");
});
await page.screenshot({ path: SHOTS + "/01-home-kosong.png", fullPage: true });

// 2. Muat data contoh
await check("muat data contoh", async () => {
  await page.click('button:has-text("Muat data contoh")');
  await page.waitForTimeout(4000);
  await page.goto(BASE + "/");
  const body = await page.textContent("body");
  if (!body.includes("Merah")) throw new Error("gerbang tidak merah setelah seed (audit contoh punya blocking merah)");
});
await page.screenshot({ path: SHOTS + "/02-home-seeded.png", fullPage: true });

// 3. Audit akun — hasil per item + rencana perbaikan
await check("audit akun meta: hasil & rencana perbaikan", async () => {
  await page.goto(BASE + "/audit/meta-account");
  const body = await page.textContent("body");
  if (!body.includes("Rencana perbaikan")) throw new Error("rencana perbaikan tidak tampil");
  if (!body.includes("MEMBLOKIR")) throw new Error("label memblokir tidak tampil");
});
await page.screenshot({ path: SHOTS + "/03-audit-akun.png", fullPage: true });

// 4. Wizard audit — jalankan audit rekomendasi semua hijau
await check("wizard audit rekomendasi: submit semua hijau", async () => {
  await page.goto(BASE + "/audit/rekomendasi/jalankan");
  const buttons = await page.$$("text=Hijau — aman");
  for (const b of buttons) await b.click();
  await page.click('button:has-text("Simpan audit")');
  await page.waitForURL("**/audit/rekomendasi", { timeout: 15000 });
  const body = await page.textContent("body");
  if (!body.includes("Hijau")) throw new Error("vonis hijau tidak tampil");
});

// 5. Instagram — diagnosa distribusi
await check("instagram: mix portofolio + pemenang organik + lock banner", async () => {
  await page.goto(BASE + "/instagram");
  const body = await page.textContent("body");
  if (!body.includes("Terlalu berat portofolio")) throw new Error("analisis campuran tidak menyala");
  if (!body.includes("🏆")) throw new Error("pemenang organik tidak terdeteksi");
  if (!body.includes("Vonis dikunci")) throw new Error("lock banner hilang padahal gate0 merah");
});
await page.screenshot({ path: SHOTS + "/04-instagram.png", fullPage: true });

// 6. Form post 60 detik
await check("form post: simpan post baru", async () => {
  await page.goto(BASE + "/instagram/post/baru");
  await page.fill('input[placeholder*="Renovasi molor"]', "[TES] Hook percobaan e2e");
  await page.selectOption("select", { index: 1 }); // tautkan ke eksperimen pertama (blocker #3)
  await page.click('button:has-text("Simpan & selesai")');
  await page.waitForURL("**/instagram", { timeout: 15000 });
  const body = await page.textContent("body");
  if (!body.includes("[TES] Hook percobaan e2e")) throw new Error("post baru tidak muncul di log");
});

// 7. Fit score form — live composite
await check("fit score: komposit live & simpan ide", async () => {
  await page.goto(BASE + "/skor/baru");
  await page.click('button:has-text("Ide konten baru")');
  await page.fill('input[placeholder*="Judul ide"]', "[TES] Reels edukasi budget 2BR");
  await page.click('button:has-text("Simpan skor")');
  await page.waitForURL("**/skor", { timeout: 15000 });
  const body = await page.textContent("body");
  if (!body.includes("[TES] Reels edukasi budget 2BR")) throw new Error("skor ide tidak tersimpan");
  if (!body.includes("Data belum cukup")) throw new Error("penjaga pred-vs-actual tidak tampil");
});
await page.screenshot({ path: SHOTS + "/05-skor.png", fullPage: true });

// 8. Kampanye — vonis terkunci (gate0 merah) tapi data tetap tampil
await check("kampanye: vonis terkunci + rantai biaya tampil", async () => {
  await page.goto(BASE + "/kampanye");
  const body = await page.textContent("body");
  if (!body.includes("Perbaiki akun dulu")) throw new Error("vonis kunci tidak tampil");
  if (!body.includes("CPQL")) throw new Error("rantai biaya tidak tampil");
  if (!body.includes("Ads Mgr klaim")) throw new Error("pembanding kejujuran tidak tampil");
});
await page.screenshot({ path: SHOTS + "/06-kampanye-terkunci.png", fullPage: true });

// 9. Buka gerbang: audit akun & tracking semua hijau → vonis kampanye hidup
await check("buka gerbang lalu kampanye memberi vonis nyata", async () => {
  for (const slug of ["meta-account", "tracking"]) {
    await page.goto(`${BASE}/audit/${slug}/jalankan`);
    const buttons = await page.$$("text=Hijau — aman");
    for (const b of buttons) await b.click();
    await page.click('button:has-text("Simpan audit")');
    await page.waitForURL(`**/audit/${slug}`, { timeout: 15000 });
  }
  await page.goto(BASE + "/kampanye");
  const body = await page.textContent("body");
  if (body.includes("Vonis dikunci")) throw new Error("masih terkunci setelah semua audit hijau");
  if (!body.includes("JEBAKAN CHAT MURAH")) throw new Error("jebakan chat murah tidak terdeteksi di kampanye contoh");
  if (!body.includes("Scale kampanye")) throw new Error("kampanye sehat tidak dapat vonis scale");
  if (!body.includes("input manual (andal 60–90%)")) throw new Error("catatan keandalan tidak masuk KE DALAM kartu vonis (blocker #1)");
});
await page.screenshot({ path: SHOTS + "/07-kampanye-vonis.png", fullPage: true });

// 9b. Dashboard penuh setelah gerbang terbuka
await check("dashboard: 8 pertanyaan + pindah budget + follow-up + top5", async () => {
  await page.goto(BASE + "/");
  const body = await page.textContent("body");
  for (const label of ["Lead Berkualitas", "Nilai Closing", "Nilai Pipeline", "Top 5 Prioritas", "Apakah Instagram sehat", "Apakah iklan sehat", "Pipeline hari ini", "membuang uang", "layak jadi iklan", "Format konten terbaik", "follow-up HARI INI", "Metrik sekunder"]) {
    if (!body.includes(label)) throw new Error(`bagian hilang: ${label}`);
  }
  if (!body.includes("Pindah budget")) throw new Error("usulan pindah budget tidak muncul");
  if (!body.includes("Biaya/Survei")) throw new Error("tile biaya per survei hilang (blocker #6)");
  if (!body.includes("Biaya/Proposal")) throw new Error("tile biaya per proposal hilang (blocker #6)");
  if (!body.includes("Belum pernah ada cadangan")) throw new Error("pengingat cadangan hilang (blocker #8)");
  if (!body.includes("skor ")) throw new Error("skor kandidat iklan hilang di Q5 (blocker #9)");
});
await page.screenshot({ path: SHOTS + "/10-dashboard.png", fullPage: true });

// 9c. Lead Intelligence — triase
await check("leads: triase urgen + hot + probabilitas closing", async () => {
  await page.goto(BASE + "/leads");
  const body = await page.textContent("body");
  if (!body.includes("Urgen hari ini")) throw new Error("triase URGENT tidak muncul");
  if (!body.includes("Hot lead")) throw new Error("triase HOT tidak muncul");
  if (!body.includes("Prob. closing")) throw new Error("kolom probabilitas hilang");
  if (!body.includes("estimasi kasar")) throw new Error("label estimasi kasar hilang (kejujuran)");
  if (!body.includes("👑")) throw new Error("flag Tangani Noor sendiri hilang (blocker #5)");
});
await page.screenshot({ path: SHOTS + "/11-leads.png", fullPage: true });

// 9d. Kompetitor battle card
await check("kompetitor: battle card contoh tampil", async () => {
  await page.goto(BASE + "/kompetitor");
  await page.click("text=Studio Interior X");
  await page.waitForURL("**/kompetitor/**", { timeout: 15000 });
  await page.waitForSelector("text=Adaptasi untuk Zenaide", { timeout: 15000 });
  const body = await page.textContent("body");
  if (!body.includes("Adaptasi untuk Zenaide")) throw new Error("kolom adaptasi hilang");
  if (!body.includes("JANGAN meniru")) throw new Error("pagar anti-copy hilang");
});

// 9e. Eksperimen & library
await check("eksperimen: kartu 6 kolom + cakupan pilar; library terisi", async () => {
  await page.goto(BASE + "/eksperimen");
  const body = await page.textContent("body");
  if (!body.includes("Metrik sukses")) throw new Error("kolom metrik sukses hilang");
  if (!body.includes("Aturan setelah uji")) throw new Error("kolom aturan keputusan hilang");
  if (!body.includes("Post tertaut")) throw new Error("blok post tertaut hilang (blocker #3)");
  if (!body.includes("[TES] Hook percobaan e2e")) throw new Error("post yang ditautkan dari form tidak muncul di eksperimen");
  await page.goto(BASE + "/library");
  const body2 = await page.textContent("body");
  if (!body2.includes("budget bengkak")) throw new Error("pain point contoh hilang");
});

// 9g. Revenue War Room (laporan eksekutif) + Knowledge + Impor
await check("revenue war room: 10 bagian, bukti angka, corong bocor", async () => {
  await page.goto(BASE + "/laporan");
  const body = await page.textContent("body");
  for (const s of ["Apa yang bekerja", "Apa yang gagal", "lead berkualitas", "harus dimatikan", "layak di-scale", "layak diulang", "wajib di-follow-up", "corong bocor", "Noor kerjakan", "Top 3 prioritas", "menunggu owner"]) {
    if (!body.includes(s)) throw new Error(`bagian hilang: ${s}`);
  }
});
await page.screenshot({ path: SHOTS + "/13-war-room-report.png", fullPage: true });

await check("knowledge: saran dari data + simpan learning", async () => {
  await page.goto(BASE + "/knowledge");
  const body = await page.textContent("body");
  if (!body.includes("Saran dari data")) throw new Error("blok saran hilang");
  if (!body.includes("BEFORE_AFTER")) throw new Error("saran pilar (n≥2) tidak muncul dari data contoh");
  if (!body.includes("layak diulang")) throw new Error("saran pola kampanye scale tidak muncul");
  if (!body.includes("Gugur jika:")) throw new Error("saran tidak membawa falsifier (Fase A)");
  await page.click('button:has-text("Simpan sebagai learning")');
  await page.waitForTimeout(2500);
  await page.goto(BASE + "/knowledge");
  const body2 = await page.textContent("body");
  if (!body2.includes("Lemah (kejadian tunggal / sampel kecil) (1)") && !body2.includes("sampel kecil) (1)"))
    throw new Error("learning tidak tersimpan sebagai LEMAH");
});

await check("knowledge fase A: provenance, ledger bukti, kontradiksi, titik buta", async () => {
  const body = await page.textContent("body");
  if (!body.includes("Titik Buta (Capture-Gap Register)")) throw new Error("register titik buta hilang");
  if (!body.includes("Hasil proyek terkirim")) throw new Error("gap hasil proyek (penghalang FAKTA) hilang");
  if (!body.includes("Kenapa percaya ini?")) throw new Error("expander provenance hilang");
  // Buka provenance learning yang baru disimpan — harus ada revisi kelahiran + bukti awal.
  await page.click('summary:has-text("Kenapa percaya ini?")');
  const det = await page.textContent("body");
  if (!det.includes("lahir sebagai")) throw new Error("revisi kelahiran tidak tercatat");
  if (!det.includes("Ledger bukti (1)")) throw new Error("bukti awal (data pendukung) tidak masuk ledger");
  if (!det.includes("Gugur jika:")) throw new Error("falsifier learning tersimpan tidak tampil");
  // Catat bukti MENENTANG → kontradiksi terbuka HARUS terlihat; status TIDAK boleh turun otomatis.
  await page.selectOption('select[name="polarity"]', "MENENTANG");
  await page.fill('textarea[name="note"]', "Post BEFORE_AFTER minggu ini: 0 lead berkualitas dari 3 post.");
  await page.click('button:has-text("Catat bukti")');
  await page.waitForTimeout(2500);
  await page.goto(BASE + "/knowledge");
  const body3 = await page.textContent("body");
  if (!body3.includes("kontradiksi terbuka")) throw new Error("bukti menentang tidak memunculkan kontradiksi terbuka");
  if (!body3.includes("sampel kecil) (1)")) throw new Error("status berubah otomatis — Fase A dilarang mengubah status");
});

await check("impor: template unduh + ekspor CSV jalan", async () => {
  const tpl = await page.request.get(BASE + "/api/template/ads-metric");
  if (!(await tpl.text()).includes("kampanye,tanggal,spend_ribu")) throw new Error("template ads rusak");
  const exp = await page.request.get(BASE + "/api/export/lead");
  const csv = await exp.text();
  if (!csv.includes("nama,sumber,status")) throw new Error("header ekspor lead rusak");
  if (!csv.includes("Bu Sari")) throw new Error("data lead tidak ikut terekspor");
});

// 9h. Pelatih Instagram
await check("pelatih instagram: rencana + diagnosa per post + prinsip publik", async () => {
  await page.goto(BASE + "/instagram/coach");
  const body = await page.textContent("body");
  if (!body.includes("Rencana pelatih minggu ini")) throw new Error("rencana pelatih hilang");
  if (!body.includes("Tolok ukur akun")) throw new Error("tolok ukur akun hilang");
  if (!body.includes("median akun")) throw new Error("diagnosa per post tanpa pembanding median");
  if (!body.includes("Mosseri")) throw new Error("prinsip publik bersumber hilang");
  if (!body.includes("bukan angka ajaib industri")) throw new Error("catatan kejujuran tolok ukur hilang");
});
await page.screenshot({ path: SHOTS + "/14-coach.png", fullPage: true });

// 9i. Arsitektur sumber data & kebijakan kebenaran
await check("impor: keandalan, kamus normalisasi, status konektor, screenshot", async () => {
  await page.goto(BASE + "/impor");
  const body = await page.textContent("body");
  for (const s of ["Keandalan per sumber", "Kamus normalisasi", "Status konektor", "Input dari screenshot", "OCR otomatis BELUM diaktifkan", "Google Sheet (andal 80–95%)", "TANPA mengubah logika bisnis"]) {
    if (!body.includes(s)) throw new Error(`bagian hilang: ${s}`);
  }
});

await check("panel kebenaran data: konflik sumber tampil di dashboard & kampanye", async () => {
  await page.goto(BASE + "/");
  const body = await page.textContent("body");
  if (!body.includes("Kebenaran Data")) throw new Error("panel kebenaran hilang di dashboard");
  if (!body.includes("Konflik data terdeteksi")) throw new Error("konflik seed (klaim Ads Manager > catatan) tidak tampil");
  if (!body.includes("TIDAK live")) throw new Error("penegasan data tidak live hilang");
  await page.goto(BASE + "/kampanye");
  const body2 = await page.textContent("body");
  if (!body2.includes("Konflik data terdeteksi")) throw new Error("konflik tidak tampil di permukaan keputusan budget");
});
await page.screenshot({ path: SHOTS + "/15-truth-panel.png", fullPage: true });

// 9j. Pilot 14 hari — kemajuan HANYA dari data nyata
await check("pilot: data contoh tidak dihitung, checklist & mulai pilot jalan", async () => {
  await page.goto(BASE + "/pilot");
  const body = await page.textContent("body");
  // 8 lead CONTOH terpasang, tapi kriteria lead harus tetap 0/50 — bukti data contoh tidak dihitung.
  if (!body.includes("0/50")) throw new Error("data contoh ikut terhitung sebagai kemajuan pilot (lead bukan 0/50)");
  if (!body.includes("dinilai Noor di hari 14")) throw new Error("kriteria manual Noor hilang");
  if (!body.includes("Rutinitas HARIAN")) throw new Error("checklist harian hilang");
  if (!body.includes("Rutinitas MINGGUAN")) throw new Error("checklist mingguan hilang");
  if (!body.includes("tuning ambang")) throw new Error("bagian hari 14 hilang");
  await page.click('button:has-text("Mulai pilot hari ini")');
  await page.waitForSelector("text=Hari ke-1", { timeout: 15000 });
});
await page.screenshot({ path: SHOTS + "/16-pilot.png", fullPage: true });

await check("pilot lock mode: banner kunci Fase B + gerbang 8 syarat", async () => {
  const body = await page.textContent("body");
  if (!body.includes("Fase B belum boleh dimulai. Sistem masih mengumpulkan bukti nyata."))
    throw new Error("pesan kunci Fase B hilang dari layar pilot");
  if (!body.includes("Jangan naikkan belief atau threshold")) throw new Error("kalimat larangan promosi belief hilang");
  if (!body.includes("Gerbang Fase B")) throw new Error("kartu gerbang Fase B hilang");
  if (!body.includes("Pola berulang dari data nyata")) throw new Error("syarat pola berulang (ledger Fase A) hilang");
  if (!body.includes("Data contoh dihapus")) throw new Error("syarat bersih data contoh hilang");
  // Banner yang sama harus mengunci layar Knowledge dari promosi belief.
  await page.goto(BASE + "/knowledge");
  const kb = await page.textContent("body");
  if (!kb.includes("Fase B belum boleh dimulai")) throw new Error("banner kunci tidak tampil di Knowledge");
});

// 10. War room — compare + komit keputusan
await check("war room: compare + komit 2 keputusan", async () => {
  await page.goto(BASE + "/war-room");
  const body = await page.textContent("body");
  if (!body.includes("Lead berkualitas")) throw new Error("metrik utama tidak tampil");
  await page.fill('input[placeholder*="Alasan"]', "Kampanye kitchen set kena jebakan chat murah — ganti penawaran");
  await page.click('button:has-text("Komit keputusan minggu ini")');
  await page.waitForTimeout(3000);
  await page.goto(BASE + "/war-room");
  const body2 = await page.textContent("body");
  if (!body2.includes("1/5 terpakai")) throw new Error("keputusan tidak tersimpan ke sesi");
});
await page.screenshot({ path: SHOTS + "/08-war-room.png", fullPage: true });

// 11. Top 5 penuh & keputusan war room tersimpan (dashboard memotong di 5 — by design)
await check("top 5 penuh; keputusan war room tercatat di sesi", async () => {
  await page.goto(BASE + "/");
  const body = await page.textContent("body");
  if (!body.includes("Top 5 Prioritas")) throw new Error("blok top 5 hilang");
  if (!body.includes("Pindahkan budget")) throw new Error("prioritas pindah budget hilang");
  await page.goto(BASE + "/war-room");
  const wr = await page.textContent("body");
  if (!wr.includes("jebakan chat murah")) throw new Error("keputusan tidak tersimpan di sesi war room");
});
await page.screenshot({ path: SHOTS + "/09-home-final.png", fullPage: true });

// 12. Infrastructure hardening: peringatan sensitif, pusat cadangan, konfirmasi hapus contoh
await check("hardening: notifikasi sensitif di layar rawan + jujur soal mode auth", async () => {
  for (const path of ["/leads", "/kampanye", "/war-room", "/knowledge", "/pilot", "/impor"]) {
    await page.goto(BASE + path);
    const body = await page.textContent("body");
    if (!body.includes("data bisnis sensitif")) throw new Error(`peringatan sensitif hilang di ${path}`);
    // Suite jalan dengan auth AKTIF — teks harus versi login owner, bukan versi terbuka.
    if (!body.includes("login owner")) throw new Error(`teks mode login-aktif hilang di ${path}`);
    if (body.includes("belum dikonfigurasi")) throw new Error(`teks mode terbuka salah tampil di ${path}`);
  }
});

await check("hardening: pusat cadangan + unduhan DB valid + peringatan restore", async () => {
  await page.goto(BASE + "/impor");
  const body = await page.textContent("body");
  for (const s of ["Pusat Cadangan", "Unduh file database", "Peringatan restore", "Jangan dibagikan", "Rutinitas mingguan"]) {
    if (!body.includes(s)) throw new Error(`bagian hilang: ${s}`);
  }
  const resp = await page.request.get(BASE + "/api/backup/db");
  if (resp.status() !== 200) throw new Error(`unduhan DB gagal: HTTP ${resp.status()}`);
  const buf = await resp.body();
  if (!buf.subarray(0, 15).toString("utf8").startsWith("SQLite format 3"))
    throw new Error("file unduhan bukan database SQLite yang valid");
  // Unduhan cadangan harus menstempel waktu cadangan (banner tagihan hilang).
  await page.goto(BASE + "/impor");
  const after = await page.textContent("body");
  if (!after.includes("Cadangan terakhir")) throw new Error("stempel cadangan terakhir tidak tercatat");
});

await check("hardening: hapus data contoh butuh konfirmasi & transparan jumlah baris", async () => {
  await page.goto(BASE + "/");
  const body = await page.textContent("body");
  if (!body.includes("baris data contoh")) throw new Error("hitungan baris contoh hilang");
  if (!body.includes("Saya paham")) throw new Error("centang konfirmasi hilang");
  const confirmBox = await page.$('form input[type="checkbox"][name="confirm"][required]');
  if (!confirmBox) throw new Error("checkbox konfirmasi wajib tidak ditemukan");
});

// 13. Logout — mengunci kembali seluruh aplikasi (dijalankan TERAKHIR).
await check("auth: logout mengunci kembali halaman & API", async () => {
  await page.goto(BASE + "/");
  await page.click('button:has-text("Keluar")');
  await page.waitForURL(/\/login/, { timeout: 15000 });
  await page.goto(BASE + "/leads");
  await page.waitForURL(/\/login/, { timeout: 15000 });
  const r = await page.request.get(BASE + "/api/backup/db");
  if (r.status() !== 401) throw new Error(`setelah logout, backup DB harus 401, dapat ${r.status()}`);
});

await browser.close();
console.log(results.join("\n"));
const fails = results.filter((r) => r.startsWith("FAIL"));
process.exit(fails.length ? 1 : 0);
