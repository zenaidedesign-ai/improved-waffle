import { describe, expect, it } from "vitest";
import {
  accountBenchmarks,
  bestPostingDays,
  buildCoachPlan,
  coachPost,
  postingCadence,
} from "../../src/lib/engine/igCoach";
import type { IgPostInput } from "../../src/lib/engine/types";

let seq = 0;
const post = (over: Partial<IgPostInput> = {}): IgPostInput => ({
  id: `p${++seq}`,
  postedAt: new Date("2026-06-01T03:00:00Z"), // 10:00 WIB
  format: "REELS",
  pillar: "PORTFOLIO_LAIN",
  hook: "hook",
  cta: null,
  reach: 1000,
  reachNonFollower: 300,
  plays: null,
  likes: 50,
  comments: 5,
  saves: 20,
  shares: 10,
  profileVisits: 30,
  follows: 3,
  dmClicks: 0,
  waClicks: 4,
  leadsAttributed: 1,
  qualifiedLeadsAttributed: 0,
  ...over,
});

const healthySet = () => Array.from({ length: 8 }, () => post());

describe("accountBenchmarks", () => {
  it("< 5 post ber-reach ⇒ insufficient", () => {
    expect(accountBenchmarks([post(), post(), post({ reach: null })]).insufficient).toBe(true);
  });
  it("median dihitung dari akun sendiri", () => {
    const b = accountBenchmarks(healthySet());
    expect(b.insufficient).toBe(false);
    expect(b.medianSaveRate).toBe(2); // 20/1000*100
    expect(b.medianNonFollowerPct).toBe(30);
  });
});

describe("coachPost — tahap pertama yang jatuh", () => {
  const bench = accountBenchmarks(healthySet());

  it("non-follower < setengah median ⇒ DISTRIBUSI, saran cek kelayakan dulu", () => {
    const c = coachPost(post({ reachNonFollower: 100 }), bench); // 10% vs median 30%
    expect(c.stage).toBe("DISTRIBUSI");
    expect(c.advice).toContain("status rekomendasi");
    expect(c.principleId).toBe("ELIGIBLE");
  });

  it("save & share dua-duanya lemah ⇒ RESONANSI (isi, bukan jam tayang)", () => {
    const c = coachPost(post({ saves: 2, shares: 1 }), bench);
    expect(c.stage).toBe("RESONANSI");
    expect(c.advice).toContain("bukan jam tayangnya");
  });

  it("resonan tapi kunjungan profil lemah ⇒ MINAT (identitas)", () => {
    const c = coachPost(post({ profileVisits: 5 }), bench);
    expect(c.stage).toBe("MINAT");
    expect(c.advice).toContain("identitas");
  });

  it("minat ada tapi nol klik WA ⇒ AKSI (CTA)", () => {
    const c = coachPost(post({ waClicks: 0 }), bench);
    expect(c.stage).toBe("AKSI");
    expect(c.advice).toContain("CTA");
  });

  it("klik WA ≥ 3 tanpa lead ⇒ BISNIS (log/pembuka WA)", () => {
    const c = coachPost(post({ waClicks: 5, leadsAttributed: 0 }), bench);
    expect(c.stage).toBe("BISNIS");
  });

  it("semua relatif sehat ⇒ SEHAT", () => {
    expect(coachPost(post(), bench).stage).toBe("SEHAT");
  });

  it("setiap diagnosa membawa fakta angka + median akun", () => {
    const c = coachPost(post({ saves: 2, shares: 1 }), bench);
    expect(c.findings.join(" ")).toContain("median akun");
  });

  it("tolok ukur belum cukup ⇒ tidak melatih, tidak menebak", () => {
    const c = coachPost(post(), accountBenchmarks([post()]));
    expect(c.insufficient).toBe(true);
    expect(c.advice).toContain("Belum bisa melatih");
  });
});

describe("bestPostingDays — anti jimat jam emas", () => {
  it("tidak ada hari dengan ≥ 3 post ⇒ insufficient", () => {
    const r = bestPostingDays([post(), post({ postedAt: new Date("2026-06-02T03:00:00Z") })]);
    expect(r.insufficient).toBe(true);
    expect(r.note).toContain("tidak menebak");
  });
  it("hari dihitung dalam WIB dan diurut berdasar median non-follower", () => {
    const senin = (d: string, nf: number) =>
      post({ postedAt: new Date(`${d}T03:00:00Z`), reachNonFollower: nf }); // Senin WIB
    const r = bestPostingDays([
      senin("2026-06-01", 500), senin("2026-06-08", 400), senin("2026-06-15", 450),
      post({ postedAt: new Date("2026-06-04T03:00:00Z"), reachNonFollower: 100 }), // Kamis
      post({ postedAt: new Date("2026-06-11T03:00:00Z"), reachNonFollower: 120 }),
      post({ postedAt: new Date("2026-06-18T03:00:00Z"), reachNonFollower: 90 }),
    ]);
    expect(r.insufficient).toBe(false);
    expect(r.slots[0].label).toBe("Senin");
    expect(r.note).toContain("faktor KECIL");
  });
});

describe("postingCadence", () => {
  it("jeda median > 4 hari ⇒ saran naikkan ritme", () => {
    const posts = [0, 6, 12, 19].map((d) =>
      post({ postedAt: new Date(Date.UTC(2026, 5, 1 + d)) }),
    );
    const r = postingCadence(posts);
    expect(r.medianGapDays).toBeGreaterThan(4);
    expect(r.advice).toContain("3–4 post");
  });
});

describe("buildCoachPlan", () => {
  const bench = accountBenchmarks(healthySet());
  it("gerbang merah selalu jadi pelajaran #1", () => {
    const plan = buildCoachPlan({
      bench, gate0Red: true, trendDirection: "DATAR",
      cadence: { insufficient: false, medianGapDays: 3, advice: "" },
      stageCounts: { RESONANSI: 3 }, missingPillars: [], visitToFollowPct: 10,
    });
    expect(plan[0].action).toContain("SEBELUM mengutak-atik konten");
  });
  it("tolok ukur kurang ⇒ satu-satunya saran adalah lengkapi data", () => {
    const plan = buildCoachPlan({
      bench: accountBenchmarks([post()]), gate0Red: false, trendDirection: "DATAR",
      cadence: { insufficient: true, medianGapDays: null, advice: "" },
      stageCounts: {}, missingPillars: [], visitToFollowPct: null,
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].action).toContain("Lengkapi data");
  });
  it("rasio kunjungan→follow rendah ⇒ audit bio masuk rencana", () => {
    const plan = buildCoachPlan({
      bench, gate0Red: false, trendDirection: "DATAR",
      cadence: { insufficient: false, medianGapDays: 3, advice: "" },
      stageCounts: {}, missingPillars: [], visitToFollowPct: 2.1,
    });
    expect(plan.map((p) => p.action).join(" ")).toContain("bio");
  });
  it("maksimal 5 aksi", () => {
    const plan = buildCoachPlan({
      bench, gate0Red: true, trendDirection: "TURUN",
      cadence: { insufficient: false, medianGapDays: 6, advice: "jarang" },
      stageCounts: { RESONANSI: 4, AKSI: 2 },
      missingPillars: ["FOUNDER_POV", "BUDGET_EDUKASI"], visitToFollowPct: 1,
    });
    expect(plan.length).toBeLessThanOrEqual(5);
  });
});
