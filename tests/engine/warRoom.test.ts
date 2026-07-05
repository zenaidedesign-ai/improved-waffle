import { describe, expect, it } from "vitest";
import { buildWeeklyCompare, weekStartOf, type WeekMetrics } from "../../src/lib/engine/warRoom";

const week = (over: Partial<WeekMetrics> = {}): WeekMetrics => ({
  qualifiedLeads: 4,
  surveys: 2,
  proposals: 1,
  closingValueJuta: 0,
  pipelineValueJuta: 500,
  nonFollowerReachPct: 25,
  saves: 80,
  shares: 40,
  waClicks: 15,
  postsPublished: 5,
  adSpendRibu: 1500,
  ...over,
});

describe("buildWeeklyCompare", () => {
  it("metrik UTAMA tampil sebelum diagnostik", () => {
    const rows = buildWeeklyCompare(week(), week());
    const firstDiagnostik = rows.findIndex((r) => r.kind === "DIAGNOSTIK");
    expect(rows.slice(0, firstDiagnostik).every((r) => r.kind === "UTAMA")).toBe(true);
    expect(rows[0].key).toBe("qualifiedLeads");
  });
  it("delta persen dihitung benar", () => {
    const rows = buildWeeklyCompare(week({ qualifiedLeads: 6 }), week({ qualifiedLeads: 4 }));
    const r = rows.find((x) => x.key === "qualifiedLeads")!;
    expect(r.deltaPct).toBe(50);
    expect(r.direction).toBe("NAIK");
  });
  it("tanpa minggu pembanding ⇒ BARU, tanpa delta palsu", () => {
    const rows = buildWeeklyCompare(week(), null);
    const r = rows.find((x) => x.key === "qualifiedLeads")!;
    expect(r.deltaPct).toBeNull();
    expect(r.direction).toBe("BARU");
  });
  it("pembanding nol tidak menghasilkan Infinity", () => {
    const rows = buildWeeklyCompare(week({ surveys: 3 }), week({ surveys: 0 }));
    const r = rows.find((x) => x.key === "surveys")!;
    expect(r.deltaPct).toBeNull();
    expect(r.direction).toBe("BARU");
  });
});

describe("weekStartOf (WIB)", () => {
  it("Kamis WIB → Senin minggu yang sama menurut WIB", () => {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", day: "2-digit", weekday: "short" });
    const senin = weekStartOf(new Date("2026-07-02T08:30:00Z")); // Kamis 15:30 WIB
    expect(fmt.format(senin)).toContain("Mon");
    expect(fmt.format(senin)).toContain("29");
  });
});
