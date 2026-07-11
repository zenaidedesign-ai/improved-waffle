// Buat hash password owner untuk Auth Tahap 1.
// Pakai:  node scripts/set-owner-password.mjs "PasswordKuatAnda"
// Hasilnya DISALIN MANUAL ke file .env.local (file itu di-gitignore — jangan pernah
// commit isinya, jangan kirim lewat chat). Password aslinya tidak disimpan di mana pun.

import { randomBytes, scryptSync } from "node:crypto";

const pw = process.argv[2];
if (!pw || pw.length < 8) {
  console.error('Password minimal 8 karakter.\nPakai: node scripts/set-owner-password.mjs "PasswordKuatAnda"');
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(pw, salt, 32).toString("hex");

console.log("Salin DUA baris ini ke file .env.local di folder proyek, lalu restart aplikasi:\n");
console.log(`ZENAIDE_AUTH_HASH=scrypt:${salt}:${hash}`);
console.log(`ZENAIDE_SESSION_SECRET=${randomBytes(32).toString("hex")}`);
console.log("\nCatatan: mengganti ZENAIDE_SESSION_SECRET kapan pun akan MENCABUT semua sesi login yang ada.");
