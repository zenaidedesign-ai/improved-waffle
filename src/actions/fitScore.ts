"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { DEFAULT_FIT_WEIGHTS } from "@/lib/domain/config";
import { IG_FORMAT, PILAR } from "@/lib/domain/enums";
import { computeComposite, confidenceLabel, type FitRatings } from "@/lib/engine/fitScore";

const rating = z.coerce.number().int().min(0).max(5);

const ratingsSchema = z.object({
  hook3s: rating,
  visualStopScroll: rating,
  painPointClarity: rating,
  originality: rating,
  savePotential: rating,
  sharePotential: rating,
  profileVisitPotential: rating,
  waLeadPotential: rating,
  brandFit: rating,
  recommendationSafety: rating,
  businessValue: rating,
});

const fitScoreSchema = z
  .object({
    igPostId: z.string().optional(),
    // Ide baru: judul bebas (membuat ContentIdea)
    ideaTitle: z.string().max(300).optional(),
    ideaFormat: z.enum(IG_FORMAT).optional(),
    ideaPillar: z.enum(PILAR).optional(),
    confidence: rating,
    ratings: ratingsSchema,
  })
  .refine((v) => Boolean(v.igPostId) !== Boolean(v.ideaTitle && v.ideaTitle.trim()), {
    message: "Pilih tepat satu: post yang sudah tayang ATAU ide konten baru.",
  });

export type FitScorePayload = z.input<typeof fitScoreSchema>;

export async function saveFitScore(payload: unknown): Promise<{ ok: true }> {
  const data = fitScoreSchema.parse(payload);
  const weights = DEFAULT_FIT_WEIGHTS;
  const result = computeComposite(data.ratings as FitRatings, weights);

  let contentIdeaId: string | undefined;
  if (data.ideaTitle?.trim()) {
    const idea = await db.contentIdea.create({
      data: {
        title: data.ideaTitle.trim(),
        format: data.ideaFormat ?? "REELS",
        pillar: data.ideaPillar ?? "PAIN_BASED",
      },
    });
    contentIdeaId = idea.id;
  }

  await db.fitScore.create({
    data: {
      igPostId: data.igPostId || null,
      contentIdeaId: contentIdeaId ?? null,
      ...data.ratings,
      confidence: data.confidence,
      weightsJson: JSON.stringify(weights),
      compositeScore: result.composite,
      confidenceLabel: confidenceLabel(data.confidence),
    },
  });

  revalidatePath("/skor");
  return { ok: true };
}
