// Perakit data: mengambil baris Prisma → memetakan ke tipe input engine.
// Satu-satunya tempat aturan atribusi diterapkan:
// nilai = max(baris Lead tertaut, isian manual) — tidak pernah dijumlahkan.

import type { Campaign, CampaignMetricDaily, IgPost, Lead } from "@prisma/client";
import { CONFIG } from "./domain/config";
import type { StatusLampu } from "./domain/enums";
import type { CampaignFunnelInput } from "./engine/adsRescue";
import { applyAuditAging, combineGate0, type AuditAging } from "./engine/gates";
import type { IgPostInput } from "./engine/types";
import type { WeekMetrics } from "./engine/warRoom";
import { weekStartOf } from "./engine/warRoom";
import { db } from "./db";

export function isLeadQualified(lead: Pick<Lead, "qualityScore" | "qualAnswersCount">): boolean {
  return (
    lead.qualityScore >= CONFIG.leadQualifiedMinScore &&
    lead.qualAnswersCount >= CONFIG.leadQualifiedMinAnswers
  );
}

const SURVEY_OR_BEYOND = [
  "SURVEI_TERJADWAL",
  "SURVEI_SELESAI",
  "PROPOSAL_TERKIRIM",
  "NEGOSIASI",
  "CLOSING_MENANG",
];
const PROPOSAL_OR_BEYOND = ["PROPOSAL_TERKIRIM", "NEGOSIASI", "CLOSING_MENANG"];

export function mapPostToInput(post: IgPost & { leads: Lead[] }): IgPostInput {
  const linkedLeads = post.leads.length;
  const linkedQualified = post.leads.filter(isLeadQualified).length;
  return {
    id: post.id,
    postedAt: post.postedAt,
    format: post.format,
    pillar: post.pillar,
    hook: post.hook,
    cta: post.cta,
    reach: post.reach,
    reachNonFollower: post.reachNonFollower,
    plays: post.plays,
    likes: post.likes,
    comments: post.comments,
    saves: post.saves,
    shares: post.shares,
    profileVisits: post.profileVisits,
    follows: post.follows,
    dmClicks: post.dmClicks,
    waClicks: post.waClicks,
    leadsAttributed: Math.max(linkedLeads, post.leadsManual ?? 0),
    qualifiedLeadsAttributed: Math.max(linkedQualified, post.qualifiedLeadsManual ?? 0),
  };
}

export interface GateStatus {
  gate0: StatusLampu | null;
  gate1: StatusLampu | null;
  metaVerdict: StatusLampu | null;
  rekomendasiVerdict: StatusLampu | null;
  trackingVerdict: StatusLampu | null;
  /** Audit yang menua (> 30 hari): HIJAU sudah diturunkan ke KUNING di verdict di atas. */
  agings: Array<{ type: string; aging: AuditAging }>;
}

export async function getGateStatus(now = new Date()): Promise<GateStatus> {
  const latest = async (type: string) =>
    db.auditRun.findFirst({ where: { type }, orderBy: { runDate: "desc" } });
  const [meta, rekom, tracking] = await Promise.all([
    latest("META_ACCOUNT"),
    latest("REKOMENDASI"),
    latest("TRACKING"),
  ]);
  const agings: Array<{ type: string; aging: AuditAging }> = [];
  const aged = (run: { verdict: string; runDate: Date } | null, type: string): StatusLampu | null => {
    const r = applyAuditAging((run?.verdict as StatusLampu) ?? null, run?.runDate ?? null, now);
    if (r.aging) agings.push({ type, aging: r.aging });
    return r.verdict;
  };
  const metaVerdict = aged(meta, "META_ACCOUNT");
  const rekomendasiVerdict = aged(rekom, "REKOMENDASI");
  const trackingVerdict = aged(tracking, "TRACKING");
  return {
    gate0: combineGate0(metaVerdict, rekomendasiVerdict),
    gate1: trackingVerdict,
    metaVerdict,
    rekomendasiVerdict,
    trackingVerdict,
    agings,
  };
}

export function buildCampaignFunnel(
  campaign: Campaign & { metrics: CampaignMetricDaily[]; leads: Lead[] },
): CampaignFunnelInput {
  const sum = (vals: Array<number | null>): number | null => {
    const filled = vals.filter((v): v is number => v != null);
    return filled.length === 0 ? null : filled.reduce((a, b) => a + b, 0);
  };
  const spendRibu = campaign.metrics.reduce((s, m) => s + m.spendRibu, 0);
  const linkedChats = campaign.leads.length;
  const linkedQualified = campaign.leads.filter(isLeadQualified).length;
  const linkedSurveys = campaign.leads.filter((l) => SURVEY_OR_BEYOND.includes(l.status)).length;
  const linkedPipeline = campaign.leads
    .filter((l) => !["CLOSING_KALAH", "GHOSTING"].includes(l.status))
    .reduce((s, l) => s + l.estimatedValueJuta, 0);
  return {
    spendRibu,
    impressions: sum(campaign.metrics.map((m) => m.impressions)),
    clicks: sum(campaign.metrics.map((m) => m.clicks)),
    resultsPlatform: sum(campaign.metrics.map((m) => m.resultsPlatform)),
    chats: Math.max(linkedChats, campaign.manualChats),
    qualifiedLeads: Math.max(linkedQualified, campaign.manualQualifiedLeads),
    surveys: Math.max(linkedSurveys, campaign.manualSurveys),
    pipelineValueJuta: Math.max(linkedPipeline, campaign.manualPipelineJuta),
  };
}

/**
 * Metrik mingguan untuk War Room. Catatan kejujuran: sebelum modul Leads penuh
 * hadir, survei/proposal dihitung dari STATUS lead yang dibuat minggu itu —
 * pendekatan (bukan tanggal kejadian sebenarnya). Diberi label di UI.
 */
export async function getWeekMetrics(weekStart: Date): Promise<WeekMetrics> {
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 3600 * 1000);
  const inWeek = { gte: weekStart, lt: weekEnd };

  const [posts, leads, snapshot, adMetrics] = await Promise.all([
    db.igPost.findMany({ where: { postedAt: inWeek } }),
    db.lead.findMany({ where: { createdAt: inWeek } }),
    db.igAccountSnapshot.findFirst({ where: { weekStart: { gte: weekStart, lt: weekEnd } } }),
    db.campaignMetricDaily.findMany({ where: { date: inWeek } }),
  ]);

  return {
    qualifiedLeads: leads.filter(isLeadQualified).length,
    surveys: leads.filter((l) => SURVEY_OR_BEYOND.includes(l.status)).length,
    proposals: leads.filter((l) => PROPOSAL_OR_BEYOND.includes(l.status)).length,
    closingValueJuta: leads
      .filter((l) => l.status === "CLOSING_MENANG")
      .reduce((s, l) => s + l.estimatedValueJuta, 0),
    pipelineValueJuta: leads
      .filter((l) => !["CLOSING_KALAH", "GHOSTING"].includes(l.status))
      .reduce((s, l) => s + l.estimatedValueJuta, 0),
    nonFollowerReachPct: snapshot?.reachNonFollowerPct ?? null,
    saves: posts.reduce((s, p) => s + (p.saves ?? 0), 0),
    shares: posts.reduce((s, p) => s + (p.shares ?? 0), 0),
    waClicks: posts.reduce((s, p) => s + (p.waClicks ?? 0), 0),
    postsPublished: posts.length,
    adSpendRibu: adMetrics.reduce((s, m) => s + m.spendRibu, 0),
  };
}

export function currentWeekStart(): Date {
  return weekStartOf(new Date());
}
