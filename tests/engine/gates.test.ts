import { describe, expect, it } from "vitest";
import {
  buildRepairPlan,
  combineGate0,
  computeGateVerdict,
  gateLock,
} from "../../src/lib/engine/gates";
import { META_ACCOUNT_ITEMS } from "../../src/lib/domain/auditItems";
import type { AuditAnswerInput } from "../../src/lib/engine/types";

const ans = (itemKey: string, status: AuditAnswerInput["status"], isBlocking: boolean): AuditAnswerInput => ({ itemKey, status, isBlocking });

describe("computeGateVerdict", () => {
  it("blocking merah ⇒ MERAH", () => {
    const r = computeGateVerdict([ans("A1", "MERAH", true), ans("A7", "HIJAU", false)]);
    expect(r.verdict).toBe("MERAH");
    expect(r.blockingProblems).toEqual(["A1"]);
  });

  it("blocking BELUM_DICEK ⇒ MERAH (tidak tahu ≠ aman)", () => {
    const r = computeGateVerdict([ans("A1", "BELUM_DICEK", true)]);
    expect(r.verdict).toBe("MERAH");
    expect(r.blockingProblems).toContain("A1");
  });

  it("hanya non-blocking bermasalah ⇒ KUNING", () => {
    const r = computeGateVerdict([ans("A1", "HIJAU", true), ans("A7", "MERAH", false)]);
    expect(r.verdict).toBe("KUNING");
  });

  it("blocking KUNING tidak mengunci tapi tercatat ⇒ KUNING", () => {
    const r = computeGateVerdict([ans("A1", "KUNING", true)]);
    expect(r.verdict).toBe("KUNING");
    expect(r.blockingProblems).toHaveLength(0);
  });

  it("semua hijau ⇒ HIJAU", () => {
    const r = computeGateVerdict([ans("A1", "HIJAU", true), ans("A7", "HIJAU", false)]);
    expect(r.verdict).toBe("HIJAU");
  });
});

describe("combineGate0", () => {
  it("terburuk dari dua audit menang", () => {
    expect(combineGate0("HIJAU", "MERAH")).toBe("MERAH");
    expect(combineGate0("KUNING", "HIJAU")).toBe("KUNING");
    expect(combineGate0("HIJAU", "HIJAU")).toBe("HIJAU");
  });
  it("salah satu belum diaudit ⇒ maksimal KUNING", () => {
    expect(combineGate0("HIJAU", null)).toBe("KUNING");
    expect(combineGate0(null, "MERAH")).toBe("MERAH");
  });
  it("keduanya belum ⇒ null", () => {
    expect(combineGate0(null, null)).toBeNull();
  });
});

describe("gateLock — titik kunci tunggal", () => {
  it("belum pernah diaudit ⇒ terkunci PERBAIKI_AKUN_DULU", () => {
    const r = gateLock(null, null);
    expect(r.locked).toBe(true);
    expect(r.lockVerdict?.decision).toBe("PERBAIKI_AKUN_DULU");
    expect(r.lockVerdict?.lockedByGate).toBe("GERBANG_0");
  });

  it("gate0 MERAH ⇒ terkunci akun", () => {
    const r = gateLock("MERAH", "HIJAU");
    expect(r.locked).toBe(true);
    expect(r.lockVerdict?.decision).toBe("PERBAIKI_AKUN_DULU");
  });

  it("gate0 lolos, gate1 MERAH ⇒ terkunci tracking", () => {
    const r = gateLock("KUNING", "MERAH");
    expect(r.locked).toBe(true);
    expect(r.lockVerdict?.decision).toBe("PERBAIKI_TRACKING_DULU");
    expect(r.lockVerdict?.lockedByGate).toBe("GERBANG_1");
  });

  it("KUNING tidak mengunci", () => {
    expect(gateLock("KUNING", "KUNING").locked).toBe(false);
    expect(gateLock("HIJAU", "HIJAU").locked).toBe(false);
  });
});

describe("buildRepairPlan", () => {
  it("urutan: blocking merah dulu, lalu blocking kuning, lalu non-blocking", () => {
    const plan = buildRepairPlan(
      [
        ans("A7", "MERAH", false),
        ans("A1", "KUNING", true),
        ans("A2", "MERAH", true),
        ans("A5", "HIJAU", true),
      ],
      META_ACCOUNT_ITEMS,
    );
    expect(plan.map((s) => s.itemKey)).toEqual(["A2", "A1", "A7"]);
    expect(plan[0].priority).toBe(1);
    expect(plan[0].question).toContain("Business Manager");
  });
});
