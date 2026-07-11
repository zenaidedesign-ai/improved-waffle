// Pagar auth Tahap 1 — SATU pintu untuk seluruh aplikasi.
// - ZENAIDE_AUTH_HASH tidak di-set ⇒ MODE TANPA LOGIN (lolos semua, banner memperingatkan,
//   deployment HOLD). Tidak ada keamanan palsu: mode ini dinyatakan terang-terangan.
// - Di-set ⇒ semua halaman & API butuh cookie sesi valid, kecuali /login dan aset statis.
//   Halaman tanpa sesi → redirect /login; API tanpa sesi → 401 JSON.

import { NextResponse, type NextRequest } from "next/server";
import { deriveSecret, SESSION_COOKIE, validateSessionToken } from "@/lib/authToken";

export async function middleware(req: NextRequest) {
  const secret = await deriveSecret();
  if (!secret) return NextResponse.next(); // mode tanpa login — lihat docs/AUTH-READINESS.md

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await validateSessionToken(secret, token, Date.now()))) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Perlu login." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
