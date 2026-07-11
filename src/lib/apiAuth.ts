// Lapis kedua auth untuk route API paling sensitif (cadangan DB, ekspor CSV).
// Middleware sudah memagari semua /api — tapi salah-konfigurasi matcher adalah
// lubang klasik, jadi route yang bisa MENGELUARKAN data memeriksa sesinya sendiri.

import { cookies } from "next/headers";
import { deriveSecret, SESSION_COOKIE, validateSessionToken } from "@/lib/authToken";

/** true = boleh lanjut (sesi valid, ATAU mode tanpa login yang dinyatakan terbuka). */
export async function apiSessionValid(): Promise<boolean> {
  const secret = await deriveSecret();
  if (!secret) return true; // mode tanpa login — banner & docs sudah jujur soal ini
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return !!token && (await validateSessionToken(secret, token, Date.now()));
}
