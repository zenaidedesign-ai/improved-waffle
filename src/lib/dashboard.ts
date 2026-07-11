// Perakit Dashboard Intelijen Pemasaran — menjawab 8 pertanyaan eksekutif
// dari data nyata. Semua logika keputusan ada di engine; file ini hanya
// mengambil, memetakan, dan merakit.

import { assessCampaigns, getGateStatus, isLeadQualified, mapPostToInput } from "./data";
import { db } from "./db";
import { CONFIG } from "./domain/config";
import type { StatusLampu } from "./domain/enums";
import { compareCampaigns, type CampaignRow } from "./engine/adsRescue";
import { gateLock, type AuditAging, type GateLockResult } from "./engine/gates";
import { backupDue } from "./engine/dataTruth";
import { rankAdCandidates } from "./engine/verdicts";
import {
  bestFormat,
  contentMixAnalysis,
  detectOrganicWinners,
  nonFollowerTrend,
  type BestFormatResult,
  type TrendResult,
} from "./engine/igDiagnosis";
import { followUpQueue, type FollowUpItem } from "./engine/leadTriage";
import { buildTop5, type PriorityItem } from "./engine/priorities";
import type { VerdictProposal } from "./engine/types";
import { decideContentMix, decideIgWinner } from "./engine/verdicts";
import { DAY_MS, weekStartOf } from "./time";

// CampaignRow kini tinggal di engine/adsRescue — re-export demi kompatibilitas impor lama.
export type { CampaignRow } from "./engine/adsRescue";

export interface DashboardData {
  // Metrik utama (bulan berjalan)
  primary: {
    qualifiedLeads: number;
    surveys: number;
    proposals: number;
    closingValueJuta: number;
    pipelineValueJuta: number;
    cpqlRibu: number | null; // spend iklan bulan ini / lead berkualitas dari iklan
    costPerSurveyRibu: number | null; // spend iklan / survei dari lead iklan (bulan ini)
    costPerProposalRibu: number | null;
  };
  // Q1 & Q2
  gates: { gate0: StatusLampu | null; gate1: StatusLampu | null };
  lock: GateLockResult;
  igHealth: {
    status: StatusLampu | null;
    trend: TrendResult;
    lastNonFollowerPct: number | null;
    summary: string;
  };
  adsHealth: { status: StatusLampu | null; summary: string };
  // Q3
  pipelineByStatus: Array<{ status: string; count: number; valueJuta: number }>;
  // Q4
  wastingCampaigns: CampaignRow[];
  moveBudget: VerdictProposal | null;
  allCampaigns: CampaignRow[];
  // Q5 — diurut berdasar skor kandidat (heuristik pengurut, bukan prediksi ROI)
  winners: Array<{ postId: string; hook: string; verdict: VerdictProposal; candidateScore: number | null }>;
  winnersInsufficient: boolean;
  // Q6
  bestFormat: BestFormatResult;
  // Q7
  followUps: FollowUpItem[];
  // Q8
  top5: PriorityItem[];
  // Sekunder (sengaja di bawah)
  secondary: { reach30d: number | null; followers: number | null; impressions30d: number | null };
  hasAnyData: boolean;
  auditAging: Array<{ type: string; aging: AuditAging }>;
  backup: { due: boolean; message: string | null };
}

const ACTIVE_STATUSES = [
  "CHAT_BARU",
  "MERESPONS",
  "BERKUALITAS",
  "SURVEI_TERJADWAL",
  "SURVEI_SELESAI",
  "PROPOSAL_TERKIRIM",
  "NEGOSIASI",
];

export async function getDashboardData(now = new Date()): Promise<DashboardData> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const d30 = new Date(now.getTime() - 30 * DAY_MS);

  const [gates, leadsMonth, allLeads, posts, snapshots, campaigns, openDecisions, postCount, lastBackup] =
    await Promise.all([
      getGateStatus(),
      db.lead.findMany({ where: { createdAt: { gte: monthStart } } }),
      db.lead.findMany(),
      db.igPost.findMany({ orderBy: { postedAt: "desc" }, include: { leads: true } }),
      db.igAccountSnapshot.findMany({ orderBy: { weekStart: "desc" }, take: 12 }),
      db.campaign.findMany({ include: { metrics: true, leads: true } }),
      db.warRoomDecision.findMany({ where: { status: "TERBUKA" }, take: 10 }),
      db.igPost.count(),
      db.setting.findUnique({ where: { key: "backup.lastExportAt" } }),
    ]);

  const lock = gateLock(gates.gate0, gates.gate1);
  const inputs = posts.map(mapPostToInput);

  // ── Metrik utama (bulan berjalan) ──
  const monthSpendRibu = campaigns
    .flatMap((c) => c.metrics)
    .filter((m) => m.date >= monthStart)
    .reduce((s, m) => s + m.spendRibu, 0);
  const adsQualifiedMonth = leadsMonth.filter((l) => l.leadSource === "ADS" && isLeadQualified(l)).length;

  const primary = {
    qualifiedLeads: leadsMonth.filter(isLeadQualified).length,
    surveys: leadsMonth.filter((l) =>
      ["SURVEI_TERJADWAL", "SURVEI_SELESAI", "PROPOSAL_TERKIRIM", "NEGOSIASI", "CLOSING_MENANG"].includes(l.status),
    ).length,
    proposals: leadsMonth.filter((l) =>
      ["PROPOSAL_TERKIRIM", "NEGOSIASI", "CLOSING_MENANG"].includes(l.status),
    ).length,
    closingValueJuta: leadsMonth
      .filter((l) => l.status === "CLOSING_MENANG")
      .reduce((s, l) => s + l.estimatedValueJuta, 0),
    pipelineValueJuta: allLeads
      .filter((l) => ACTIVE_STATUSES.includes(l.status))
      .reduce((s, l) => s + l.estimatedValueJuta, 0),
    cpqlRibu:
      monthSpendRibu > 0 && adsQualifiedMonth > 0
        ? Math.round(monthSpendRibu / adsQualifiedMonth)
        : null,
    costPerSurveyRibu: (() => {
      const n = leadsMonth.filter((l) => l.leadSource === "ADS" &&
        ["SURVEI_TERJADWAL", "SURVEI_SELESAI", "PROPOSAL_TERKIRIM", "NEGOSIASI", "CLOSING_MENANG"].includes(l.status)).length;
      return monthSpendRibu > 0 && n > 0 ? Math.round(monthSpendRibu / n) : null;
    })(),
    costPerProposalRibu: (() => {
      const n = leadsMonth.filter((l) => l.leadSource === "ADS" &&
        ["PROPOSAL_TERKIRIM", "NEGOSIASI", "CLOSING_MENANG"].includes(l.status)).length;
      return monthSpendRibu > 0 && n > 0 ? Math.round(monthSpendRibu / n) : null;
    })(),
  };

  // ── Q1: Instagram sehat? ──
  const trend = nonFollowerTrend(
    snapshots
      .filter((s) => s.reachNonFollowerPct != null)
      .map((s) => ({ date: s.weekStart, pct: s.reachNonFollowerPct! })),
  );
  const lastNonFollowerPct = snapshots[0]?.reachNonFollowerPct ?? null;
  const igStatus: StatusLampu | null =
    gates.gate0 === null
      ? null
      : gates.gate0 === "MERAH"
        ? "MERAH"
        : trend.direction === "TURUN"
          ? "KUNING"
          : gates.gate0;
  const igSummary =
    gates.gate0 === null
      ? "Belum diaudit — jalankan Audit Akun Meta & Kelayakan Rekomendasi."
      : gates.gate0 === "MERAH"
        ? "Fondasi akun bermasalah — lihat rencana perbaikan di audit."
        : trend.direction === "TURUN"
          ? `Akun lolos audit tapi reach non-follower TURUN ${trend.slopePctPerWeek} poin/minggu.`
          : trend.direction === "DATA_KURANG"
            ? "Akun lolos audit; tren distribusi belum bisa dinilai (snapshot < 3 minggu)."
            : `Akun lolos audit; reach non-follower ${trend.direction === "NAIK" ? "naik" : "stabil"}.`;

  // ── Kampanye (Q2 & Q4) — penilaian BERSAMA dengan halaman kampanye ──
  const { rows: campaignRows, summaries } = assessCampaigns(campaigns, gates.gate0, gates.gate1, now);
  const moveBudget = lock.locked ? null : compareCampaigns(summaries);
  const wastingCampaigns = campaignRows.filter(
    (r) =>
      r.status === "AKTIF" &&
      (r.verdict.decision === "KILL_KAMPANYE" || r.verdict.decision === "GANTI_PENAWARAN"),
  );
  const activeCampaigns = campaignRows.filter((r) => r.status === "AKTIF");
  const adsStatus: StatusLampu | null =
    gates.gate1 === null || gates.gate0 === null
      ? null
      : lock.locked
        ? "MERAH"
        : activeCampaigns.length === 0
          ? null
          : wastingCampaigns.length > 0
            ? "MERAH"
            : activeCampaigns.some((r) => r.health === "LEMAH")
              ? "KUNING"
              : activeCampaigns.every((r) => r.health === "BELUM_CUKUP_DATA")
                ? null
                : "HIJAU";
  const adsSummary = lock.locked
    ? "Vonis dikunci — perbaiki fondasi/tracking dulu."
    : activeCampaigns.length === 0
      ? "Tidak ada kampanye aktif tercatat."
      : wastingCampaigns.length > 0
        ? `${wastingCampaigns.length} kampanye sedang membuang uang — lihat Q4.`
        : adsStatus === "HIJAU"
          ? "Semua kampanye aktif sehat."
          : adsStatus === null
            ? "Kampanye aktif belum cukup data untuk dinilai."
            : "Ada kampanye lemah — butuh iterasi.";

  // ── Q3: pipeline hari ini ──
  const pipelineByStatus = ACTIVE_STATUSES.map((status) => {
    const rows = allLeads.filter((l) => l.status === status);
    return {
      status,
      count: rows.length,
      valueJuta: rows.reduce((s, l) => s + l.estimatedValueJuta, 0),
    };
  }).filter((r) => r.count > 0);

  // ── Q5: pemenang organik ──
  const winnersRaw = detectOrganicWinners(inputs);
  const ranked = rankAdCandidates(
    winnersRaw.winners.map((w) => {
      const post = posts.find((p) => p.id === w.postId)!;
      return { post: inputs.find((i) => i.id === w.postId)!, signalScore: post.signalScore, reasons: w.reasons };
    }),
  );
  const scoreOf = new Map(ranked.map((r) => [r.postId, r.score]));
  const winners = lock.locked
    ? []
    : winnersRaw.winners
        .map((w) => {
          const input = inputs.find((i) => i.id === w.postId)!;
          const post = posts.find((p) => p.id === w.postId)!;
          return {
            postId: w.postId,
            hook: post.hook,
            verdict: decideIgWinner(input, w.reasons, inputs.length),
            candidateScore: scoreOf.get(w.postId) ?? null,
          };
        })
        .sort((a, b) => (b.candidateScore ?? -1) - (a.candidateScore ?? -1));

  // ── Q6: format terbaik ──
  const fmt = bestFormat(inputs);

  // ── Q7: follow-up hari ini ──
  const followUps = followUpQueue(
    allLeads.map((l) => ({
      id: l.id,
      name: l.name,
      status: l.status,
      qualityScore: l.qualityScore,
      qualAnswersCount: l.qualAnswersCount,
      estimatedValueJuta: l.estimatedValueJuta,
      createdAt: l.createdAt,
      lastContactAt: l.lastContactAt,
      surveyAt: l.surveyAt,
      proposalSentAt: l.proposalSentAt,
    })),
    now,
  );

  // ── Q8: Top 5 ──
  const mixVerdict = lock.locked ? null : decideContentMix(contentMixAnalysis(inputs), inputs.length);
  const top5 = buildTop5({
    lock,
    killCampaigns: wastingCampaigns
      .filter((r) => r.verdict.decision === "KILL_KAMPANYE")
      .map((r) => ({ id: r.id, name: r.name, verdict: r.verdict })),
    moveBudget,
    urgentFollowUps: followUps,
    winners,
    mixVerdict,
    openWarRoomDecisions: openDecisions.map((d) => ({ decision: d.decision, reason: d.reason })),
  });

  // ── Sekunder ──
  const posts30 = posts.filter((p) => p.postedAt >= d30);
  const reach30d = posts30.length ? posts30.reduce((s, p) => s + (p.reach ?? 0), 0) : null;
  const impressions = campaigns
    .flatMap((c) => c.metrics)
    .filter((m) => m.date >= d30)
    .reduce((s, m) => s + (m.impressions ?? 0), 0);

  return {
    primary,
    gates: { gate0: gates.gate0, gate1: gates.gate1 },
    lock,
    igHealth: { status: igStatus, trend, lastNonFollowerPct, summary: igSummary },
    adsHealth: { status: adsStatus, summary: adsSummary },
    pipelineByStatus,
    wastingCampaigns,
    moveBudget,
    allCampaigns: campaignRows,
    winners,
    winnersInsufficient: winnersRaw.insufficient,
    bestFormat: fmt,
    followUps,
    top5,
    secondary: {
      reach30d,
      followers: snapshots[0]?.followerCount ?? null,
      impressions30d: impressions > 0 ? impressions : null,
    },
    hasAnyData: postCount > 0 || campaigns.length > 0 || allLeads.length > 0,
    auditAging: gates.agings.filter((a) => a.aging.aged),
    backup: backupDue(lastBackup ? new Date(lastBackup.value) : null, now, CONFIG.backupMaxAgeDays),
  };
}

/** Awal minggu berjalan (WIB) — dipakai halaman laporan. */
export function currentWeekStartWIB(now = new Date()): Date {
  return weekStartOf(now);
}
