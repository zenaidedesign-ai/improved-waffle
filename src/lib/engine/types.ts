// Tipe input/output mesin aturan — TANPA import Prisma/Next/React.
// Server action mengambil baris DB, memetakan ke tipe ini, memanggil engine,
// lalu menyimpan hasilnya (skor cache + baris Verdict).

import type { Keputusan, Keyakinan, StatusLampu } from "../domain/enums";

export interface VerdictProposal {
  decision: Keputusan;
  ruleFired: string;
  trigger: Record<string, number | string | boolean | null>;
  confidence: Keyakinan;
  lockedByGate?: "GERBANG_0" | "GERBANG_1";
  /** Bahasa Indonesia — ditampilkan apa adanya di UI */
  explanation: string;
}

export interface AuditAnswerInput {
  itemKey: string;
  status: StatusLampu | "BELUM_DICEK";
  isBlocking: boolean;
}

export interface GateResult {
  verdict: StatusLampu;
  blockingProblems: string[]; // itemKey merah/belum-dicek yang blocking
  nonBlockingProblems: string[];
  unanswered: string[];
}

export interface IgPostInput {
  id: string;
  postedAt: Date;
  format: string;
  pillar: string;
  hook: string;
  cta: string | null;
  reach: number | null;
  reachNonFollower: number | null;
  plays: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  profileVisits: number | null;
  follows: number | null;
  dmClicks: number | null;
  waClicks: number | null;
  leadsAttributed: number; // max(baris Lead tertaut, isian manual)
  qualifiedLeadsAttributed: number;
}

export interface CostChain {
  spendRibu: number;
  impressions: number | null;
  clicks: number | null;
  ctrPct: number | null;
  chats: number;
  costPerChatRibu: number | null;
  qualifiedLeads: number;
  cpqlRibu: number | null;
  qualRatePct: number | null; // qualified / chats
  surveys: number;
  costPerSurveyRibu: number | null;
  pipelineValueJuta: number;
  resultsPlatform: number | null; // pembanding kejujuran tracking — bukan dasar vonis
}
