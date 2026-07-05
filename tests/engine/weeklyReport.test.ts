import { describe, expect, it } from "vitest";
import {
  buildOwnerActions,
  buildWorkedFailed,
  detectFunnelLeak,
  pickBestWorstCampaigns,
} from "../../src/lib/engine/weeklyReport";
import type { CampaignRow } from "../../src/lib/dashboard";

const row = (over: Partial<CampaignRow>): CampaignRow => ({
  id: "c1",
  name: "K",
  channel: "META",
  status: "AKTIF",
  spendRibu: 1000,
  cpqlRibu: 250,
  qualifiedLeads: 4,
  health: "SEHAT",
  verdict: { decision: "SCALE_KAMPANYE", ruleFired: "r", trigger: {}, confidence: "TINGGI", explanation: "e" },
  ...over,
});

describe("detectFunnelLeak", () => {
  it("penyebut < 5 di semua tahap ⇒ insufficient, tidak menebak", () => {
    const r = detectFunnelLeak({ chats: 4, qualified: 2, surveys: 1, proposals: 1, closings: 0 });
    expect(r.insufficient).toBe(true);
    expect(r.stage).toBeNull();
  });
  it("bocor terbesar teridentifikasi di tahap survei", () => {
    const r = detectFunnelLeak({ chats: 30, qualified: 15, surveys: 2, proposals: 1, closings: 0 });
    expect(r.insufficient).toBe(false);
    expect(r.stage).toBe("SURVEI"); // 2/15 = 13% — terendah
    expect(r.explanation).toContain("follow-up");
  });
  it("tahap dengan penyebut kecil tidak ikut dinilai", () => {
    // proposals=2 → tahap CLOSING (denom 2) diabaikan meski 0%
    const r = detectFunnelLeak({ chats: 30, qualified: 20, surveys: 15, proposals: 2, closings: 0 });
    expect(r.stage).not.toBe("CLOSING");
  });
});

describe("pickBestWorstCampaigns", () => {
  it("terbaik = CPQL termurah; terburuk = spend tanpa lead berkualitas", () => {
    const r = pickBestWorstCampaigns([
      row({ id: "a", name: "bagus", cpqlRibu: 200 }),
      row({ id: "b", name: "boros", cpqlRibu: null, qualifiedLeads: 0, spendRibu: 900, verdict: { decision: "KILL_KAMPANYE", ruleFired: "r", trigger: {}, confidence: "TINGGI", explanation: "e" } }),
    ]);
    expect(r.best?.name).toBe("bagus");
    expect(r.worst?.name).toBe("boros");
  });
  it("kampanye TAHAN / terkunci tidak ikut dinilai", () => {
    const r = pickBestWorstCampaigns([
      row({ verdict: { decision: "TAHAN_DATA_BELUM_CUKUP", ruleFired: "r", trigger: {}, confidence: "TINGGI", explanation: "e" } }),
    ]);
    expect(r.best).toBeNull();
    expect(r.note).toContain("Belum ada");
  });
  it("satu kampanye tidak boleh jadi terbaik sekaligus terburuk", () => {
    const r = pickBestWorstCampaigns([row({ id: "x", name: "sendiri" })]);
    expect(r.best?.id).toBe("x");
    expect(r.worst).toBeNull();
  });
});

describe("buildWorkedFailed — tidak menyanjung, tidak menyembunyikan", () => {
  it("tanpa kemenangan terukur ⇒ dikatakan terang-terangan", () => {
    const { worked, failed } = buildWorkedFailed({
      scaleCampaigns: [], killCampaigns: [], cheapChatCampaigns: [], winners: [],
      qualifiedThisWeek: 0, qualifiedLastWeek: 0, closingValueJutaThisWeek: 0,
      trendDirection: "DATA_KURANG", ghostingCount: 0, urgentCount: 0,
    });
    expect(worked[0].text).toContain("Tidak ada kemenangan");
    expect(failed[0].text).toContain("Nol lead berkualitas");
  });
  it("setiap klaim membawa bukti angka", () => {
    const { worked } = buildWorkedFailed({
      scaleCampaigns: [row({ name: "menang" })], killCampaigns: [], cheapChatCampaigns: [],
      winners: [{ hook: "hook juara", reasons: "saves 100" }],
      qualifiedThisWeek: 5, qualifiedLastWeek: 2, closingValueJutaThisWeek: 380,
      trendDirection: "NAIK", ghostingCount: 0, urgentCount: 0,
    });
    for (const item of worked) expect(item.evidence.length).toBeGreaterThan(0);
    expect(worked.map((w) => w.text).join(" ")).toContain("menang");
  });
});

describe("buildOwnerActions", () => {
  it("perbaikan gerbang selalu aksi pertama", () => {
    const actions = buildOwnerActions({
      lockRepair: "Bereskan item audit A3.",
      killCampaigns: [row({ name: "boros" })],
      scaleCampaigns: [],
      moveBudgetText: null,
      urgentFollowUps: [],
      winners: [],
      leak: { insufficient: true, stage: null, ratePct: null, explanation: "" },
      openDecisions: 2,
    });
    expect(actions[0]).toContain("A3");
    expect(actions.join(" ")).toContain("boros");
    expect(actions.join(" ")).toContain("2 keputusan");
  });
});
