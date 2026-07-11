import { afterEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/auth";
import {
  createSessionToken,
  deriveSecret,
  SESSION_TTL_MS,
  validateSessionToken,
} from "../src/lib/authToken";

const NOW = 1_760_000_000_000;

describe("password owner — scrypt, tanpa plaintext", () => {
  it("hash lalu verifikasi: benar diterima, salah ditolak", () => {
    const stored = hashPassword("rahasia-owner-123");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(stored).not.toContain("rahasia-owner-123"); // plaintext tidak pernah tersimpan
    expect(verifyPassword("rahasia-owner-123", stored)).toBe(true);
    expect(verifyPassword("rahasia-owner-124", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });
  it("dua hash untuk password sama berbeda (salt acak), keduanya valid", () => {
    const a = hashPassword("password-sama");
    const b = hashPassword("password-sama");
    expect(a).not.toBe(b);
    expect(verifyPassword("password-sama", a)).toBe(true);
    expect(verifyPassword("password-sama", b)).toBe(true);
  });
  it("nilai tersimpan rusak/format asing ⇒ ditolak, bukan error", () => {
    expect(verifyPassword("apa pun", "bukan-format")).toBe(false);
    expect(verifyPassword("apa pun", "scrypt::")).toBe(false);
    expect(verifyPassword("apa pun", undefined)).toBe(false);
  });
});

describe("token sesi — HMAC, kedaluwarsa, anti-oprek", () => {
  it("token valid diterima sebelum kedaluwarsa, ditolak sesudahnya (7 hari)", async () => {
    const t = await createSessionToken("secret-a", NOW);
    expect(await validateSessionToken("secret-a", t, NOW + 1000)).toBe(true);
    expect(await validateSessionToken("secret-a", t, NOW + SESSION_TTL_MS - 1)).toBe(true);
    expect(await validateSessionToken("secret-a", t, NOW + SESSION_TTL_MS)).toBe(false);
  });
  it("token dioprek (ubah kedaluwarsa / tanda tangan / rahasia lain) ⇒ ditolak", async () => {
    const t = await createSessionToken("secret-a", NOW);
    const [v, exp, sig] = t.split(".");
    expect(await validateSessionToken("secret-a", `${v}.${Number(exp) + 999999}.${sig}`, NOW)).toBe(false);
    expect(await validateSessionToken("secret-a", `${v}.${exp}.${sig}x`, NOW)).toBe(false);
    expect(await validateSessionToken("secret-b", t, NOW)).toBe(false);
    expect(await validateSessionToken("secret-a", "sampah", NOW)).toBe(false);
  });
});

describe("deriveSecret — sumber kebenaran mode auth", () => {
  const saved = {
    hash: process.env.ZENAIDE_AUTH_HASH,
    secret: process.env.ZENAIDE_SESSION_SECRET,
  };
  afterEach(() => {
    if (saved.hash === undefined) delete process.env.ZENAIDE_AUTH_HASH;
    else process.env.ZENAIDE_AUTH_HASH = saved.hash;
    if (saved.secret === undefined) delete process.env.ZENAIDE_SESSION_SECRET;
    else process.env.ZENAIDE_SESSION_SECRET = saved.secret;
  });

  it("tanpa ZENAIDE_AUTH_HASH ⇒ null (mode tanpa login, dinyatakan terbuka)", async () => {
    delete process.env.ZENAIDE_AUTH_HASH;
    delete process.env.ZENAIDE_SESSION_SECRET;
    expect(await deriveSecret()).toBeNull();
  });
  it("dengan hash ⇒ rahasia turunan stabil; ganti hash ⇒ semua sesi lama gugur", async () => {
    delete process.env.ZENAIDE_SESSION_SECRET;
    process.env.ZENAIDE_AUTH_HASH = "scrypt:aa:bb";
    const s1 = await deriveSecret();
    process.env.ZENAIDE_AUTH_HASH = "scrypt:cc:dd";
    const s2 = await deriveSecret();
    expect(s1).not.toBeNull();
    expect(s1).not.toBe(s2);
    const token = await createSessionToken(s1!, NOW);
    expect(await validateSessionToken(s2!, token, NOW)).toBe(false);
  });
  it("ZENAIDE_SESSION_SECRET eksplisit menang atas turunan", async () => {
    process.env.ZENAIDE_AUTH_HASH = "scrypt:aa:bb";
    process.env.ZENAIDE_SESSION_SECRET = "rahasia-eksplisit";
    expect(await deriveSecret()).toBe("rahasia-eksplisit");
  });
});
