"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { AUDIT_ITEMS } from "@/lib/domain/auditItems";
import { AUDIT_TYPE, STATUS_AUDIT_ITEM } from "@/lib/domain/enums";
import { computeGateVerdict } from "@/lib/engine/gates";
import { recordVerdict } from "@/lib/verdictLog";

const answerSchema = z.object({
  itemKey: z.string().min(1),
  status: z.enum(STATUS_AUDIT_ITEM),
  answerText: z.string().max(2000).optional(),
  note: z.string().max(2000).optional(),
});

const runSchema = z.object({
  type: z.enum(AUDIT_TYPE),
  notes: z.string().max(4000).optional(),
  answers: z.array(answerSchema).min(1),
});

export type AuditRunPayload = z.infer<typeof runSchema>;

export async function submitAuditRun(payload: AuditRunPayload): Promise<void> {
  const parsed = runSchema.parse(payload);
  const defs = AUDIT_ITEMS[parsed.type];
  const byKey = new Map(defs.map((d) => [d.key, d]));

  // Hanya item yang dikenal; item hilang dianggap BELUM_DICEK.
  const answers = defs.map((def) => {
    const given = parsed.answers.find((a) => a.itemKey === def.key);
    return {
      itemKey: def.key,
      status: given?.status ?? "BELUM_DICEK",
      isBlocking: def.isBlocking,
      answerText: given?.answerText || null,
      note: given?.note || null,
    };
  });
  // Tolak jawaban untuk item yang tidak dikenal (indikasi payload rusak).
  for (const a of parsed.answers) {
    if (!byKey.has(a.itemKey)) throw new Error(`Item audit tidak dikenal: ${a.itemKey}`);
  }

  const gate = computeGateVerdict(
    answers.map((a) => ({ itemKey: a.itemKey, status: a.status, isBlocking: a.isBlocking })),
  );

  const run = await db.auditRun.create({
    data: {
      type: parsed.type,
      verdict: gate.verdict,
      notes: parsed.notes || null,
      answers: { create: answers },
    },
  });

  await recordVerdict(
    parsed.type === "TRACKING" ? "TRACKING" : parsed.type === "REKOMENDASI" ? "REKOMENDASI" : "AKUN",
    {
      decision:
        gate.verdict === "MERAH"
          ? parsed.type === "TRACKING"
            ? "PERBAIKI_TRACKING_DULU"
            : "PERBAIKI_AKUN_DULU"
          : "LANJUT",
      ruleFired: `AUDIT_${parsed.type}_${gate.verdict}`,
      trigger: {
        blocking: gate.blockingProblems.join(","),
        nonBlocking: gate.nonBlockingProblems.join(","),
      },
      confidence: "TINGGI",
      explanation: `Hasil audit ${parsed.type}: ${gate.verdict}`,
    },
    { auditRunId: run.id, subjectId: run.id },
  );

  revalidatePath("/", "layout");
  redirect(`/audit/${parsed.type.toLowerCase().replace("_", "-")}`);
}
