// Aritmetika waktu — SATU sumber kebenaran (guardrails §2.8).
// Semua hitungan hari/minggu bisnis memakai WIB (Asia/Jakarta, UTC+7):
// pergantian hari mengikuti tengah malam WIB, bukan UTC.

export const DAY_MS = 24 * 3600 * 1000;
export const WIB_MS = 7 * 3600 * 1000;

/** Umur dalam hari penuh: berapa hari sejak `then` pada saat `now`. Tidak pernah negatif. */
export function ageDays(then: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / DAY_MS));
}

/** Nomor hari kalender WIB (untuk membandingkan "hari yang sama" lintas zona). */
export function dayFloorWIB(d: Date): number {
  return Math.floor((d.getTime() + WIB_MS) / DAY_MS);
}

/** Awal minggu bisnis: Senin 00:00 WIB dari tanggal yang diberikan. */
export function weekStartOf(d: Date): Date {
  const wib = new Date(d.getTime() + WIB_MS);
  const day = wib.getUTCDay(); // 0=Minggu … 1=Senin
  const diff = (day + 6) % 7; // hari sejak Senin
  const mondayWib = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() - diff);
  return new Date(mondayWib - WIB_MS);
}
