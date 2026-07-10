// Gerbang Fase B — pembaca keadaan bersama untuk layar Pilot & Knowledge.
// Menghitung 8 syarat data nyata dari DB lalu menyerahkannya ke phaseBGate (engine murni).

import { db } from "@/lib/db";
import { phaseBGate, pilotDay, type PhaseBGate, type PilotDayInfo } from "@/lib/engine/pilot";

const REAL = { isExample: false } as const;

export async function getPhaseBGate(now = new Date()): Promise<{ gate: PhaseBGate; day: PilotDayInfo }> {
  const [
    realLeads, realPosts, adsCsvBatches, realWarRooms, pilotLearnings,
    realLearnings, exampleLeads, examplePosts, exampleCampaigns, startedSetting,
  ] = await Promise.all([
    db.lead.count({ where: REAL }),
    db.igPost.count({ where: REAL }),
    db.importBatch.count({ where: { type: "ADS_METRIC" } }),
    db.warRoomSession.count({ where: REAL }),
    db.learning.count({ where: { insight: { startsWith: "[PILOT]" } } }),
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

  const day = pilotDay(startedSetting ? new Date(startedSetting.value) : null, now);
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
  return { gate, day };
}
