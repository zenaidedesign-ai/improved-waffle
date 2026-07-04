// Gerbang 0 (akun Meta + kelayakan rekomendasi) dan Gerbang 1 (tracking).
// gateLock() adalah SATU-SATUNYA titik keputusan kunci — setiap layar yang
// menghasilkan vonis WAJIB memanggilnya lebih dulu. Layar baru yang lupa
// memanggil = bug; lihat tests/engine/gates.test.ts.

import type { StatusLampu } from "../domain/enums";
import type { AuditAnswerInput, GateResult, VerdictProposal } from "./types";
import type { AuditItemDef } from "../domain/auditItems";

export function computeGateVerdict(answers: AuditAnswerInput[]): GateResult {
  const blockingProblems: string[] = [];
  const nonBlockingProblems: string[] = [];
  const unanswered: string[] = [];

  for (const a of answers) {
    if (a.status === "BELUM_DICEK") {
      unanswered.push(a.itemKey);
      // Item blocking yang belum dicek dianggap masalah — tidak tahu ≠ aman.
      if (a.isBlocking) blockingProblems.push(a.itemKey);
      continue;
    }
    if (a.status === "MERAH") {
      (a.isBlocking ? blockingProblems : nonBlockingProblems).push(a.itemKey);
    } else if (a.status === "KUNING" && !a.isBlocking) {
      nonBlockingProblems.push(a.itemKey);
    } else if (a.status === "KUNING" && a.isBlocking) {
      // Kuning pada item blocking tidak mengunci, tapi tercatat sebagai risiko.
      nonBlockingProblems.push(a.itemKey);
    }
  }

  let verdict: StatusLampu = "HIJAU";
  if (blockingProblems.length > 0) verdict = "MERAH";
  else if (nonBlockingProblems.length > 0) verdict = "KUNING";

  return { verdict, blockingProblems, nonBlockingProblems, unanswered };
}

export interface RepairStep {
  itemKey: string;
  question: string;
  howToCheck: string;
  priority: number; // 1 = paling dulu
}

/** Rencana perbaikan berurutan: blocking merah → blocking kuning → non-blocking. */
export function buildRepairPlan(
  answers: AuditAnswerInput[],
  items: AuditItemDef[],
): RepairStep[] {
  const byKey = new Map(items.map((i) => [i.key, i]));
  const rank = (a: AuditAnswerInput): number => {
    const bad = a.status === "MERAH" || a.status === "BELUM_DICEK";
    if (a.isBlocking && bad) return 0;
    if (a.isBlocking && a.status === "KUNING") return 1;
    if (!a.isBlocking && bad) return 2;
    if (!a.isBlocking && a.status === "KUNING") return 3;
    return 99;
  };
  return answers
    .filter((a) => rank(a) < 99)
    .sort((a, b) => rank(a) - rank(b))
    .map((a, idx) => {
      const def = byKey.get(a.itemKey);
      return {
        itemKey: a.itemKey,
        question: def?.question ?? a.itemKey,
        howToCheck: def?.howToCheck ?? "",
        priority: idx + 1,
      };
    });
}

/** Gerbang 0 = kondisi TERBURUK dari audit akun Meta dan audit rekomendasi. */
export function combineGate0(
  metaVerdict: StatusLampu | null,
  rekomendasiVerdict: StatusLampu | null,
): StatusLampu | null {
  if (metaVerdict === null && rekomendasiVerdict === null) return null;
  const order: Record<StatusLampu, number> = { MERAH: 0, KUNING: 1, HIJAU: 2 };
  const worst = [metaVerdict, rekomendasiVerdict]
    .filter((v): v is StatusLampu => v !== null)
    .sort((a, b) => order[a] - order[b])[0];
  // Salah satu belum pernah diaudit → paling baik Kuning (belum terbukti aman).
  if (metaVerdict === null || rekomendasiVerdict === null) {
    return worst === "MERAH" ? "MERAH" : "KUNING";
  }
  return worst;
}

export interface GateLockResult {
  locked: boolean;
  lockVerdict?: VerdictProposal;
}

/**
 * Titik kunci tunggal. null = belum pernah diaudit = dianggap MERAH
 * ("belum diaudit" bukan alasan untuk percaya diri).
 */
export function gateLock(
  gate0: StatusLampu | null,
  gate1: StatusLampu | null,
): GateLockResult {
  if (gate0 === null || gate0 === "MERAH") {
    return {
      locked: true,
      lockVerdict: {
        decision: "PERBAIKI_AKUN_DULU",
        ruleFired: gate0 === null ? "GATE0_BELUM_DIAUDIT" : "GATE0_MERAH",
        trigger: { gate0: gate0 ?? "BELUM_DIAUDIT" },
        confidence: "TINGGI",
        lockedByGate: "GERBANG_0",
        explanation:
          gate0 === null
            ? "Vonis dikunci — audit akun belum pernah dijalankan. Jalankan Audit Akun Meta dan Audit Kelayakan Rekomendasi dulu."
            : "Vonis dikunci — ada masalah fondasi akun yang memblokir. Perbaiki akun dulu sebelum menilai kampanye atau konten.",
      },
    };
  }
  if (gate1 === null || gate1 === "MERAH") {
    return {
      locked: true,
      lockVerdict: {
        decision: "PERBAIKI_TRACKING_DULU",
        ruleFired: gate1 === null ? "GATE1_BELUM_DIAUDIT" : "GATE1_MERAH",
        trigger: { gate1: gate1 ?? "BELUM_DIAUDIT" },
        confidence: "TINGGI",
        lockedByGate: "GERBANG_1",
        explanation:
          gate1 === null
            ? "Vonis dikunci — audit tracking belum pernah dijalankan. Tanpa tracking yang bisa dipercaya, semua angka adalah tebakan."
            : "Vonis dikunci — tracking belum bisa dipercaya. Perbaiki tracking dulu; angka biaya per hasil saat ini adalah tebakan.",
      },
    };
  }
  return { locked: false };
}
