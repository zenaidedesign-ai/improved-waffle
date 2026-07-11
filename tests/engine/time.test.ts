import { describe, expect, it } from "vitest";
import { ageDays, DAY_MS, dayFloorWIB, weekStartOf, WIB_MS } from "../../src/lib/engine/time";
import { weekStartOf as weekStartOfWarRoom } from "../../src/lib/engine/warRoom";

describe("time — satu sumber aritmetika WIB/hari", () => {
  it("konstanta dasar benar", () => {
    expect(DAY_MS).toBe(86_400_000);
    expect(WIB_MS).toBe(25_200_000);
  });
  it("ageDays: hari penuh, tidak pernah negatif", () => {
    const t = new Date("2026-07-01T00:00:00Z");
    expect(ageDays(t, new Date(t.getTime() + 3 * DAY_MS))).toBe(3);
    expect(ageDays(t, new Date(t.getTime() + 3 * DAY_MS - 1))).toBe(2);
    expect(ageDays(t, new Date(t.getTime() - DAY_MS))).toBe(0);
  });
  it("dayFloorWIB: pergantian hari di tengah malam WIB, bukan UTC", () => {
    const before = new Date("2026-07-01T16:59:00Z"); // 23:59 WIB 1 Jul
    const after = new Date("2026-07-01T17:01:00Z"); // 00:01 WIB 2 Jul
    expect(dayFloorWIB(after) - dayFloorWIB(before)).toBe(1);
  });
  it("weekStartOf: Senin 00:00 WIB; re-export warRoom identik", () => {
    const kamis = new Date("2026-07-09T05:00:00Z"); // Kamis 12:00 WIB
    const senin = weekStartOf(kamis);
    expect(senin.toISOString()).toBe("2026-07-05T17:00:00.000Z"); // Senin 6 Jul 00:00 WIB
    expect(weekStartOfWarRoom(kamis).getTime()).toBe(senin.getTime());
    // Minggu malam WIB masih minggu yang sama
    expect(weekStartOf(new Date("2026-07-12T16:00:00Z")).getTime()).toBe(senin.getTime());
  });
});
