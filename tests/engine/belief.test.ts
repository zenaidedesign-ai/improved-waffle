import { describe, expect, it } from "vitest";
import {
  buildProvenance,
  CAPTURE_GAPS,
  deriveEvidenceType,
  deriveMaturity,
  EVIDENCE_RELIABILITY_PCT,
  falsifierTemplate,
  isPublicEvidence,
} from "../../src/lib/engine/belief";
import { LEARNING_SOURCE } from "../../src/lib/engine/knowledge";
import { RELIABILITY } from "../../src/lib/engine/dataTruth";

describe("deriveEvidenceType — Sumbu A dipetakan dari sumber learning", () => {
  it("DATA_INTERNAL tanpa konfirmasi revenue = OBSERVASI, bukan FAKTA", () => {
    expect(deriveEvidenceType("DATA_INTERNAL")).toBe("OBSERVASI");
  });
  it("FAKTA hanya untuk data internal yang terkonfirmasi sampai revenue", () => {
    expect(deriveEvidenceType("DATA_INTERNAL", true)).toBe("FAKTA");
    // sumber non-internal TIDAK PERNAH jadi FAKTA, bahkan dengan flag revenue
    expect(deriveEvidenceType("OBSERVASI_KOMPETITOR", true)).toBe("OBSERVASI");
    expect(deriveEvidenceType("PENGETAHUAN_OWNER", true)).toBe("ASUMSI_OWNER");
  });
  it("pengetahuan owner & hipotesis = ASUMSI_OWNER; publik = OBSERVASI", () => {
    expect(deriveEvidenceType("PENGETAHUAN_OWNER")).toBe("ASUMSI_OWNER");
    expect(deriveEvidenceType("HIPOTESIS")).toBe("ASUMSI_OWNER");
    expect(deriveEvidenceType("OBSERVASI_KOMPETITOR")).toBe("OBSERVASI");
    expect(deriveEvidenceType("TREN_PUBLIK")).toBe("OBSERVASI");
  });
});

describe("isPublicEvidence — Cap C transitif", () => {
  it("hanya observasi kompetitor & tren publik yang menandai belief sebagai publik", () => {
    expect(isPublicEvidence("OBSERVASI_KOMPETITOR")).toBe(true);
    expect(isPublicEvidence("TREN_PUBLIK")).toBe(true);
    expect(isPublicEvidence("DATA_INTERNAL")).toBe(false);
    expect(isPublicEvidence("PENGETAHUAN_OWNER")).toBe(false);
    expect(isPublicEvidence("HIPOTESIS")).toBe(false);
  });
});

describe("EVIDENCE_RELIABILITY_PCT — turunan dataTruth, bukan angka baru", () => {
  it("semua sumber learning punya angka keandalan", () => {
    for (const s of LEARNING_SOURCE) {
      expect(EVIDENCE_RELIABILITY_PCT[s]).toBeGreaterThan(0);
      expect(EVIDENCE_RELIABILITY_PCT[s]).toBeLessThanOrEqual(100);
    }
  });
  it("sumber publik ≈ nilai tengah PUBLIC_LINK; hipotesis di bawah semua sumber terukur", () => {
    const publicMid = Math.round((RELIABILITY.PUBLIC_LINK.minPct + RELIABILITY.PUBLIC_LINK.maxPct) / 2);
    expect(EVIDENCE_RELIABILITY_PCT.OBSERVASI_KOMPETITOR).toBe(publicMid);
    expect(EVIDENCE_RELIABILITY_PCT.TREN_PUBLIK).toBe(publicMid);
    expect(EVIDENCE_RELIABILITY_PCT.HIPOTESIS).toBeLessThan(EVIDENCE_RELIABILITY_PCT.TREN_PUBLIK);
    expect(EVIDENCE_RELIABILITY_PCT.DATA_INTERNAL).toBeGreaterThan(EVIDENCE_RELIABILITY_PCT.PENGETAHUAN_OWNER);
  });
});

const sup = { polarity: "MENDUKUNG", contributesToScore: true } as const;
const opp = { polarity: "MENENTANG", contributesToScore: true } as const;

describe("deriveMaturity — proyeksi jujur tanpa skoring baru (Fase A)", () => {
  it("LEMAH→HIPOTESIS, BERKEMBANG→POLA, TERBUKTI→TERBUKTI", () => {
    expect(deriveMaturity("LEMAH", [sup]).maturity).toBe("HIPOTESIS");
    expect(deriveMaturity("BERKEMBANG", [sup, sup]).maturity).toBe("POLA");
    expect(deriveMaturity("TERBUKTI", [sup, sup, sup]).maturity).toBe("TERBUKTI");
  });
  it("bukti MENENTANG memunculkan kontradiksi terbuka, TIDAK menurunkan status otomatis", () => {
    const m = deriveMaturity("BERKEMBANG", [sup, opp]);
    expect(m.maturity).toBe("POLA"); // status tetap — Fase A hanya menandai
    expect(m.openContradiction).toBe(true);
    expect(m.opposingCount).toBe(1);
    expect(m.note).toContain("belum diadili");
  });
  it("bukti yang tidak ikut skor tidak dihitung; ledger kosong dikatakan jujur", () => {
    const m = deriveMaturity("LEMAH", [{ polarity: "MENDUKUNG", contributesToScore: false }]);
    expect(m.supportingCount).toBe(0);
    expect(m.note).toContain("kosong");
  });
});

describe("buildProvenance — jawaban 'kenapa percaya ini?'", () => {
  it("akar publik + tanpa falsifier + ledger kosong = tiga catatan kejujuran", () => {
    const p = buildProvenance({
      strength: "LEMAH",
      derivedFromPublic: true,
      falsifier: null,
      evidence: [],
      revisions: [],
    });
    expect(p.honestyNotes).toHaveLength(3);
    expect(p.honestyNotes.join(" ")).toContain("pengamatan publik");
    expect(p.honestyNotes.join(" ")).toContain("falsifier");
    expect(p.lastRevision).toBeNull();
  });
  it("kontradiksi terbuka melarang pemakaian untuk keputusan budget", () => {
    const p = buildProvenance({
      strength: "BERKEMBANG",
      derivedFromPublic: false,
      falsifier: "Jika 8 post berikutnya 0 lead, buang.",
      evidence: [sup, opp],
      revisions: [],
    });
    expect(p.projection.openContradiction).toBe(true);
    expect(p.honestyNotes.join(" ")).toContain("keputusan budget");
  });
  it("revisi terakhir = yang paling baru berdasarkan waktu", () => {
    const p = buildProvenance({
      strength: "BERKEMBANG",
      derivedFromPublic: false,
      falsifier: "x",
      evidence: [sup],
      revisions: [
        { fromState: null, toState: "LEMAH", trigger: "lahir", actor: "OWNER", createdAt: new Date("2026-07-01") },
        { fromState: "LEMAH", toState: "BERKEMBANG", trigger: "owner menaikkan", actor: "OWNER", createdAt: new Date("2026-07-08") },
      ],
    });
    expect(p.lastRevision?.toState).toBe("BERKEMBANG");
    expect(p.honestyNotes).toHaveLength(0); // sehat: ada falsifier, ada bukti, tanpa kontradiksi
  });
});

describe("CAPTURE_GAPS — titik buta yang diakui sistem", () => {
  it("kelima sumber tak-tertangkap terdaftar, termasuk hasil proyek (penghalang FAKTA)", () => {
    const keys = CAPTURE_GAPS.map((g) => g.key);
    expect(keys).toEqual([
      "WA_CONVERSATION",
      "PROPOSAL_RESULT",
      "PROJECT_OUTCOME",
      "LOSS_REASON",
      "MARKET_OBSERVATION",
    ]);
    const outcome = CAPTURE_GAPS.find((g) => g.key === "PROJECT_OUTCOME")!;
    expect(outcome.why).toContain("FAKTA");
  });
  it("setiap gap menjelaskan APA yang tidak bisa dilakukan tanpa dia", () => {
    for (const g of CAPTURE_GAPS) expect(g.why.length).toBeGreaterThan(20);
  });
});

describe("falsifierTemplate — membantu, tidak memaksa", () => {
  it("kategori dikenal dapat template spesifik; tak dikenal dapat instruksi generik", () => {
    expect(falsifierTemplate("KONTEN")).toContain("8 post");
    expect(falsifierTemplate("KANAL")).toContain("kualifikasi");
    expect(falsifierTemplate("PENAWARAN")).toContain("memaksa");
  });
});
