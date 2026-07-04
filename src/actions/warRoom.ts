"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentWeekStart, getWeekMetrics } from "@/lib/data";
import { CONFIG } from "@/lib/domain/config";
import { KEPUTUSAN } from "@/lib/domain/enums";
import { buildWeeklyCompare } from "@/lib/engine/warRoom";

const decisionSchema = z.object({
  decision: z.enum(KEPUTUSAN),
  subjectType: z.string().max(50).optional(),
  subjectId: z.string().max(100).optional(),
  reason: z.string().min(1, "Alasan wajib diisi").max(1000),
});

const sessionSchema = z.object({
  notes: z.string().max(4000).optional(),
  decisions: z
    .array(decisionSchema)
    .min(1, "Minimal satu keputusan")
    .max(CONFIG.warRoomMaxDecisions, `Maksimal ${CONFIG.warRoomMaxDecisions} keputusan — lebih dari itu tidak ada yang jalan.`),
});

export type WarRoomSessionPayload = z.input<typeof sessionSchema>;

export async function commitWarRoomSession(payload: unknown): Promise<{ ok: true }> {
  const data = sessionSchema.parse(payload);
  const weekStart = currentWeekStart();

  const thisWeek = await getWeekMetrics(weekStart);
  const lastWeek = await getWeekMetrics(new Date(weekStart.getTime() - 7 * 24 * 3600 * 1000));
  const compare = buildWeeklyCompare(thisWeek, lastWeek);

  const existing = await db.warRoomSession.findUnique({ where: { weekStart } });
  if (existing) {
    // Sesi minggu ini sudah ada — perbarui snapshot & tambah keputusan baru
    // (tanpa melewati batas maksimal).
    const count = await db.warRoomDecision.count({ where: { sessionId: existing.id } });
    if (count + data.decisions.length > CONFIG.warRoomMaxDecisions) {
      throw new Error(
        `Sesi minggu ini sudah punya ${count} keputusan. Maksimal ${CONFIG.warRoomMaxDecisions} per minggu.`,
      );
    }
    await db.warRoomSession.update({
      where: { id: existing.id },
      data: {
        metricsJson: JSON.stringify(compare),
        notes: data.notes || existing.notes,
        decisions: { create: data.decisions },
      },
    });
  } else {
    await db.warRoomSession.create({
      data: {
        weekStart,
        metricsJson: JSON.stringify(compare),
        notes: data.notes || null,
        decisions: { create: data.decisions },
      },
    });
  }

  revalidatePath("/war-room");
  revalidatePath("/");
  return { ok: true };
}

export async function setDecisionStatus(decisionId: string, status: "TERBUKA" | "SELESAI" | "BATAL"): Promise<void> {
  await db.warRoomDecision.update({ where: { id: decisionId }, data: { status } });
  revalidatePath("/war-room");
  revalidatePath("/");
}
