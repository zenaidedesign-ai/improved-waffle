import { describe, expect, it } from "vitest";
import { strengthCap, suggestLearnings } from "../../src/lib/engine/knowledge";

describe("strengthCap — satu kejadian bukan kebenaran", () => {
  it("sampel kecil ⇒ LEMAH; sampel cukup ⇒ maksimal BERKEMBANG, tidak pernah TERBUKTI otomatis", () => {
    expect(strengthCap(1)).toBe("LEMAH");
    expect(strengthCap(7)).toBe("LEMAH");
    expect(strengthCap(8)).toBe("BERKEMBANG");
    expect(strengthCap(100)).toBe("BERKEMBANG"); // TERBUKTI hanya lewat keputusan owner
  });
});

describe("suggestLearnings", () => {
  it("pilar dengan lead berkualitas menghasilkan saran ber-bukti", () => {
    const s = suggestLearnings({
      pillarStats: [{ pillar: "BUDGET_EDUKASI", n: 3, qualifiedLeads: 2, medianSaves: 260 }],
      channelStats: [],
      campaignRows: [],
    });
    expect(s).toHaveLength(1);
    expect(s[0].strength).toBe("LEMAH"); // n=3
    expect(s[0].supportingData).toContain("2 lead");
    expect(s[0].sourceType).toBe("DATA_INTERNAL");
  });
  it("kanal rasio kualifikasi < 30% ditandai; ≥ 30% tidak", () => {
    const s = suggestLearnings({
      pillarStats: [],
      channelStats: [
        { channel: "ADS", leads: 20, qualified: 3 },
        { channel: "IG_ORGANIK", leads: 10, qualified: 5 },
      ],
      campaignRows: [],
    });
    expect(s).toHaveLength(1);
    expect(s[0].insight).toContain("ADS");
  });
  it("kanal dengan < 5 lead tidak dinilai (sampel terlalu kecil)", () => {
    const s = suggestLearnings({
      pillarStats: [],
      channelStats: [{ channel: "REFERRAL", leads: 3, qualified: 0 }],
      campaignRows: [],
    });
    expect(s).toHaveLength(0);
  });
  it("pola kampanye scale & jebakan chat murah keduanya jadi learning LEMAH", () => {
    const s = suggestLearnings({
      pillarStats: [],
      channelStats: [],
      campaignRows: [
        { name: "menang", decision: "SCALE_KAMPANYE", cpqlRibu: 250, qualifiedLeads: 4, qualRatePct: 36 },
        { name: "jebakan", decision: "GANTI_PENAWARAN", cpqlRibu: 600, qualifiedLeads: 2, qualRatePct: 9 },
      ],
    });
    expect(s).toHaveLength(2);
    expect(s.every((x) => x.strength === "LEMAH")).toBe(true);
  });
});
