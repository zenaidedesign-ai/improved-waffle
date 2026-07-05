"use server";

// Competitor Intelligence Lab — 100% input manual dari pengamatan owner atas
// profil PUBLIK. Tidak ada scraping. Decode pola → adaptasi, JANGAN meniru.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";

const url = z
  .union([z.string().url("URL tidak valid"), z.literal(""), z.undefined()])
  .transform((v) => (v ? v : null));

const competitorSchema = z.object({
  name: z.string().min(1, "Nama kompetitor wajib diisi").max(200),
  igUrl: url,
  threadsUrl: url,
  tiktokUrl: url,
  websiteUrl: url,
  notes: z.string().max(4000).optional(),
});

export async function createCompetitor(payload: unknown): Promise<void> {
  const data = competitorSchema.parse(payload);
  const c = await db.competitor.create({ data: { ...data, notes: data.notes || null } });
  revalidatePath("/kompetitor");
  redirect(`/kompetitor/${c.id}`);
}

const wajib = (label: string) => z.string().trim().min(1, `${label} wajib diisi — battle card tanpa kolom ini tidak berguna.`).max(4000);

const analysisSchema = z.object({
  competitorId: z.string().min(1),
  positioning: wajib("Positioning"),
  offer: wajib("Penawaran"),
  cta: wajib("CTA"),
  visualStyle: wajib("Gaya visual"),
  contentPattern: wajib("Pola konten"),
  postingFrequency: wajib("Frekuensi posting"),
  hookPattern: wajib("Pola hook"),
  marketGap: wajib("Celah pasar"),
  adaptationIdeas: wajib("Adaptasi untuk Zenaide"),
});

export async function addCompetitorAnalysis(payload: unknown): Promise<void> {
  const data = analysisSchema.parse(payload);
  await db.competitorAnalysis.create({ data });
  revalidatePath(`/kompetitor/${data.competitorId}`);
  revalidatePath("/kompetitor");
}
