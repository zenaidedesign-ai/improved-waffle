"use server";

// Perpustakaan Pain Point & Keberatan — bahan mentah hook dan konten.
// Diisi dari bahasa klien nyata (chat, survei, komentar), bukan karangan.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";

const painSchema = z.object({
  text: z.string().trim().min(1, "Tulis masalahnya dalam bahasa klien").max(1000),
  audience: z.string().max(300).optional(),
  source: z.string().max(300).optional(),
});

export async function addPainPoint(payload: unknown): Promise<void> {
  const d = painSchema.parse(payload);
  await db.painPoint.create({
    data: { text: d.text, audience: d.audience || null, source: d.source || null },
  });
  revalidatePath("/library");
}

const objectionSchema = z.object({
  text: z.string().trim().min(1, "Tulis keberatannya").max(1000),
  answer: z.string().trim().min(1, "Jawaban terbaik wajib diisi — keberatan tanpa jawaban belum selesai").max(2000),
});

export async function addObjection(payload: unknown): Promise<void> {
  const d = objectionSchema.parse(payload);
  await db.objection.create({ data: d });
  revalidatePath("/library");
}

export async function deletePainPoint(id: string): Promise<void> {
  await db.painPoint.delete({ where: { id } });
  revalidatePath("/library");
}

export async function deleteObjection(id: string): Promise<void> {
  await db.objection.delete({ where: { id } });
  revalidatePath("/library");
}
