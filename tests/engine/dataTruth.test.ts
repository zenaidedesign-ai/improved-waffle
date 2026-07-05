import { describe, expect, it } from "vitest";
import {
  checkFreshness,
  detectCampaignConflicts,
  RELIABILITY,
  sourceConfidence,
} from "../../src/lib/engine/dataTruth";

const NOW = new Date("2026-07-05T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 3600 * 1000);

describe("keandalan per sumber — sesuai kebijakan", () => {
  it("rentang sesuai spesifikasi owner", () => {
    expect(RELIABILITY.API_RESMI.minPct).toBe(95);
    expect(RELIABILITY.CSV.minPct).toBe(90);
    expect(RELIABILITY.SCREENSHOT.maxPct).toBe(85);
    expect(RELIABILITY.PUBLIC_LINK.maxPct).toBe(70);
  });
  it("screenshot & tautan publik wajib verifikasi sebelum budget", () => {
    expect(RELIABILITY.SCREENSHOT.verifyBeforeBudget).toBe(true);
    expect(RELIABILITY.PUBLIC_LINK.verifyBeforeBudget).toBe(true);
    expect(RELIABILITY.CSV.verifyBeforeBudget).toBe(false);
  });
  it("label keyakinan turun mengikuti sumber", () => {
    expect(sourceConfidence("CSV").label).toBe("TINGGI");
    expect(sourceConfidence("MANUAL").label).toBe("SEDANG");
    expect(sourceConfidence("PUBLIC_LINK").label).toBe("RENDAH");
  });
});

describe("checkFreshness — ambang per jenis data", () => {
  it("IG > 7 hari basi; iklan > 3 hari; follow-up > 2; kompetitor > 30", () => {
    expect(checkFreshness("INSTAGRAM", daysAgo(8), NOW)?.message).toContain("basi");
    expect(checkFreshness("INSTAGRAM", daysAgo(6), NOW)).toBeNull();
    expect(checkFreshness("ADS", daysAgo(4), NOW)?.message).toContain("Jangan ambil keputusan budget");
    expect(checkFreshness("ADS", daysAgo(2), NOW)).toBeNull();
    expect(checkFreshness("LEAD_FOLLOWUP", daysAgo(3), NOW)).not.toBeNull();
    expect(checkFreshness("KOMPETITOR", daysAgo(31), NOW)).not.toBeNull();
    expect(checkFreshness("KOMPETITOR", daysAgo(29), NOW)).toBeNull();
  });
  it("tidak ada data sama sekali = peringatan, bukan diam", () => {
    const w = checkFreshness("ADS", null, NOW);
    expect(w?.ageDays).toBeNull();
    expect(w?.message).toContain("belum ada data");
  });
});

describe("detectCampaignConflicts — konflik tidak disembunyikan", () => {
  const base = {
    name: "K",
    manualChats: 0,
    linkedChats: 0,
    manualQualified: 0,
    linkedQualified: 0,
    resultsPlatform: null as number | null,
    chatsUsed: 0,
  };

  it("manual 12 vs log 9 ⇒ konflik dengan kedua angka + rekomendasi verifikasi", () => {
    const c = detectCampaignConflicts({ ...base, manualChats: 12, linkedChats: 9, chatsUsed: 12 });
    expect(c).toHaveLength(1);
    expect(c[0].message).toContain("12");
    expect(c[0].message).toContain("9");
    expect(c[0].recommendation).toContain("Verifikasi sumber");
  });

  it("hanya satu sumber terisi ⇒ bukan konflik", () => {
    expect(detectCampaignConflicts({ ...base, manualChats: 12, chatsUsed: 12 })).toHaveLength(0);
  });

  it("klaim platform > 1.3× catatan ⇒ konflik tracking", () => {
    const c = detectCampaignConflicts({ ...base, resultsPlatform: 20, chatsUsed: 10 });
    expect(c).toHaveLength(1);
    expect(c[0].recommendation).toContain("T1");
  });

  it("klaim platform dalam toleransi ⇒ bukan konflik", () => {
    expect(detectCampaignConflicts({ ...base, resultsPlatform: 12, chatsUsed: 10 })).toHaveLength(0);
  });

  it("dua konflik sekaligus dilaporkan dua-duanya", () => {
    const c = detectCampaignConflicts({
      ...base, manualChats: 12, linkedChats: 9, manualQualified: 4, linkedQualified: 2, chatsUsed: 12,
    });
    expect(c).toHaveLength(2);
  });
});
