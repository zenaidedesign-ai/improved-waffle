// Perakit Panel Kebenaran Data — kebasian, konflik sumber, campuran sumber.
// Dipasang di permukaan keputusan (dashboard, laporan, kampanye).

import { buildCampaignFunnel, isLeadQualified } from "./data";
import { db } from "./db";
import {
  checkFreshness,
  detectCampaignConflicts,
  type DataSource,
  type FreshnessWarning,
  type SourceConflict,
} from "./engine/dataTruth";

export interface TruthPanelData {
  warnings: FreshnessWarning[];
  conflicts: SourceConflict[];
  sourceMix: Array<{ source: DataSource; count: number }>;
  hasScreenshotData: boolean;
  hasCompetitorData: boolean;
  lastUpdated: { instagram: Date | null; ads: Date | null; leads: Date | null; competitor: Date | null };
}

export async function getTruthPanelData(now = new Date()): Promise<TruthPanelData> {
  const [lastPost, lastSnapshot, lastMetric, lastLead, lastCompetitor, campaigns, posts, metrics, leads] =
    await Promise.all([
      db.igPost.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      db.igAccountSnapshot.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      db.campaignMetricDaily.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      db.lead.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      db.competitorAnalysis.findFirst({ orderBy: { analyzedAt: "desc" }, select: { analyzedAt: true } }),
      db.campaign.findMany({ where: { status: "AKTIF" }, include: { metrics: true, leads: true } }),
      db.igPost.groupBy({ by: ["sourceType"], _count: true }),
      db.campaignMetricDaily.groupBy({ by: ["sourceType"], _count: true }),
      db.lead.groupBy({ by: ["sourceDataType"], _count: true }),
    ]);

  const igLast = [lastPost?.updatedAt, lastSnapshot?.updatedAt]
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const lastUpdated = {
    instagram: igLast,
    ads: lastMetric?.updatedAt ?? null,
    leads: lastLead?.updatedAt ?? null,
    competitor: lastCompetitor?.analyzedAt ?? null,
  };

  const warnings = [
    checkFreshness("INSTAGRAM", lastUpdated.instagram, now),
    checkFreshness("ADS", lastUpdated.ads, now),
    checkFreshness("LEAD_FOLLOWUP", lastUpdated.leads, now),
    checkFreshness("KOMPETITOR", lastUpdated.competitor, now),
  ].filter((w): w is FreshnessWarning => w !== null);

  const conflicts = campaigns.flatMap((c) => {
    const funnel = buildCampaignFunnel(c);
    return detectCampaignConflicts({
      name: c.name,
      manualChats: c.manualChats,
      linkedChats: c.leads.length,
      manualQualified: c.manualQualifiedLeads,
      linkedQualified: c.leads.filter(isLeadQualified).length,
      resultsPlatform: funnel.resultsPlatform,
      chatsUsed: funnel.chats,
    });
  });

  const mixMap = new Map<string, number>();
  for (const g of posts) mixMap.set(g.sourceType, (mixMap.get(g.sourceType) ?? 0) + g._count);
  for (const g of metrics) mixMap.set(g.sourceType, (mixMap.get(g.sourceType) ?? 0) + g._count);
  for (const g of leads) mixMap.set(g.sourceDataType, (mixMap.get(g.sourceDataType) ?? 0) + g._count);
  const sourceMix = [...mixMap.entries()]
    .map(([source, count]) => ({ source: source as DataSource, count }))
    .sort((a, b) => b.count - a.count);

  return {
    warnings,
    conflicts,
    sourceMix,
    hasScreenshotData: mixMap.has("SCREENSHOT"),
    hasCompetitorData: lastUpdated.competitor !== null,
    lastUpdated,
  };
}
