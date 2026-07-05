"use server";

// Impor CSV aman: validasi ulang di server, satu ImportBatch per file,
// duplikat DILAPORKAN & dilewati (tidak pernah menimpa diam-diam),
// dan setiap batch bisa dibatalkan (hapus batch + barisnya).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { mapPostToInput } from "@/lib/data";
import { IG_FORMAT, LEAD_SOURCE, LEAD_STATUS, PILAR } from "@/lib/domain/enums";
import { computeSignalScore } from "@/lib/engine/igDiagnosis";

const num = z
  .union([z.coerce.number(), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v === "" || v == null || Number.isNaN(v) ? null : Math.round(Number(v))));

const igRow = z.object({
  tanggal: z.coerce.date(),
  format: z.enum(IG_FORMAT),
  pilar: z.enum(PILAR),
  hook: z.string().trim().min(1),
  cta: z.string().optional(),
  reach: num, reach_non_follower: num, plays: num, likes: num, komentar: num,
  saves: num, shares: num, kunjungan_profil: num, follows: num, klik_dm: num,
  klik_wa: num, leads: num, leads_berkualitas: num,
});

const leadRow = z.object({
  nama: z.string().trim().min(1),
  sumber: z.enum(LEAD_SOURCE),
  status: z.enum(LEAD_STATUS).default("CHAT_BARU"),
  sinyal_budget: num, sinyal_proyek: num, sinyal_lokasi: num,
  sinyal_urgensi: num, sinyal_keseriusan: num,
  jawaban_kualifikasi: num, estimasi_nilai_juta: num,
  tanggal_masuk: z.coerce.date().optional(),
});

const adsRow = z.object({
  kampanye: z.string().trim().min(1),
  tanggal: z.coerce.date(),
  spend_ribu: z.coerce.number().min(0),
  impresi: num, klik: num, hasil_platform: num,
});

export interface ImportResult {
  ok: true;
  batchId: string;
  inserted: number;
  skippedDuplicates: string[]; // deskripsi baris yang dilewati
}

export async function importCsvRows(
  type: "IG_POST" | "LEAD" | "ADS_METRIC",
  rows: unknown[],
  fileName: string,
  origin: "CSV" | "GOOGLE_SHEET" = "CSV",
): Promise<ImportResult> {
  if (rows.length === 0) throw new Error("Tidak ada baris valid untuk diimpor.");
  if (rows.length > 2000) throw new Error("Maksimal 2000 baris per impor.");
  const sourceType = origin; // Layer A: asal data tercatat di setiap baris

  const batch = await db.importBatch.create({
    data: { type, fileName, rowCount: rows.length, origin },
  });
  const skipped: string[] = [];
  let inserted = 0;

  if (type === "IG_POST") {
    for (const raw of rows) {
      const r = igRow.parse(raw);
      const dayStart = new Date(r.tanggal); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
      const dup = await db.igPost.findFirst({
        where: { postedAt: { gte: dayStart, lt: dayEnd }, hook: r.hook },
      });
      if (dup) { skipped.push(`${r.tanggal.toISOString().slice(0, 10)} — ${r.hook.slice(0, 40)}`); continue; }
      const created = await db.igPost.create({
        data: {
          postedAt: r.tanggal, format: r.format, pillar: r.pilar, hook: r.hook,
          cta: r.cta || null, reach: r.reach, reachNonFollower: r.reach_non_follower,
          plays: r.plays, likes: r.likes, comments: r.komentar, saves: r.saves,
          shares: r.shares, profileVisits: r.kunjungan_profil, follows: r.follows,
          dmClicks: r.klik_dm, waClicks: r.klik_wa, leadsManual: r.leads,
          qualifiedLeadsManual: r.leads_berkualitas, importBatchId: batch.id, sourceType,
        },
      });
      const score = computeSignalScore(mapPostToInput({ ...created, leads: [] }));
      if (score !== null) await db.igPost.update({ where: { id: created.id }, data: { signalScore: score } });
      inserted++;
    }
  } else if (type === "LEAD") {
    for (const raw of rows) {
      const r = leadRow.parse(raw);
      const dup = await db.lead.findFirst({ where: { name: r.nama } });
      if (dup) { skipped.push(r.nama); continue; }
      const signals = {
        signalBudget: r.sinyal_budget ?? 0, signalProjectType: r.sinyal_proyek ?? 0,
        signalLocation: r.sinyal_lokasi ?? 0, signalUrgency: r.sinyal_urgensi ?? 0,
        signalSeriousness: r.sinyal_keseriusan ?? 0,
      };
      await db.lead.create({
        data: {
          name: r.nama, sourceType: r.sumber, status: r.status, ...signals,
          qualityScore: Object.values(signals).reduce((a, b) => a + b, 0),
          qualAnswersCount: r.jawaban_kualifikasi ?? 0,
          estimatedValueJuta: r.estimasi_nilai_juta ?? 0,
          createdAt: r.tanggal_masuk ?? new Date(),
          lastContactAt: r.tanggal_masuk ?? new Date(),
          importBatchId: batch.id,
          sourceDataType: sourceType,
        },
      });
      inserted++;
    }
  } else {
    for (const raw of rows) {
      const r = adsRow.parse(raw);
      const campaign = await db.campaign.upsert({
        where: { name: r.kampanye },
        update: {},
        create: { name: r.kampanye, channel: "META", objective: "CHAT_WA" },
      });
      const dup = await db.campaignMetricDaily.findFirst({
        where: { campaignId: campaign.id, adSetId: null, date: r.tanggal },
      });
      if (dup) { skipped.push(`${r.kampanye} — ${r.tanggal.toISOString().slice(0, 10)}`); continue; }
      await db.campaignMetricDaily.create({
        data: {
          campaignId: campaign.id, date: r.tanggal, spendRibu: Math.round(r.spend_ribu),
          impressions: r.impresi, clicks: r.klik, resultsPlatform: r.hasil_platform,
          importBatchId: batch.id, sourceType,
        },
      });
      inserted++;
    }
  }

  await db.importBatch.update({ where: { id: batch.id }, data: { rowCount: inserted } });
  revalidatePath("/", "layout");
  return { ok: true, batchId: batch.id, inserted, skippedDuplicates: skipped };
}

export async function cancelImportBatch(batchId: string): Promise<void> {
  const batch = await db.importBatch.findUniqueOrThrow({ where: { id: batchId } });
  if (batch.type === "IG_POST") await db.igPost.deleteMany({ where: { importBatchId: batchId } });
  else if (batch.type === "LEAD") await db.lead.deleteMany({ where: { importBatchId: batchId } });
  else await db.campaignMetricDaily.deleteMany({ where: { importBatchId: batchId } });
  await db.importBatch.delete({ where: { id: batchId } });
  revalidatePath("/", "layout");
}
