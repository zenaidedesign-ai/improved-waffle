"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { LEARNING_SOURCE, LEARNING_STRENGTH } from "@/lib/engine/knowledge";
import {
  deriveEvidenceType,
  EVIDENCE_POLARITY,
  EVIDENCE_RELIABILITY_PCT,
  isPublicEvidence,
} from "@/lib/engine/belief";

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
    // Fase A: setiap learning BARU wajib menyebut syarat gugurnya sendiri.
    falsifier: z
      .string().trim()
      .min(1, "Falsifier wajib — tulis bukti apa yang akan memaksa learning ini dibuang.")
      .max(2000),
  })
  .refine((v) => !(v.strength === "TERBUKTI" && v.sourceType !== "DATA_INTERNAL"), {
    message: "TERBUKTI hanya sah untuk sumber DATA_INTERNAL — asumsi dan observasi tidak bisa 'terbukti'.",
  });

export async function saveLearning(payload: unknown): Promise<void> {
  const data = learningSchema.parse(payload);
  const derivedFromPublic = isPublicEvidence(data.sourceType);
  // Satu transaksi: learning + bukti awal (data pendukung) + revisi kelahiran.
  await db.$transaction(async (tx) => {
    const learning = await tx.learning.create({ data: { ...data, derivedFromPublic } });
    await tx.evidenceItem.create({
      data: {
        learningId: learning.id,
        evidenceType: deriveEvidenceType(data.sourceType),
        polarity: "MENDUKUNG",
        sourceKind: data.sourceType,
        reliabilityPct: EVIDENCE_RELIABILITY_PCT[data.sourceType],
        derivedFromPublic,
        note: data.supportingData,
      },
    });
    await tx.beliefRevision.create({
      data: {
        learningId: learning.id,
        fromState: null, // kelahiran belief
        toState: data.strength,
        trigger: `Learning disimpan owner dengan data pendukung (sumber: ${data.sourceType}).`,
        actor: "OWNER",
      },
    });
  });
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
  if (strength === "TERBUKTI" && learning.derivedFromPublic) {
    throw new Error("Belief berakar pengamatan publik tidak bisa TERBUKTI (Cap C) — publik tetap publik.");
  }
  if (learning.strength === strength) return;
  await db.$transaction([
    db.learning.update({ where: { id }, data: { strength } }),
    db.beliefRevision.create({
      data: {
        learningId: id,
        fromState: learning.strength,
        toState: strength,
        trigger: "Owner mengubah kekuatan secara manual dari layar Knowledge.",
        actor: "OWNER",
      },
    }),
  ]);
  revalidatePath("/knowledge");
}

const evidenceSchema = z.object({
  learningId: z.string().min(1),
  polarity: z.enum(EVIDENCE_POLARITY),
  sourceKind: z.enum(LEARNING_SOURCE),
  note: z
    .string().trim()
    .min(1, "Isi buktinya — angka/kejadian spesifik, bukan opini.")
    .max(2000),
});

/**
 * Fase A: bukti hanya DICATAT — tidak ada perubahan status otomatis.
 * Bukti MENENTANG memunculkan "kontradiksi terbuka" di provenance;
 * yang memutuskan turun/naik tetap owner (atau Fase B nanti).
 */
export async function addEvidence(payload: unknown): Promise<void> {
  const data = evidenceSchema.parse(payload);
  const learning = await db.learning.findUniqueOrThrow({ where: { id: data.learningId } });
  const fromPublic = isPublicEvidence(data.sourceKind);
  await db.$transaction(async (tx) => {
    await tx.evidenceItem.create({
      data: {
        learningId: learning.id,
        evidenceType: deriveEvidenceType(data.sourceKind),
        polarity: data.polarity,
        sourceKind: data.sourceKind,
        reliabilityPct: EVIDENCE_RELIABILITY_PCT[data.sourceKind],
        derivedFromPublic: fromPublic,
        note: data.note,
        isExample: learning.isExample,
      },
    });
    // Cap C transitif: sekali tersentuh bukti publik, belief-nya tertanda selamanya.
    if (fromPublic && !learning.derivedFromPublic) {
      await tx.learning.update({ where: { id: learning.id }, data: { derivedFromPublic: true } });
    }
  });
  revalidatePath("/knowledge");
}

/** Fase A: falsifier bisa dilengkapi untuk learning lama (pra-ledger) — sekali isi, wajib bermakna. */
export async function setFalsifier(id: string, falsifier: string): Promise<void> {
  const clean = falsifier.trim();
  if (clean.length < 1) throw new Error("Falsifier tidak boleh kosong.");
  await db.learning.update({ where: { id }, data: { falsifier: clean.slice(0, 2000) } });
  revalidatePath("/knowledge");
}

export async function deleteLearning(id: string): Promise<void> {
  await db.learning.delete({ where: { id } }); // evidence & revisions ikut terhapus (cascade)
  revalidatePath("/knowledge");
}
