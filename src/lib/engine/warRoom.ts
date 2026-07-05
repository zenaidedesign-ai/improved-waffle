// War Room Mingguan — perbandingan minggu-vs-minggu.
// Metrik UTAMA dulu (lead berkualitas, survei, proposal, nilai pipeline),
// baru diagnostik (reach non-follower, saves/shares, klik WA).

export interface WeekMetrics {
  qualifiedLeads: number;
  surveys: number;
  proposals: number;
  closingValueJuta: number; // nilai proyek CLOSING_MENANG
  pipelineValueJuta: number;
  // diagnostik
  nonFollowerReachPct: number | null;
  saves: number;
  shares: number;
  waClicks: number;
  postsPublished: number;
  adSpendRibu: number;
}

export interface CompareRow {
  key: string;
  label: string;
  kind: "UTAMA" | "DIAGNOSTIK";
  thisWeek: number | null;
  lastWeek: number | null;
  deltaPct: number | null; // null kalau pembanding tidak ada
  direction: "NAIK" | "TURUN" | "SAMA" | "BARU";
}

function row(
  key: string,
  label: string,
  kind: CompareRow["kind"],
  thisWeek: number | null,
  lastWeek: number | null,
): CompareRow {
  if (thisWeek === null && lastWeek === null)
    return { key, label, kind, thisWeek, lastWeek, deltaPct: null, direction: "SAMA" };
  if (lastWeek === null || lastWeek === 0) {
    return {
      key, label, kind, thisWeek, lastWeek,
      deltaPct: null,
      direction: (thisWeek ?? 0) > 0 ? "BARU" : "SAMA",
    };
  }
  const t = thisWeek ?? 0;
  const deltaPct = Math.round(((t - lastWeek) / lastWeek) * 100);
  return {
    key, label, kind, thisWeek, lastWeek, deltaPct,
    direction: deltaPct > 0 ? "NAIK" : deltaPct < 0 ? "TURUN" : "SAMA",
  };
}

export function buildWeeklyCompare(thisWeek: WeekMetrics, lastWeek: WeekMetrics | null): CompareRow[] {
  const l = lastWeek;
  return [
    row("qualifiedLeads", "Lead berkualitas", "UTAMA", thisWeek.qualifiedLeads, l?.qualifiedLeads ?? null),
    row("surveys", "Survei terjadwal/selesai", "UTAMA", thisWeek.surveys, l?.surveys ?? null),
    row("proposals", "Proposal terkirim", "UTAMA", thisWeek.proposals, l?.proposals ?? null),
    row("closingValueJuta", "Nilai closing (jt)", "UTAMA", thisWeek.closingValueJuta, l?.closingValueJuta ?? null),
    row("pipelineValueJuta", "Nilai pipeline (jt)", "UTAMA", thisWeek.pipelineValueJuta, l?.pipelineValueJuta ?? null),
    row("nonFollowerReachPct", "% reach non-follower", "DIAGNOSTIK", thisWeek.nonFollowerReachPct, l?.nonFollowerReachPct ?? null),
    row("saves", "Saves", "DIAGNOSTIK", thisWeek.saves, l?.saves ?? null),
    row("shares", "Shares", "DIAGNOSTIK", thisWeek.shares, l?.shares ?? null),
    row("waClicks", "Klik WA dari konten", "DIAGNOSTIK", thisWeek.waClicks, l?.waClicks ?? null),
    row("postsPublished", "Post tayang", "DIAGNOSTIK", thisWeek.postsPublished, l?.postsPublished ?? null),
    row("adSpendRibu", "Spend iklan (rb)", "DIAGNOSTIK", thisWeek.adSpendRibu, l?.adSpendRibu ?? null),
  ];
}

/**
 * Awal minggu = Senin 00:00 WIB (Asia/Jakarta, UTC+7 tanpa DST) — konsisten di
 * seluruh app, tidak peduli timezone server. Mengembalikan instan UTC yang
 * bertepatan dengan Senin 00:00 WIB.
 */
const WIB_OFFSET_MS = 7 * 3600 * 1000;

export function weekStartOf(d: Date): Date {
  const wib = new Date(d.getTime() + WIB_OFFSET_MS);
  const day = wib.getUTCDay(); // 0 = Minggu (dalam kerangka WIB)
  const diff = day === 0 ? 6 : day - 1;
  wib.setUTCDate(wib.getUTCDate() - diff);
  wib.setUTCHours(0, 0, 0, 0);
  return new Date(wib.getTime() - WIB_OFFSET_MS);
}
