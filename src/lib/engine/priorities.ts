// Top 5 prioritas hari ini — perakitan deterministik, urut dari yang paling
// menghentikan revenue. Maksimal 5; sisanya sengaja dibuang (fokus > lengkap).

import type { Keputusan } from "../domain/enums";
import type { GateLockResult } from "./gates";
import type { VerdictProposal } from "./types";
import type { FollowUpItem } from "./leadTriage";

export interface PriorityItem {
  rank: number;
  title: string;
  detail: string;
  href: string;
  decision: Keputusan | null;
}

export interface PriorityInput {
  lock: GateLockResult;
  killCampaigns: Array<{ id: string; name: string; verdict: VerdictProposal }>;
  moveBudget: VerdictProposal | null;
  urgentFollowUps: FollowUpItem[];
  winners: Array<{ postId: string; hook: string; verdict: VerdictProposal }>;
  mixVerdict: VerdictProposal | null;
  openWarRoomDecisions: Array<{ decision: string; reason: string }>;
}

export function buildTop5(input: PriorityInput): PriorityItem[] {
  const items: Omit<PriorityItem, "rank">[] = [];

  // 1. Gerbang terkunci mengalahkan segalanya.
  if (input.lock.locked && input.lock.lockVerdict) {
    const v = input.lock.lockVerdict;
    items.push({
      title: v.decision === "PERBAIKI_TRACKING_DULU" ? "Perbaiki tracking dulu" : "Perbaiki fondasi akun dulu",
      detail: v.explanation,
      href: v.decision === "PERBAIKI_TRACKING_DULU" ? "/audit/tracking" : "/audit/meta-account",
      decision: v.decision,
    });
  }

  // 2. Uang yang sedang terbakar.
  for (const c of input.killCampaigns) {
    items.push({
      title: `Matikan kampanye "${c.name}"`,
      detail: c.verdict.explanation,
      href: `/kampanye/${c.id}`,
      decision: c.verdict.decision,
    });
  }
  if (input.moveBudget) {
    items.push({
      title: "Pindahkan budget ke kampanye pemenang",
      detail: input.moveBudget.explanation,
      href: "/kampanye",
      decision: input.moveBudget.decision,
    });
  }

  // 3. Revenue yang sedang bocor: lead urgen (maks 2 baris di daftar prioritas).
  for (const f of input.urgentFollowUps.filter((x) => x.triage === "URGENT").slice(0, 2)) {
    items.push({
      title: `Follow-up ${f.name}`,
      detail: f.reason,
      href: "/leads",
      decision: null,
    });
  }

  // 4. Peluang: pemenang organik → iklan (maks 1).
  const w = input.winners[0];
  if (w) {
    items.push({
      title: `Jadikan iklan: "${w.hook.slice(0, 60)}"`,
      detail: w.verdict.explanation,
      href: "/instagram",
      decision: w.verdict.decision,
    });
  }

  // 5. Strategi konten.
  if (input.mixVerdict) {
    items.push({
      title: "Ubah campuran konten — terlalu berat portofolio",
      detail: input.mixVerdict.explanation,
      href: "/instagram",
      decision: input.mixVerdict.decision,
    });
  }

  // 6. Keputusan war room yang masih terbuka.
  for (const d of input.openWarRoomDecisions) {
    items.push({
      title: "Eksekusi keputusan War Room",
      detail: d.reason,
      href: "/war-room",
      decision: null,
    });
  }

  return items.slice(0, 5).map((x, i) => ({ ...x, rank: i + 1 }));
}
