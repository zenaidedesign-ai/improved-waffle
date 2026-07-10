"use server";

// Muat / hapus data contoh. Hanya menyentuh baris isExample:true —
// data asli owner tidak pernah tersentuh oleh aksi ini.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { buildSeed } from "@/lib/domain/seedData";
import { computeGateVerdict } from "@/lib/engine/gates";
import { computeSignalScore } from "@/lib/engine/igDiagnosis";
import { mapPostToInput } from "@/lib/data";
import type { AuditAnswerInput } from "@/lib/engine/types";

export async function loadExampleData(): Promise<void> {
  const seed = buildSeed(new Date());

  const makeRun = async (
    type: string,
    runDate: Date,
    answers: ReadonlyArray<{ itemKey: string; status: string; isBlocking: boolean; answerText: string | null }>,
  ) => {
    const verdict = computeGateVerdict(answers as unknown as AuditAnswerInput[]).verdict;
    await db.auditRun.create({
      data: {
        type,
        runDate,
        verdict,
        isExample: true,
        answers: {
          create: answers.map((a) => ({
            itemKey: a.itemKey,
            status: a.status,
            isBlocking: a.isBlocking,
            answerText: a.answerText,
          })),
        },
      },
    });
  };

  await makeRun("META_ACCOUNT", seed.auditDates.meta, seed.metaAuditAnswers);
  await makeRun("REKOMENDASI", seed.auditDates.rekomendasi, seed.rekomendasiAnswers);
  await makeRun("TRACKING", seed.auditDates.tracking, seed.trackingAnswers);

  for (const p of seed.posts) {
    const created = await db.igPost.create({ data: { ...p, isExample: true } });
    const score = computeSignalScore(mapPostToInput({ ...created, leads: [] }));
    if (score !== null) {
      await db.igPost.update({ where: { id: created.id }, data: { signalScore: score } });
    }
  }

  for (const s of seed.snapshots) {
    await db.igAccountSnapshot.upsert({
      where: { weekStart: s.weekStart },
      update: {},
      create: { ...s, isExample: true },
    });
  }

  for (const c of seed.campaigns) {
    const { metrics, ...campaign } = c;
    await db.campaign.create({
      data: {
        ...campaign,
        isExample: true,
        metrics: { create: metrics.map((m) => ({ ...m, isExample: true })) },
      },
    });
  }

  for (const l of seed.leads) {
    const qualityScore =
      l.signalBudget + l.signalProjectType + l.signalLocation + l.signalUrgency + l.signalSeriousness;
    await db.lead.create({ data: { ...l, qualityScore, isExample: true } });
  }

  const { analysis, ...comp } = seed.competitor;
  await db.competitor.create({
    data: { ...comp, isExample: true, analyses: { create: { ...analysis, isExample: true } } },
  });
  for (const pp of seed.painPoints) await db.painPoint.create({ data: { ...pp, isExample: true } });
  for (const ob of seed.objections) await db.objection.create({ data: { ...ob, isExample: true } });
  for (const ex of seed.experiments) await db.experiment.create({ data: { ...ex, isExample: true } });

  revalidatePath("/", "layout");
}

/** Hitung baris contoh per tabel — dipakai layar sebelum menawarkan penghapusan. */
export async function countExampleRows(): Promise<{ total: number; perTable: Array<{ table: string; n: number }> }> {
  const entries: Array<[string, number]> = [
    ["Lead", await db.lead.count({ where: { isExample: true } })],
    ["Post IG", await db.igPost.count({ where: { isExample: true } })],
    ["Kampanye", await db.campaign.count({ where: { isExample: true } })],
    ["Audit", await db.auditRun.count({ where: { isExample: true } })],
    ["Snapshot IG", await db.igAccountSnapshot.count({ where: { isExample: true } })],
    ["Kompetitor", await db.competitor.count({ where: { isExample: true } })],
    ["Eksperimen", await db.experiment.count({ where: { isExample: true } })],
    ["Pain point", await db.painPoint.count({ where: { isExample: true } })],
    ["Keberatan", await db.objection.count({ where: { isExample: true } })],
    ["Sesi war room", await db.warRoomSession.count({ where: { isExample: true } })],
  ];
  const perTable = entries.filter(([, n]) => n > 0).map(([table, n]) => ({ table, n }));
  return { total: perTable.reduce((s, t) => s + t.n, 0), perTable };
}

/**
 * Penghapusan destruktif WAJIB dikonfirmasi: tanpa centang "confirm" dari form,
 * aksi ini tidak menghapus apa pun. Hanya baris isExample:true yang tersentuh —
 * data asli owner secara struktural tidak mungkin ikut terhapus lewat jalur ini.
 */
export async function deleteExampleData(formData: FormData): Promise<void> {
  if (formData.get("confirm") !== "on") return; // tidak dikonfirmasi ⇒ tidak ada yang dihapus
  // Urutan sesuai dependensi relasi.
  await db.verdict.deleteMany({ where: { isExample: true } });
  await db.warRoomSession.deleteMany({ where: { isExample: true } });
  await db.fitScore.deleteMany({ where: { isExample: true } });
  await db.contentIdea.deleteMany({ where: { isExample: true } });
  await db.lead.deleteMany({ where: { isExample: true } });
  await db.campaign.deleteMany({ where: { isExample: true } }); // cascade: adSet, metrics
  await db.igPost.deleteMany({ where: { isExample: true } });
  await db.igAccountSnapshot.deleteMany({ where: { isExample: true } });
  await db.experiment.deleteMany({ where: { isExample: true } });
  await db.competitor.deleteMany({ where: { isExample: true } }); // cascade: analyses
  await db.painPoint.deleteMany({ where: { isExample: true } });
  await db.objection.deleteMany({ where: { isExample: true } });
  await db.auditRun.deleteMany({ where: { isExample: true } }); // cascade: answers
  revalidatePath("/", "layout");
}
