"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { buildCampaignFunnel, getGateStatus } from "@/lib/data";
import { CONFIG } from "@/lib/domain/config";
import { CAMPAIGN_OBJECTIVE, CAMPAIGN_STATUS } from "@/lib/domain/enums";
import { computeCostChain, decideCampaign } from "@/lib/engine/adsRescue";
import { recordVerdict } from "@/lib/verdictLog";

const nonNegInt = z.coerce.number().int().min(0);

const campaignSchema = z.object({
  name: z.string().min(1, "Nama kampanye wajib diisi").max(300),
  objective: z.enum(CAMPAIGN_OBJECTIVE),
  status: z.enum(CAMPAIGN_STATUS).default("AKTIF"),
  targetCpqlRibu: z
    .union([nonNegInt, z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v == null ? null : v)),
  manualChats: nonNegInt.default(0),
  manualQualifiedLeads: nonNegInt.default(0),
  manualSurveys: nonNegInt.default(0),
  manualPipelineJuta: nonNegInt.default(0),
  notes: z.string().max(4000).optional(),
});

export type CampaignPayload = z.input<typeof campaignSchema>;

export async function createCampaign(payload: unknown): Promise<void> {
  const data = campaignSchema.parse(payload);
  const created = await db.campaign.create({
    data: { ...data, notes: data.notes || null },
  });
  revalidatePath("/kampanye");
  redirect(`/kampanye/${created.id}`);
}

export async function updateCampaignFunnel(campaignId: string, payload: unknown): Promise<void> {
  const data = campaignSchema
    .pick({ manualChats: true, manualQualifiedLeads: true, manualSurveys: true, manualPipelineJuta: true, status: true, notes: true })
    .parse(payload);
  await db.campaign.update({
    where: { id: campaignId },
    data: { ...data, notes: data.notes || null },
  });
  revalidatePath(`/kampanye/${campaignId}`);
  revalidatePath("/kampanye");
}

const metricSchema = z.object({
  campaignId: z.string().min(1),
  date: z.coerce.date(),
  spendRibu: nonNegInt,
  impressions: z.union([nonNegInt, z.literal(""), z.null(), z.undefined()]).transform((v) => (v === "" || v == null ? null : v)),
  clicks: z.union([nonNegInt, z.literal(""), z.null(), z.undefined()]).transform((v) => (v === "" || v == null ? null : v)),
  resultsPlatform: z.union([nonNegInt, z.literal(""), z.null(), z.undefined()]).transform((v) => (v === "" || v == null ? null : v)),
});

export type MetricPayload = z.input<typeof metricSchema>;

export async function addCampaignMetric(payload: unknown): Promise<void> {
  const data = metricSchema.parse(payload);
  // Upsert manual: unique gabungan berisi kolom nullable (adSetId), jadi
  // where-compound Prisma tidak bisa dipakai untuk baris level-kampanye.
  const existing = await db.campaignMetricDaily.findFirst({
    where: { campaignId: data.campaignId, adSetId: null, date: data.date },
  });
  if (existing) {
    await db.campaignMetricDaily.update({
      where: { id: existing.id },
      data: { spendRibu: data.spendRibu, impressions: data.impressions, clicks: data.clicks, resultsPlatform: data.resultsPlatform },
    });
  } else {
    await db.campaignMetricDaily.create({ data });
  }
  revalidatePath(`/kampanye/${data.campaignId}`);
  revalidatePath("/kampanye");
}

/** Catat vonis kampanye saat ini ke log Verdict (jejak keputusan bisa diaudit). */
export async function recordCampaignVerdict(campaignId: string): Promise<void> {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { metrics: true, leads: true },
  });
  const gates = await getGateStatus();
  const chain = computeCostChain(buildCampaignFunnel(campaign));
  const verdict = decideCampaign(
    chain,
    gates.gate0,
    gates.gate1,
    campaign.targetCpqlRibu ?? CONFIG.adsTargetCpqlRibu,
  );
  await recordVerdict("CAMPAIGN", verdict, {
    campaignId,
    subjectId: campaignId,
    isExample: campaign.isExample,
  });
  revalidatePath(`/kampanye/${campaignId}`);
}
