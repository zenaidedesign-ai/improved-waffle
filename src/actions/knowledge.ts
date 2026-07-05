"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { LEARNING_SOURCE, LEARNING_STRENGTH } from "@/lib/engine/knowledge";

const learningSchema = z
  .object({
    category: z.string().trim().min(1).max(50),
    insight: z.string().trim().min(1, "Insight wajib diisi").max(2000),
    supportingData: z
      .string().trim()
      .min(1, "Data pendukung wajib diisi — insight tanpa data hanyalah opini.")
      .max(2000),
    sourceType: z.enum(LEARNING_SOURCE),
    confidence: z.enum(["RENDAH", "SEDANG", "TINGGI"]),
    strength: z.enum(LEARNING_STRENGTH),
    recommendedAction: z.string().trim().min(1, "Aksi yang disarankan wajib diisi").max(2000),
  })
  .refine((v) => !(v.strength === "TERBUKTI" && v.sourceType !== "DATA_INTERNAL"), {
    message: "TERBUKTI hanya sah untuk sumber DATA_INTERNAL — asumsi dan observasi tidak bisa 'terbukti'.",
  });

export async function saveLearning(payload: unknown): Promise<void> {
  const data = learningSchema.parse(payload);
  await db.learning.create({ data });
  revalidatePath("/knowledge");
}

export async function setLearningStrength(
  id: string,
  strength: "TERBUKTI" | "BERKEMBANG" | "LEMAH",
): Promise<void> {
  const learning = await db.learning.findUniqueOrThrow({ where: { id } });
  if (strength === "TERBUKTI" && learning.sourceType !== "DATA_INTERNAL") {
    throw new Error("TERBUKTI hanya sah untuk sumber DATA_INTERNAL.");
  }
  await db.learning.update({ where: { id }, data: { strength } });
  revalidatePath("/knowledge");
}

export async function deleteLearning(id: string): Promise<void> {
  await db.learning.delete({ where: { id } });
  revalidatePath("/knowledge");
}
