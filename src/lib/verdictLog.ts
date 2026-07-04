// Satu-satunya jalur tulis ke tabel Verdict.
// Menerima VerdictProposal bertipe Keputusan — vonis di luar kosakata tetap
// mustahil secara tipe.

import { db } from "./db";
import type { VerdictProposal } from "./engine/types";

export async function recordVerdict(
  subjectType: string,
  proposal: VerdictProposal,
  refs: {
    subjectId?: string;
    auditRunId?: string;
    igPostId?: string;
    experimentId?: string;
    campaignId?: string;
    isExample?: boolean;
  } = {},
): Promise<void> {
  await db.verdict.create({
    data: {
      subjectType,
      subjectId: refs.subjectId,
      auditRunId: refs.auditRunId,
      igPostId: refs.igPostId,
      experimentId: refs.experimentId,
      campaignId: refs.campaignId,
      decision: proposal.decision,
      ruleFired: proposal.ruleFired,
      triggerJson: JSON.stringify(proposal.trigger),
      confidence: proposal.confidence,
      lockedByGate: proposal.lockedByGate ?? null,
      isExample: refs.isExample ?? false,
    },
  });
}
