"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { PILAR } from "@/lib/domain/enums";

// Frasa generik yang DITOLAK — konten tanpa sudut pandang tidak boleh masuk sistem.
const FRASA_GENERIK = [
  "wujudkan hunian impian",
  "desain elegan dan nyaman",
  "solusi interior terbaik",
];
function tolakFrasaGenerik(v: string): boolean {
  const low = v.toLowerCase();
  return !FRASA_GENERIK.some((f) => low.includes(f));
}

// 6 kolom hipotesis WAJIB — kartu tanpa 6 kolom tidak bisa disimpan.
const wajib = (label: string) =>
  z.string().trim().min(1, `${label} wajib diisi — tanpa ini kartu hipotesis tidak bisa diuji.`).max(4000);

const experimentSchema = z.object({
  title: z
    .string().trim().min(1, "Judul wajib diisi").max(300)
    .refine(tolakFrasaGenerik, "Frasa generik terdeteksi ('wujudkan hunian impian' dsb.) — tulis angle spesifik yang menyentuh masalah nyata."),
  pillar: z.enum(PILAR),
  channel: z.enum(["ORGANIK", "IKLAN"]).default("ORGANIK"),
  sourcePostId: z.union([z.string(), z.literal(""), z.undefined()]).transform((v) => (v ? v : null)),
  whyNeeded: wajib("Kenapa dibutuhkan"),
  signalTargeted: wajib("Sinyal yang dibidik"),
  expectedAudienceReaction: wajib("Reaksi audiens yang diharapkan"),
  expectedBusinessOutcome: wajib("Hasil bisnis yang diharapkan"),
  successMetric: wajib("Metrik sukses"),
  decisionRuleAfterTest: wajib("Aturan keputusan setelah uji"),
});

export async function createExperiment(payload: unknown): Promise<void> {
  const data = experimentSchema.parse(payload);
  await db.experiment.create({ data });
  revalidatePath("/eksperimen");
  redirect("/eksperimen");
}

export async function setExperimentStatus(
  id: string,
  status: "DRAFT" | "RUNNING" | "PASSED" | "FAILED",
  resultNotes?: string,
): Promise<void> {
  const now = new Date();
  await db.experiment.update({
    where: { id },
    data: {
      status,
      resultNotes: resultNotes || undefined,
      ...(status === "RUNNING"
        ? { cycleStart: now, cycleEnd: new Date(now.getTime() + 30 * 24 * 3600 * 1000) }
        : {}),
    },
  });
  revalidatePath("/eksperimen");
}
