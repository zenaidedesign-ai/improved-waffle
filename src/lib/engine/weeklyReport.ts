// Revenue War Room (Phase 10) — laporan eksekutif mingguan.
// Nada: langsung, senior, fokus revenue. Aktivitas ≠ kemajuan.
// Semua klaim dari data; bagian tanpa data bilang begitu, bukan dikarang.

import type { CampaignRow } from "./adsRescue";
import type { FollowUpItem } from "./leadTriage";
import type { PriorityItem } from "./priorities";

export interface FunnelCounts {
  chats: number; // semua lead masuk
  qualified: number;
  surveys: number;
  proposals: number;
  closings: number;
}

export interface FunnelLeak {
  insufficient: boolean;
  stage: "KUALIFIKASI" | "SURVEI" | "PROPOSAL" | "CLOSING" | null;
  ratePct: number | null;
  explanation: string;
}

const MIN_DENOM = 5; // di bawah ini, klaim kebocoran = tebakan

/** Titik bocor corong = konversi antar-tahap terendah dengan penyebut cukup. */
export function detectFunnelLeak(f: FunnelCounts): FunnelLeak {
  const stages: Array<{
    stage: FunnelLeak["stage"];
    num: number;
    denom: number;
    fix: string;
  }> = [
    {
      stage: "KUALIFIKASI",
      num: f.qualified,
      denom: f.chats,
      fix: "Chat banyak, sedikit yang berkualitas — masalah penawaran/audiens atau skrip pembuka WA.",
    },
    {
      stage: "SURVEI",
      num: f.surveys,
      denom: f.qualified,
      fix: "Lead berkualitas tidak jadi survei — masalah kecepatan & disiplin follow-up, atau ajakan survei kurang tegas.",
    },
    {
      stage: "PROPOSAL",
      num: f.proposals,
      denom: f.surveys,
      fix: "Survei tidak berubah jadi proposal — periksa kualitas survei dan kecepatan pembuatan proposal.",
    },
    {
      stage: "CLOSING",
      num: f.closings,
      denom: f.proposals,
      fix: "Proposal tidak closing — masalah harga/negosiasi/keberatan yang tidak terjawab.",
    },
  ];

  const eligible = stages.filter((s) => s.denom >= MIN_DENOM);
  if (eligible.length === 0) {
    return {
      insufficient: true,
      stage: null,
      ratePct: null,
      explanation: `Belum cukup data untuk menilai kebocoran corong (butuh minimal ${MIN_DENOM} di satu tahap). Sistem tidak menebak.`,
    };
  }
  const worst = eligible.reduce((a, b) =>
    a.num / a.denom <= b.num / b.denom ? a : b,
  );
  const ratePct = Math.round((worst.num / worst.denom) * 100);
  return {
    insufficient: false,
    stage: worst.stage,
    ratePct,
    explanation: `Bocor terbesar di tahap ${worst.stage?.toLowerCase()}: hanya ${ratePct}% (${worst.num}/${worst.denom}) yang lolos. ${worst.fix}`,
  };
}

export interface BestWorstCampaign {
  best: CampaignRow | null;
  worst: CampaignRow | null;
  note: string;
}

/** Kampanye terbaik/terburuk berdasar CPQL — hanya yang datanya cukup. */
export function pickBestWorstCampaigns(rows: CampaignRow[]): BestWorstCampaign {
  const judged = rows.filter(
    (r) => r.verdict.decision !== "TAHAN_DATA_BELUM_CUKUP" && !r.verdict.lockedByGate,
  );
  if (judged.length === 0) {
    return { best: null, worst: null, note: "Belum ada kampanye dengan data cukup untuk dinilai." };
  }
  const withCpql = judged.filter((r) => r.cpqlRibu !== null);
  const best = withCpql.length
    ? withCpql.reduce((a, b) => (a.cpqlRibu! <= b.cpqlRibu! ? a : b))
    : null;
  // Terburuk: CPQL termahal, atau spend tanpa satu pun lead berkualitas.
  const zeroQualified = judged.filter((r) => r.qualifiedLeads === 0 && r.spendRibu > 0);
  const worst = zeroQualified.length
    ? zeroQualified.reduce((a, b) => (a.spendRibu >= b.spendRibu ? a : b))
    : withCpql.length > 1
      ? withCpql.reduce((a, b) => (a.cpqlRibu! >= b.cpqlRibu! ? a : b))
      : null;
  return {
    best,
    worst: worst && best && worst.id === best.id ? null : worst,
    note: "",
  };
}

export interface ReportItem {
  text: string;
  evidence: string; // angka pendukung — setiap klaim wajib bawa bukti
}

export interface WorkedFailedInput {
  scaleCampaigns: CampaignRow[];
  killCampaigns: CampaignRow[];
  cheapChatCampaigns: CampaignRow[];
  winners: Array<{ hook: string; reasons: string }>;
  qualifiedThisWeek: number;
  qualifiedLastWeek: number;
  closingValueJutaThisWeek: number;
  trendDirection: string; // NAIK | TURUN | DATAR | DATA_KURANG
  ghostingCount: number;
  urgentCount: number;
}

export function buildWorkedFailed(i: WorkedFailedInput): { worked: ReportItem[]; failed: ReportItem[] } {
  const worked: ReportItem[] = [];
  const failed: ReportItem[] = [];

  for (const c of i.scaleCampaigns)
    worked.push({ text: `Kampanye "${c.name}" layak scale`, evidence: `CPQL Rp ${c.cpqlRibu} rb, ${c.qualifiedLeads} lead berkualitas` });
  for (const w of i.winners)
    worked.push({ text: `Konten "${w.hook.slice(0, 60)}" jadi pemenang organik`, evidence: w.reasons });
  if (i.closingValueJutaThisWeek > 0)
    worked.push({ text: "Ada closing minggu ini", evidence: `Rp ${i.closingValueJutaThisWeek} jt` });
  if (i.qualifiedThisWeek > i.qualifiedLastWeek && i.qualifiedLastWeek > 0)
    worked.push({ text: "Lead berkualitas naik dibanding minggu lalu", evidence: `${i.qualifiedLastWeek} → ${i.qualifiedThisWeek}` });

  for (const c of i.killCampaigns)
    failed.push({ text: `Kampanye "${c.name}" membakar uang`, evidence: `spend Rp ${c.spendRibu} rb, ${c.qualifiedLeads} lead berkualitas` });
  for (const c of i.cheapChatCampaigns)
    failed.push({ text: `Kampanye "${c.name}" kena jebakan chat murah`, evidence: c.verdict.explanation.split(".")[0] });
  if (i.trendDirection === "TURUN")
    failed.push({ text: "Reach non-follower menurun", evidence: "lihat tren snapshot mingguan" });
  if (i.qualifiedThisWeek < i.qualifiedLastWeek)
    failed.push({ text: "Lead berkualitas turun dibanding minggu lalu", evidence: `${i.qualifiedLastWeek} → ${i.qualifiedThisWeek}` });
  if (i.ghostingCount > 0)
    failed.push({ text: `${i.ghostingCount} lead ghosting/berisiko ghosting`, evidence: "lihat Lead Intelligence" });

  if (worked.length === 0)
    worked.push({ text: "Tidak ada kemenangan berarti yang terukur minggu ini", evidence: "posting dan spend BUKAN kemajuan — hasilnya yang dihitung" });
  if (failed.length === 0 && i.qualifiedThisWeek === 0)
    failed.push({ text: "Nol lead berkualitas minggu ini", evidence: "seluruh aktivitas minggu ini tidak menghasilkan pipeline" });

  return { worked, failed };
}

export interface OwnerActionInput {
  lockRepair: string | null; // item audit yang harus dibereskan
  killCampaigns: CampaignRow[];
  scaleCampaigns: CampaignRow[];
  moveBudgetText: string | null;
  urgentFollowUps: FollowUpItem[];
  winners: Array<{ hook: string }>;
  leak: FunnelLeak;
  openDecisions: number;
}

/** "Yang harus Noor kerjakan minggu depan" — daftar aksi, bukan wacana. */
export function buildOwnerActions(i: OwnerActionInput): string[] {
  const actions: string[] = [];
  if (i.lockRepair) actions.push(i.lockRepair);
  for (const c of i.killCampaigns) actions.push(`Matikan "${c.name}" — hentikan pendarahan budget.`);
  if (i.moveBudgetText) actions.push(i.moveBudgetText);
  for (const c of i.scaleCampaigns)
    actions.push(`Naikkan budget "${c.name}" bertahap +25% dan pantau CPQL tetap ≤ target.`);
  for (const f of i.urgentFollowUps.slice(0, 3))
    actions.push(`Follow-up ${f.name} — ${f.reason}`);
  if (!i.leak.insufficient && i.leak.stage)
    actions.push(`Perbaiki bocor corong di tahap ${i.leak.stage.toLowerCase()} (${i.leak.ratePct}%).`);
  for (const w of i.winners.slice(0, 1))
    actions.push(`Uji pemenang organik "${w.hook.slice(0, 50)}" sebagai iklan (buat kartu eksperimen).`);
  if (i.openDecisions > 0)
    actions.push(`Selesaikan ${i.openDecisions} keputusan War Room yang masih terbuka — keputusan yang tidak dieksekusi = tidak pernah diputuskan.`);
  return actions;
}

export function top3(priorities: PriorityItem[]): PriorityItem[] {
  return priorities.slice(0, 3);
}
