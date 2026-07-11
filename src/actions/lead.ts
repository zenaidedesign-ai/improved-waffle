"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { computeQualityScore } from "@/lib/engine/leadTriage";
import { LEAD_SOURCE, LEAD_STATUS } from "@/lib/domain/enums";

const signal = z.coerce.number().int().min(0).max(20);
const optDate = z
  .union([z.coerce.date(), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v === "" || v == null ? null : v));

const leadSchema = z.object({
  name: z.string().min(1, "Nama / nomor WA wajib diisi").max(200),
  leadSource: z.enum(LEAD_SOURCE),
  campaignId: z
    .union([z.string(), z.literal(""), z.undefined()])
    .transform((v) => (v ? v : null)),
  status: z.enum(LEAD_STATUS).default("CHAT_BARU"),
  signalBudget: signal.default(0),
  signalProjectType: signal.default(0),
  signalLocation: signal.default(0),
  signalUrgency: signal.default(0),
  signalSeriousness: signal.default(0),
  qualAnswersCount: z.coerce.number().int().min(0).max(20).default(0),
  estimatedValueJuta: z.coerce.number().int().min(0).default(0),
  lastContactAt: optDate,
  surveyAt: optDate,
  proposalSentAt: optDate,
  notes: z.string().max(4000).optional(),
});

function toData(payload: unknown) {
  const d = leadSchema.parse(payload);
  return {
    ...d,
    notes: d.notes || null,
    qualityScore:
      computeQualityScore(d),
  };
}

export async function createLead(payload: unknown): Promise<void> {
  const data = toData(payload);
  const lead = await db.lead.create({
    data: { ...data, lastContactAt: data.lastContactAt ?? new Date() },
  });
  await db.leadEvent.create({
    data: { leadId: lead.id, type: "STATUS_CHANGE", toStatus: lead.status, note: "Lead dibuat" },
  });
  revalidatePath("/leads");
  revalidatePath("/");
  redirect("/leads");
}

export async function updateLead(leadId: string, payload: unknown): Promise<void> {
  const data = toData(payload);
  const before = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
  await db.lead.update({ where: { id: leadId }, data });
  if (before.status !== data.status) {
    await db.leadEvent.create({
      data: { leadId, type: "STATUS_CHANGE", fromStatus: before.status, toStatus: data.status },
    });
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
}

export async function setLeadStatus(leadId: string, status: string): Promise<void> {
  const parsed = z.enum(LEAD_STATUS).parse(status);
  const before = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
  await db.lead.update({
    where: { id: leadId },
    data: {
      status: parsed,
      lastContactAt: new Date(), // perubahan status = ada kontak
      ...(parsed === "PROPOSAL_TERKIRIM" && !before.proposalSentAt ? { proposalSentAt: new Date() } : {}),
    },
  });
  await db.leadEvent.create({
    data: { leadId, type: "STATUS_CHANGE", fromStatus: before.status, toStatus: parsed },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
}

export async function touchLeadContact(leadId: string, note?: string): Promise<void> {
  await db.lead.update({ where: { id: leadId }, data: { lastContactAt: new Date() } });
  await db.leadEvent.create({
    data: { leadId, type: "FOLLOW_UP", note: note || "Follow-up dilakukan" },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
}

export async function scheduleSurvey(leadId: string, when: Date): Promise<void> {
  const at = z.coerce.date().parse(when);
  const before = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
  await db.lead.update({
    where: { id: leadId },
    data: {
      surveyAt: at,
      lastContactAt: new Date(),
      ...(["CHAT_BARU", "MERESPONS", "BERKUALITAS"].includes(before.status)
        ? { status: "SURVEI_TERJADWAL" }
        : {}),
    },
  });
  await db.leadEvent.create({
    data: { leadId, type: "CATATAN", note: `Survei dijadwalkan: ${at.toISOString().slice(0, 16).replace("T", " ")}` },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}
