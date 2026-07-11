// Token sesi ber-HMAC — HANYA Web Crypto, supaya aman dipakai di middleware
// (runtime edge maupun node) dan di server action. Token stateless:
// "v1.<kedaluwarsaEpochMs>.<hmac>". Logout = hapus cookie; mencabut SEMUA sesi
// = ganti ZENAIDE_SESSION_SECRET (didokumentasikan di docs/AUTH-READINESS.md).

export const SESSION_COOKIE = "zenaide_session";
export const SESSION_TTL_MS = 7 * 24 * 3600 * 1000; // 7 hari, sesuai rencana auth Tahap 1

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

/**
 * Rahasia penanda tangan sesi. null = auth TIDAK dikonfigurasi (mode tanpa login).
 * Prioritas: ZENAIDE_SESSION_SECRET eksplisit; kalau tidak ada, diturunkan dari
 * ZENAIDE_AUTH_HASH via SHA-256 — konsekuensinya: ganti password = semua sesi gugur.
 */
export async function deriveSecret(): Promise<string | null> {
  const hash = process.env.ZENAIDE_AUTH_HASH;
  if (!hash) return null;
  const explicit = process.env.ZENAIDE_SESSION_SECRET;
  if (explicit) return explicit;
  return b64url(await crypto.subtle.digest("SHA-256", enc.encode("zenaide-session:" + hash)));
}

export async function createSessionToken(secret: string, nowMs: number): Promise<string> {
  const exp = nowMs + SESSION_TTL_MS;
  return `v1.${exp}.${await hmac(secret, `v1.${exp}`)}`;
}

export async function validateSessionToken(secret: string, token: string, nowMs: number): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || nowMs >= exp) return false;
  const expected = await hmac(secret, `v1.${exp}`);
  // Banding lewat HMAC ulang — membuat perbandingan string tidak bisa ditambang lewat timing.
  return (await hmac(secret, parts[2])) === (await hmac(secret, expected));
}
