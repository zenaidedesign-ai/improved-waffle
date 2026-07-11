// Auth Tahap 1 — verifikasi password owner (node:crypto scrypt, tanpa dependensi baru).
// Password TIDAK PERNAH disimpan: yang disimpan hanya hash-nya di env var
// ZENAIDE_AUTH_HASH (format "scrypt:<saltHex>:<hashHex>"), dibuat lewat
// `node scripts/set-owner-password.mjs`. Jika env var tidak di-set, aplikasi
// berjalan MODE TANPA LOGIN — jujur, ditandai banner, dan deployment tetap HOLD.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function authConfigured(): boolean {
  return !!process.env.ZENAIDE_AUTH_HASH;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function verifyPassword(password: string, stored = process.env.ZENAIDE_AUTH_HASH): boolean {
  if (!stored || !password) return false;
  const [scheme, salt, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hashHex) return false;
  const want = Buffer.from(hashHex, "hex");
  const got = scryptSync(password, salt, 32);
  return want.length === got.length && timingSafeEqual(want, got);
}
