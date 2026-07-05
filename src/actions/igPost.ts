"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { mapPostToInput } from "@/lib/data";
import { IG_FORMAT, PILAR } from "@/lib/domain/enums";
import { computeSignalScore } from "@/lib/engine/igDiagnosis";

const optionalInt = z
  .union([z.coerce.number().int().min(0), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v === "" || v == null ? null : v));

const postSchema = z.object({
  postedAt: z.coerce.date(),
  format: z.enum(IG_FORMAT),
  pillar: z.enum(PILAR),
  hook: z.string().min(1, "Hook wajib diisi").max(500),
  caption: z.string().max(5000).optional(),
  cta: z.string().max(300).optional(),
  reach: optionalInt,
  reachNonFollower: optionalInt,
  plays: optionalInt,
  likes: optionalInt,
  comments: optionalInt,
  saves: optionalInt,
  shares: optionalInt,
  profileVisits: optionalInt,
  follows: optionalInt,
  dmClicks: optionalInt,
  waClicks: optionalInt,
  leadsManual: optionalInt,
  qualifiedLeadsManual: optionalInt,
  dataSource: z.enum(["MANUAL", "SCREENSHOT"]).default("MANUAL"),
});

export type IgPostPayload = z.input<typeof postSchema>;

export async function createIgPost(payload: unknown): Promise<{ ok: true }> {
  const { dataSource, ...data } = postSchema.parse(payload);
  const created = await db.igPost.create({
    data: { ...data, caption: data.caption || null, cta: data.cta || null, sourceType: dataSource },
  });
  const score = computeSignalScore(mapPostToInput({ ...created, leads: [] }));
  if (score !== null) {
    await db.igPost.update({ where: { id: created.id }, data: { signalScore: score } });
  }
  revalidatePath("/instagram");
  revalidatePath("/");
  return { ok: true };
}

const snapshotSchema = z.object({
  weekStart: z.coerce.date(),
  followerCount: optionalInt,
  reachTotal: optionalInt,
  reachNonFollowerPct: z
    .union([z.coerce.number().min(0).max(100), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v == null ? null : v)),
  profileVisits: optionalInt,
  recommendationStatus: z.enum(["LAYAK", "ADA_KONTEN_DITANDAI", "PELANGGARAN", "BELUM_DICEK"]),
  notes: z.string().max(2000).optional(),
  dataSource: z.enum(["MANUAL", "SCREENSHOT"]).default("MANUAL"),
});

export type SnapshotPayload = z.input<typeof snapshotSchema>;

export async function upsertSnapshot(payload: unknown): Promise<void> {
  const parsed = snapshotSchema.parse(payload);
  const { weekStart, dataSource, ...rest } = parsed;
  await db.igAccountSnapshot.upsert({
    where: { weekStart },
    update: { ...rest, notes: rest.notes || null, sourceType: dataSource },
    create: { weekStart, ...rest, notes: rest.notes || null, sourceType: dataSource },
  });
  revalidatePath("/instagram");
}
