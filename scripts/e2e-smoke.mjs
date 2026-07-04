// Jalankan: reset DB (rm prisma/dev.db && npx prisma migrate deploy),
// start server BARU (npm run start -- -p 3100), lalu: node scripts/e2e-smoke.mjs
// E2E smoke test: muat data contoh, jalankan semua layar, ambil screenshot.
import { chromium } from "playwright-core";

const BASE = "http://localhost:3100";
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

// 1. Ruang Kendali kosong — semua gerbang belum diaudit, banner kunci tampil
await check("home: gerbang terkunci saat DB kosong", async () => {
  await page.goto(BASE + "/");
  await page.waitForSelector("text=Ruang Kendali");
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
});
await page.screenshot({ path: SHOTS + "/07-kampanye-vonis.png", fullPage: true });

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

// 11. Keputusan war room muncul di Ruang Kendali
await check("keputusan terbuka muncul di ruang kendali", async () => {
  await page.goto(BASE + "/");
  const body = await page.textContent("body");
  if (!body.includes("jebakan chat murah")) throw new Error("keputusan tidak muncul di antrian");
});
await page.screenshot({ path: SHOTS + "/09-home-final.png", fullPage: true });

await browser.close();
console.log(results.join("\n"));
const fails = results.filter((r) => r.startsWith("FAIL"));
process.exit(fails.length ? 1 : 0);
