import { describe, expect, it } from "vitest";
import {
  computeCostChain,
  decideCampaign,
  diagnoseLayer,
  type CampaignFunnelInput,
} from "../../src/lib/engine/adsRescue";

const funnel = (over: Partial<CampaignFunnelInput> = {}): CampaignFunnelInput => ({
  spendRibu: 1500,
  impressions: 50000,
  clicks: 900,
  resultsPlatform: 25,
  chats: 12,
  qualifiedLeads: 4,
  surveys: 2,
  pipelineValueJuta: 400,
  ...over,
});

describe("computeCostChain", () => {
  it("rantai biaya penuh dihitung dari data lead, bukan resultsPlatform", () => {
    const c = computeCostChain(funnel());
    expect(c.costPerChatRibu).toBe(125);
    expect(c.cpqlRibu).toBe(375);
    expect(c.qualRatePct).toBe(33);
    expect(c.costPerSurveyRibu).toBe(750);
    expect(c.ctrPct).toBe(1.8);
    expect(c.chats).toBe(12); // 12 chat nyata, meski platform klaim 25
  });
  it("pembagi nol ⇒ null, bukan Infinity", () => {
    const c = computeCostChain(funnel({ chats: 0, qualifiedLeads: 0, surveys: 0 }));
    expect(c.costPerChatRibu).toBeNull();
    expect(c.cpqlRibu).toBeNull();
    expect(c.qualRatePct).toBeNull();
  });
});

describe("decideCampaign — gerbang & data tipis dulu", () => {
  it("gerbang belum diaudit ⇒ PERBAIKI_AKUN_DULU, apa pun angkanya", () => {
    const v = decideCampaign(computeCostChain(funnel()), null, null, 300);
    expect(v.decision).toBe("PERBAIKI_AKUN_DULU");
    expect(v.lockedByGate).toBe("GERBANG_0");
  });
  it("gate1 merah ⇒ PERBAIKI_TRACKING_DULU", () => {
    const v = decideCampaign(computeCostChain(funnel()), "HIJAU", "MERAH", 300);
    expect(v.decision).toBe("PERBAIKI_TRACKING_DULU");
  });
  it("spend kecil & chat sedikit ⇒ TAHAN_DATA_BELUM_CUKUP", () => {
    const v = decideCampaign(
      computeCostChain(funnel({ spendRibu: 400, chats: 3, qualifiedLeads: 0, surveys: 0 })),
      "HIJAU", "HIJAU", 300,
    );
    expect(v.decision).toBe("TAHAN_DATA_BELUM_CUKUP");
  });
});

describe("decideCampaign — aturan vonis", () => {
  it("spend ≥ 3× target CPQL dengan nol lead berkualitas ⇒ KILL", () => {
    const v = decideCampaign(
      computeCostChain(funnel({ spendRibu: 1000, chats: 2, qualifiedLeads: 0, surveys: 0, clicks: 900 })),
      "HIJAU", "HIJAU", 300,
    );
    expect(v.decision).toBe("KILL_KAMPANYE");
    expect(v.ruleFired).toBe("ADS_KILL_ZERO_QUALIFIED");
    expect(v.trigger.spendRibu).toBe(1000);
  });

  it("CPQL ≤ target + ≥3 qualified + ada survei ⇒ SCALE", () => {
    const v = decideCampaign(
      computeCostChain(funnel({ spendRibu: 900, chats: 15, qualifiedLeads: 5, surveys: 2 })),
      "HIJAU", "HIJAU", 300,
    );
    expect(v.decision).toBe("SCALE_KAMPANYE");
    expect(v.confidence).toBe("TINGGI");
    expect(v.explanation).toContain("bertahap");
  });

  it("JEBAKAN CHAT MURAH: banyak chat, kualifikasi < 30% ⇒ GANTI_PENAWARAN", () => {
    const v = decideCampaign(
      computeCostChain(funnel({ spendRibu: 1200, chats: 20, qualifiedLeads: 2, surveys: 1 })),
      "HIJAU", "HIJAU", 300,
    );
    expect(v.decision).toBe("GANTI_PENAWARAN");
    expect(v.ruleFired).toBe("ADS_CHEAP_CHAT_TRAP");
    expect(v.explanation).toContain("JEBAKAN CHAT MURAH");
  });

  it("CTR rendah ⇒ PERBAIKI_KREATIF", () => {
    const v = decideCampaign(
      computeCostChain(funnel({ impressions: 100000, clicks: 500, chats: 10, qualifiedLeads: 4, surveys: 0 })),
      "HIJAU", "HIJAU", 300,
    );
    expect(v.decision).toBe("PERBAIKI_KREATIF");
  });

  it("CPQL 1–2× target ⇒ HOLD", () => {
    const v = decideCampaign(
      computeCostChain(funnel({ spendRibu: 2000, chats: 12, qualifiedLeads: 4, surveys: 1 })),
      "HIJAU", "HIJAU", 300, // CPQL = 500, target 300 ⇒ 1.67×
    );
    expect(v.decision).toBe("HOLD_KAMPANYE");
  });
});

describe("diagnoseLayer — lapisan pertama yang gagal", () => {
  it("chat merespons tapi nol berkualitas & tidak kena jebakan ⇒ WA_FLOW", () => {
    const d = diagnoseLayer(
      computeCostChain(funnel({ chats: 5, qualifiedLeads: 0, surveys: 0 })),
      "HIJAU", "HIJAU",
    );
    expect(d.layer).toBe("WA_FLOW");
  });
  it("lead berkualitas ada tapi nol survei ⇒ FOLLOW_UP", () => {
    // 5 dari 12 chat berkualitas (42% — di atas ambang jebakan chat murah)
    const d = diagnoseLayer(
      computeCostChain(funnel({ qualifiedLeads: 5, surveys: 0 })),
      "HIJAU", "HIJAU",
    );
    expect(d.layer).toBe("FOLLOW_UP");
  });
  it("gerbang akun kalah dari semua lapisan lain", () => {
    const d = diagnoseLayer(computeCostChain(funnel()), "MERAH", "HIJAU");
    expect(d.layer).toBe("AKUN");
  });
});
