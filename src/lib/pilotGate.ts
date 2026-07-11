// Kemajuan pilot & Gerbang Fase B — SATU-SATUNYA tempat kueri hitungan pilot
// (guardrails: "tidak ada hitungan pilot di dua tempat"). Halaman Pilot dan
// Knowledge hanya MENAMPILKAN keluaran fungsi ini, tidak menghitung ulang.

import { db } from "@/lib/db";
import {
  computePilotProgress,
  phaseBGate,
  PILOT_PREFIX,
  pilotDay,
  type PhaseBGate,
  type PilotDayInfo,
  type PilotProgress,
} from "@/lib/engine/pilot";

/** Filter baku data nyata — satu definisi untuk semua kueri pilot. */
export const REAL = { isExample: false } as const;

export interface PilotState {
  gate: PhaseBGate;
  day: PilotDayInfo;
  progress: PilotProgress;
  counts: {
    realLeads: number;
    realPosts: number;
    adsCsvBatches: number;
    realWarRooms: number;
    auditTypesRun: number;
    realSnapshots: number;
    pilotLearnings: number;
    exampleLeads: number;
  };
  startedAt: Date | null;
}

export async function getPhaseBGate(now = new Date()): Promise<PilotState> {
  const [
    realLeads, realPosts, adsCsvBatches, realWarRooms, auditTypes, realSnapshots,
    pilotLearnings, realLearnings, exampleLeads, examplePosts, exampleCampaigns, startedSetting,
  ] = await Promise.all([
    db.lead.count({ where: REAL }),
    db.igPost.count({ where: REAL }),
    db.importBatch.count({ where: { type: "ADS_METRIC" } }),
    db.warRoomSession.count({ where: REAL }),
    db.auditRun.findMany({ where: REAL, select: { type: true }, distinct: ["type"] }),
    db.igAccountSnapshot.count({ where: REAL }),
    db.learning.count({ where: { insight: { startsWith: PILOT_PREFIX } } }),
    db.learning.findMany({
      where: REAL,
      select: {
        evidence: {
          where: { isExample: false, polarity: "MENDUKUNG", contributesToScore: true, sourceKind: "DATA_INTERNAL" },
          select: { id: true },
        },
      },
    }),
    db.lead.count({ where: { isExample: true } }),
    db.igPost.count({ where: { isExample: true } }),
    db.campaign.count({ where: { isExample: true } }),
    db.setting.findUnique({ where: { key: "pilot.startedAt" } }),
  ]);

  const startedAt = startedSetting ? new Date(startedSetting.value) : null;
  const day = pilotDay(startedAt, now);
  const counts = {
    realLeads,
    realPosts,
    adsCsvBatches,
    realWarRooms,
    auditTypesRun: auditTypes.length,
    realSnapshots,
    pilotLearnings,
    exampleLeads,
  };
  const gate = phaseBGate({
    realLeads,
    realPosts,
    realAdsCsvImports: adsCsvBatches,
    realWarRooms,
    pilotLearnings,
    repeatedRealPatterns: realLearnings.filter((l) => l.evidence.length >= 2).length,
    exampleRowsRemaining: exampleLeads + examplePosts + exampleCampaigns,
    pilotDayNumber: day.day,
  });
  const progress = computePilotProgress({
    realLeads,
    realPosts,
    realAdsCsvImports: adsCsvBatches,
    warRoomSessions: realWarRooms,
    auditTypesRun: auditTypes.length,
    realSnapshots,
    pilotLearnings,
  });
  return { gate, day, progress, counts, startedAt };
}
