// Lead Intelligence — triase deterministik, probabilitas closing (estimasi
// kasar berlabel), deteksi ghosting, antrian follow-up.
// Aturan ditulis eksplisit supaya owner bisa membaca KENAPA sebuah lead
// diberi label — bukan kotak hitam.

import { CONFIG } from "../domain/config";

export const TRIAGE = ["HOT_LEAD", "URGENT", "FOLLOW_UP", "NURTURE", "IGNORE", "DEAD_LEAD"] as const;
export type Triage = (typeof TRIAGE)[number];

export const TRIAGE_LABEL: Record<Triage, string> = {
  HOT_LEAD: "Hot lead",
  URGENT: "Urgen hari ini",
  FOLLOW_UP: "Follow-up",
  NURTURE: "Rawat pelan",
  IGNORE: "Abaikan",
  DEAD_LEAD: "Lead mati",
};

export interface LeadTriageInput {
  id: string;
  name: string;
  status: string;
  qualityScore: number;
  qualAnswersCount: number;
  estimatedValueJuta: number;
  createdAt: Date;
  lastContactAt: Date | null;
  surveyAt: Date | null;
  proposalSentAt: Date | null;
}

export interface TriageResult {
  triage: Triage;
  reason: string; // Bahasa Indonesia, ditampilkan apa adanya
  silentDays: number;
  ghostingRisk: boolean;
  closingProbabilityPct: number; // estimasi kasar — SELALU dilabeli begitu di UI
}

const TERMINAL = ["CLOSING_MENANG", "CLOSING_KALAH", "GHOSTING"];
const ADVANCED = ["SURVEI_TERJADWAL", "SURVEI_SELESAI", "PROPOSAL_TERKIRIM", "NEGOSIASI"];

/** Basis probabilitas per status — dari logika corong, bukan data historis
 *  (belum ada). Setelah ≥ 20 lead tertutup, kalibrasi ulang dari data nyata. */
const BASE_PROB: Record<string, number> = {
  CHAT_BARU: 5,
  MERESPONS: 10,
  BERKUALITAS: 25,
  SURVEI_TERJADWAL: 40,
  SURVEI_SELESAI: 55,
  PROPOSAL_TERKIRIM: 65,
  NEGOSIASI: 80,
  CLOSING_MENANG: 100,
  CLOSING_KALAH: 0,
  GHOSTING: 0,
};

export function silentDaysOf(lead: LeadTriageInput, now: Date): number {
  const ref = lead.lastContactAt ?? lead.createdAt;
  return Math.max(0, Math.floor((now.getTime() - ref.getTime()) / (24 * 3600 * 1000)));
}

export function closingProbability(lead: LeadTriageInput, now: Date): number {
  const base = BASE_PROB[lead.status] ?? 5;
  if (lead.status === "CLOSING_MENANG") return 100;
  if (TERMINAL.includes(lead.status)) return 0;
  // Penyesuaian skor kualitas: ±10 poin (skor 50 = netral).
  const scoreAdj = ((lead.qualityScore - 50) / 50) * 10;
  // Peluruhan senyap: −3 per hari setelah hari ke-2, maksimal −30.
  const silent = silentDaysOf(lead, now);
  const decay = Math.min(30, Math.max(0, silent - CONFIG.leadMaxSilentDays) * 3);
  return Math.round(Math.min(95, Math.max(1, base + scoreAdj - decay)));
}

export function isQualifiedInput(lead: LeadTriageInput): boolean {
  return (
    lead.qualityScore >= CONFIG.leadQualifiedMinScore &&
    lead.qualAnswersCount >= CONFIG.leadQualifiedMinAnswers
  );
}

export function triageLead(lead: LeadTriageInput, now: Date): TriageResult {
  const silentDays = silentDaysOf(lead, now);
  const ghostingRisk =
    !TERMINAL.includes(lead.status) && silentDays >= 2 * CONFIG.leadMaxSilentDays;
  const prob = closingProbability(lead, now);
  const qualified = isQualifiedInput(lead);
  const H = 3600 * 1000;

  const done = (triage: Triage, reason: string): TriageResult => ({
    triage,
    reason,
    silentDays,
    ghostingRisk,
    closingProbabilityPct: prob,
  });

  // 1. Mati: kalah / ghosting / senyap sangat lama dengan skor rendah.
  if (lead.status === "CLOSING_KALAH") return done("DEAD_LEAD", "Closing kalah — arsipkan, catat alasannya.");
  if (lead.status === "GHOSTING") return done("DEAD_LEAD", "Sudah ditandai ghosting.");
  if (lead.status === "CLOSING_MENANG") return done("HOT_LEAD", "Closing menang — pastikan serah terima & minta referral.");
  if (silentDays >= 14 && lead.qualityScore < 40)
    return done("DEAD_LEAD", `Senyap ${silentDays} hari dengan skor rendah (${lead.qualityScore}) — tutup atau kirim pesan terakhir.`);

  // 2. Urgen: momen berisiko waktu.
  if (lead.surveyAt && lead.surveyAt.getTime() - now.getTime() < 48 * H && lead.surveyAt.getTime() > now.getTime() - 24 * H)
    return done("URGENT", "Survei < 48 jam — konfirmasi jadwal & siapkan tim.");
  if (lead.proposalSentAt && silentDays >= 3 && lead.status === "PROPOSAL_TERKIRIM")
    return done("URGENT", `Proposal terkirim, tanpa balasan ${silentDays} hari — telepon, jangan cuma chat.`);
  if (qualified && silentDays >= CONFIG.leadMaxSilentDays)
    return done(
      "URGENT",
      `Lead berkualitas (skor ${lead.qualityScore}, estimasi Rp ${lead.estimatedValueJuta} jt) senyap ${silentDays} hari — revenue sedang bocor.`,
    );

  // 3. Hot: berkualitas dan bergerak.
  if (qualified && ADVANCED.includes(lead.status))
    return done("HOT_LEAD", `Berkualitas dan sudah di tahap ${lead.status.toLowerCase().replaceAll("_", " ")} — kawal sampai closing.`);
  if (qualified) return done("HOT_LEAD", `Skor ${lead.qualityScore} dengan ${lead.qualAnswersCount} jawaban kualifikasi — dorong ke survei.`);

  // 4. Follow-up: merespons, skor menengah.
  if (lead.qualityScore >= 40 && silentDays >= CONFIG.leadMaxSilentDays)
    return done("FOLLOW_UP", `Skor menengah (${lead.qualityScore}), senyap ${silentDays} hari — satu follow-up berkualitas bisa menaikkan kelas.`);
  if (lead.qualityScore >= 40) return done("FOLLOW_UP", `Skor menengah (${lead.qualityScore}) — lanjutkan kualifikasi (target ≥ 3 jawaban).`);

  // 5. Abaikan: sinyal sangat rendah, tidak menjawab kualifikasi.
  if (lead.qualityScore < 20 && lead.qualAnswersCount === 0 && silentDays >= CONFIG.leadMaxSilentDays)
    return done("IGNORE", "Skor sangat rendah, nol jawaban kualifikasi, dan senyap — kemungkinan besar penanya harga.");

  // 6. Sisanya: rawat pelan.
  return done("NURTURE", `Skor ${lead.qualityScore} — belum layak didorong keras; kirim konten edukasi budget/proses.`);
}

export interface FollowUpItem extends TriageResult {
  id: string;
  name: string;
  status: string;
  estimatedValueJuta: number;
}

/** Antrian follow-up HARI INI: urgen dulu, lalu nilai terbesar. */
export function followUpQueue(leads: LeadTriageInput[], now: Date): FollowUpItem[] {
  const rank: Record<Triage, number> = {
    URGENT: 0,
    HOT_LEAD: 1,
    FOLLOW_UP: 2,
    NURTURE: 3,
    IGNORE: 4,
    DEAD_LEAD: 5,
  };
  return leads
    .map((l) => ({ ...triageLead(l, now), id: l.id, name: l.name, status: l.status, estimatedValueJuta: l.estimatedValueJuta }))
    .filter(
      (t) =>
        (t.triage === "URGENT" || t.triage === "FOLLOW_UP" || (t.triage === "HOT_LEAD" && t.silentDays >= CONFIG.leadMaxSilentDays)) &&
        !TERMINAL.includes(t.status),
    )
    .sort((a, b) => rank[a.triage] - rank[b.triage] || b.estimatedValueJuta - a.estimatedValueJuta);
}
