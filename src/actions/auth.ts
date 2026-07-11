"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, verifyPassword } from "@/lib/auth";
import { createSessionToken, deriveSecret, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/authToken";

// Rem darurat sederhana: 5 kali salah berturut ⇒ jeda 15 menit.
// In-memory (hilang saat restart) — cukup untuk alat internal satu-owner; jujur, bukan WAF.
const guard = { fails: 0, lockedUntil: 0 };

export async function login(formData: FormData): Promise<void> {
  if (!authConfigured()) redirect("/"); // mode tanpa login — tidak ada yang perlu dibuka

  const now = Date.now();
  if (now < guard.lockedUntil) redirect("/login?error=terkunci");

  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    guard.fails += 1;
    if (guard.fails >= 5) {
      guard.fails = 0;
      guard.lockedUntil = now + 15 * 60_000;
    }
    redirect("/login?error=salah");
  }

  guard.fails = 0;
  guard.lockedUntil = 0;
  const secret = (await deriveSecret())!;
  const token = await createSessionToken(secret, now);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
