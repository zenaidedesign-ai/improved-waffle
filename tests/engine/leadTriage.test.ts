import { describe, expect, it } from "vitest";
import {
  closingProbability,
  followUpQueue,
  triageLead,
  type LeadTriageInput,
} from "../../src/lib/engine/leadTriage";

const NOW = new Date("2026-07-05T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 3600 * 1000);

let seq = 0;
const lead = (over: Partial<LeadTriageInput> = {}): LeadTriageInput => ({
  id: `l${++seq}`,
  name: "Tes",
  status: "MERESPONS",
  qualityScore: 50,
  qualAnswersCount: 2,
  estimatedValueJuta: 100,
  createdAt: daysAgo(5),
  lastContactAt: daysAgo(1),
  surveyAt: null,
  proposalSentAt: null,
  ...over,
});

describe("triageLead", () => {
  it("closing kalah / ghosting ⇒ DEAD_LEAD", () => {
    expect(triageLead(lead({ status: "CLOSING_KALAH" }), NOW).triage).toBe("DEAD_LEAD");
    expect(triageLead(lead({ status: "GHOSTING" }), NOW).triage).toBe("DEAD_LEAD");
  });

  it("senyap 14 hari + skor rendah ⇒ DEAD_LEAD", () => {
    const t = triageLead(lead({ lastContactAt: daysAgo(15), qualityScore: 30 }), NOW);
    expect(t.triage).toBe("DEAD_LEAD");
    expect(t.silentDays).toBe(15);
  });

  it("lead berkualitas yang senyap ≥ 2 hari ⇒ URGENT (revenue bocor)", () => {
    const t = triageLead(
      lead({ qualityScore: 75, qualAnswersCount: 4, lastContactAt: daysAgo(3), estimatedValueJuta: 400 }),
      NOW,
    );
    expect(t.triage).toBe("URGENT");
    expect(t.reason).toContain("bocor");
  });

  it("survei < 48 jam ⇒ URGENT", () => {
    const t = triageLead(
      lead({ qualityScore: 70, qualAnswersCount: 4, surveyAt: new Date(NOW.getTime() + 24 * 3600 * 1000) }),
      NOW,
    );
    expect(t.triage).toBe("URGENT");
    expect(t.reason).toContain("Survei");
  });

  it("proposal tanpa balasan 3 hari ⇒ URGENT", () => {
    const t = triageLead(
      lead({ status: "PROPOSAL_TERKIRIM", proposalSentAt: daysAgo(4), lastContactAt: daysAgo(4), qualityScore: 55 }),
      NOW,
    );
    expect(t.triage).toBe("URGENT");
  });

  it("berkualitas & responsif ⇒ HOT_LEAD", () => {
    const t = triageLead(lead({ qualityScore: 80, qualAnswersCount: 5, lastContactAt: daysAgo(0) }), NOW);
    expect(t.triage).toBe("HOT_LEAD");
  });

  it("skor sangat rendah tanpa jawaban & senyap ⇒ IGNORE", () => {
    const t = triageLead(
      lead({ qualityScore: 10, qualAnswersCount: 0, lastContactAt: daysAgo(3) }),
      NOW,
    );
    expect(t.triage).toBe("IGNORE");
  });

  it("skor menengah ⇒ FOLLOW_UP; skor rendah tapi responsif ⇒ NURTURE", () => {
    expect(triageLead(lead({ qualityScore: 45, lastContactAt: daysAgo(2) }), NOW).triage).toBe("FOLLOW_UP");
    expect(triageLead(lead({ qualityScore: 30, qualAnswersCount: 1, lastContactAt: daysAgo(0) }), NOW).triage).toBe("NURTURE");
  });

  it("risiko ghosting menyala pada senyap ≥ 4 hari", () => {
    expect(triageLead(lead({ lastContactAt: daysAgo(4) }), NOW).ghostingRisk).toBe(true);
    expect(triageLead(lead({ lastContactAt: daysAgo(1) }), NOW).ghostingRisk).toBe(false);
  });
});

describe("closingProbability", () => {
  it("terminal: menang 100, kalah/ghosting 0", () => {
    expect(closingProbability(lead({ status: "CLOSING_MENANG" }), NOW)).toBe(100);
    expect(closingProbability(lead({ status: "CLOSING_KALAH" }), NOW)).toBe(0);
    expect(closingProbability(lead({ status: "GHOSTING" }), NOW)).toBe(0);
  });
  it("status lebih maju ⇒ probabilitas lebih tinggi", () => {
    const p1 = closingProbability(lead({ status: "MERESPONS" }), NOW);
    const p2 = closingProbability(lead({ status: "NEGOSIASI" }), NOW);
    expect(p2).toBeGreaterThan(p1);
  });
  it("senyap menggerus probabilitas, dengan lantai 1", () => {
    const fresh = closingProbability(lead({ lastContactAt: daysAgo(0) }), NOW);
    const stale = closingProbability(lead({ lastContactAt: daysAgo(10) }), NOW);
    expect(stale).toBeLessThan(fresh);
    expect(closingProbability(lead({ qualityScore: 0, lastContactAt: daysAgo(12), status: "CHAT_BARU" }), NOW)).toBeGreaterThanOrEqual(1);
  });
});

describe("followUpQueue", () => {
  it("urgen dulu, lalu nilai terbesar; dead/ignore tidak masuk", () => {
    const q = followUpQueue(
      [
        lead({ name: "kecil-urgent", qualityScore: 70, qualAnswersCount: 4, lastContactAt: daysAgo(3), estimatedValueJuta: 50 }),
        lead({ name: "besar-urgent", qualityScore: 70, qualAnswersCount: 4, lastContactAt: daysAgo(3), estimatedValueJuta: 500 }),
        lead({ name: "followup", qualityScore: 45, lastContactAt: daysAgo(2), estimatedValueJuta: 80 }),
        lead({ name: "dead", status: "GHOSTING" }),
        lead({ name: "fresh-hot", qualityScore: 80, qualAnswersCount: 5, lastContactAt: daysAgo(0) }),
      ],
      NOW,
    );
    expect(q.map((x) => x.name)).toEqual(["besar-urgent", "kecil-urgent", "followup"]);
  });
});
