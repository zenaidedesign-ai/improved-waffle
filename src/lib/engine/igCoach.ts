// Instagram Intelligence — "Pelatih Instagram".
// Bekerja seperti strategist senior: (1) prinsip ranking yang Meta nyatakan
// PUBLIK (bersumber, bukan karangan), (2) tolok ukur dari akun Zenaide
// sendiri (median akun — bukan "angka ajaib industri"), (3) diagnosa corong
// per post: distribusi → resonansi → minat → aksi → bisnis.
// Tidak ada klaim algoritma rahasia. Semua saran = hipotesis yang bisa diuji.

import type { IgPostInput } from "./types";
import type { Keyakinan } from "../domain/enums";

// ── 1. Prinsip publik (sumber: pernyataan resmi Meta / Adam Mosseri) ──
export interface CoachPrinciple {
  id: string;
  title: string;
  statement: string; // apa yang Meta nyatakan publik
  howWeTest: string; // sinyal di data kita yang mengujinya
}

export const COACH_PRINCIPLES: CoachPrinciple[] = [
  {
    id: "SENDS",
    title: "Shares/sends adalah sinyal teratas",
    statement:
      "Mosseri (2024, publik): 'sends per reach' — seberapa sering konten dikirim ke teman — adalah salah satu sinyal terpenting untuk jangkauan.",
    howWeTest: "Share rate per 100 reach vs median akun sendiri.",
  },
  {
    id: "WATCH",
    title: "Reels dinilai dari tuntas ditonton",
    statement:
      "Meta menyatakan publik: kemungkinan menonton sampai selesai dan menonton ulang adalah sinyal ranking Reels.",
    howWeTest: "Retensi % dan plays vs reach (kalau diisi).",
  },
  {
    id: "SAVE",
    title: "Saves menandakan nilai simpan",
    statement:
      "Meta menyebut interaksi bermakna (termasuk save) sebagai sinyal minat yang lebih kuat daripada likes.",
    howWeTest: "Save rate per 100 reach vs median akun.",
  },
  {
    id: "ORIGINAL",
    title: "Konten asli diprioritaskan",
    statement:
      "Meta menyatakan publik: konten asli diprioritaskan; konten ber-watermark aplikasi lain dan repost mentah diturunkan dari rekomendasi.",
    howWeTest: "Item R4 & R6 di Audit Kelayakan Rekomendasi.",
  },
  {
    id: "ELIGIBLE",
    title: "Status akun menentukan langit-langit distribusi",
    statement:
      "Meta menyatakan publik: akun/konten yang melanggar pedoman rekomendasi dikeluarkan dari Explore & Reels feed non-follower.",
    howWeTest: "Gerbang 0 (Audit Rekomendasi) + % reach non-follower.",
  },
  {
    id: "SURFACE",
    title: "Setiap permukaan diranking berbeda",
    statement:
      "Mosseri (publik): tidak ada SATU algoritma — Feed, Stories, Explore, dan Reels punya ranking masing-masing. Stories = kedekatan; Reels/Explore = penemuan.",
    howWeTest: "Bandingkan performa per format di Diagnosa Instagram.",
  },
  {
    id: "PROFILE",
    title: "Konten harus menjual profil, profil harus menjual follow",
    statement:
      "Pola yang diakui luas (hipotesis, bukan pernyataan Meta): reach tanpa kunjungan profil = konten menarik tapi tidak memancing penasaran; kunjungan tanpa follow = masalah bio/grid.",
    howWeTest: "Kunjungan profil per reach, dan rasio kunjungan → follow.",
  },
];

export const principle = (id: string): CoachPrinciple =>
  COACH_PRINCIPLES.find((p) => p.id === id)!;

// ── 2. Tolok ukur akun sendiri ──
export interface AccountBenchmarks {
  insufficient: boolean;
  n: number;
  minNeeded: number;
  medianSaveRate: number; // per 100 reach
  medianShareRate: number;
  medianVisitRate: number;
  medianWaRate: number;
  medianNonFollowerPct: number;
}

const MIN_BENCH_POSTS = 5;

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const rate = (part: number | null, reach: number | null): number | null =>
  part != null && reach != null && reach > 0 ? (part / reach) * 100 : null;

export function accountBenchmarks(posts: IgPostInput[]): AccountBenchmarks {
  const usable = posts.filter((p) => p.reach != null && p.reach > 0);
  const pick = (f: (p: IgPostInput) => number | null) =>
    usable.map(f).filter((v): v is number => v !== null);
  const base = {
    n: usable.length,
    minNeeded: MIN_BENCH_POSTS,
    medianSaveRate: median(pick((p) => rate(p.saves, p.reach))),
    medianShareRate: median(pick((p) => rate(p.shares, p.reach))),
    medianVisitRate: median(pick((p) => rate(p.profileVisits, p.reach))),
    medianWaRate: median(pick((p) => rate(p.waClicks, p.reach))),
    medianNonFollowerPct: median(pick((p) => rate(p.reachNonFollower, p.reach))),
  };
  return { insufficient: usable.length < MIN_BENCH_POSTS, ...base };
}

// ── 3. Diagnosa corong per post ──
export type CoachStage = "DISTRIBUSI" | "RESONANSI" | "MINAT" | "AKSI" | "BISNIS" | "SEHAT";

export const STAGE_LABEL: Record<CoachStage, string> = {
  DISTRIBUSI: "Distribusi (tidak sampai ke non-follower)",
  RESONANSI: "Resonansi (sampai, tapi tidak disimpan/dibagikan)",
  MINAT: "Minat (resonan, tapi tidak memancing kunjungan profil)",
  AKSI: "Aksi (menarik, tapi tidak ada klik WA)",
  BISNIS: "Bisnis (klik WA ada, lead tidak tercatat)",
  SEHAT: "Sehat di semua tahap",
};

export interface PostCoaching {
  postId: string;
  insufficient: boolean;
  stage: CoachStage;
  findings: string[]; // fakta angka
  advice: string; // saran spesifik ala senior
  principleId: string;
  confidence: Keyakinan;
}

/**
 * Cari tahap PERTAMA yang jatuh di bawah setengah median akun —
 * seperti senior membaca insight: "masalahmu bukan hook, tapi CTA."
 */
export function coachPost(post: IgPostInput, bench: AccountBenchmarks): PostCoaching {
  if (post.reach == null || post.reach === 0 || bench.insufficient) {
    return {
      postId: post.id,
      insufficient: true,
      stage: "SEHAT",
      findings: [],
      advice:
        bench.insufficient
          ? `Belum bisa melatih — butuh ≥ ${bench.minNeeded} post dengan reach terisi untuk tolok ukur akun.`
          : "Reach belum diisi — lengkapi dulu dari IG Insights.",
      principleId: "SURFACE",
      confidence: "RENDAH",
    };
  }

  const nonFollowerPct = rate(post.reachNonFollower, post.reach);
  const saveRate = rate(post.saves, post.reach);
  const shareRate = rate(post.shares, post.reach);
  const visitRate = rate(post.profileVisits, post.reach);
  const waRate = rate(post.waClicks, post.reach);
  const half = (x: number) => x / 2;
  const confidence: Keyakinan = bench.n >= 12 ? "TINGGI" : "SEDANG";
  const findings: string[] = [];
  const f = (label: string, val: number | null, med: number) => {
    if (val !== null)
      findings.push(`${label}: ${val.toFixed(1)} (median akun ${med.toFixed(1)})`);
  };
  f("% non-follower", nonFollowerPct, bench.medianNonFollowerPct);
  f("save/100 reach", saveRate, bench.medianSaveRate);
  f("share/100 reach", shareRate, bench.medianShareRate);
  f("kunjungan profil/100 reach", visitRate, bench.medianVisitRate);
  f("klik WA/100 reach", waRate, bench.medianWaRate);

  // Tahap 1 — Distribusi: non-follower jauh di bawah median akun.
  if (
    nonFollowerPct !== null &&
    bench.medianNonFollowerPct > 0 &&
    nonFollowerPct < half(bench.medianNonFollowerPct)
  ) {
    return {
      postId: post.id, insufficient: false, stage: "DISTRIBUSI", findings, confidence,
      advice:
        "Post ini nyaris tidak keluar dari lingkaran follower. Urutan cek ala senior: (1) status rekomendasi akun, (2) apakah kontennya layak DIREKOMENDASIKAN ke orang asing — topik universal atau terlalu internal? (3) 3 detik pertama. Jangan buru-buru salahkan jam posting.",
      principleId: "ELIGIBLE",
    };
  }

  // Tahap 2 — Resonansi: save & share dua-duanya lemah.
  const saveWeak = saveRate !== null && bench.medianSaveRate > 0 && saveRate < half(bench.medianSaveRate);
  const shareWeak = shareRate !== null && bench.medianShareRate > 0 && shareRate < half(bench.medianShareRate);
  if (saveWeak && shareWeak) {
    return {
      postId: post.id, insufficient: false, stage: "RESONANSI", findings, confidence,
      advice:
        "Sampai ke orang, tapi tidak ada alasan menyimpan atau meneruskan. Save lahir dari referensi/angka/checklist; share lahir dari 'ini banget buat kamu'. Post ini tidak punya keduanya — perbaiki isinya, bukan jam tayangnya.",
      principleId: "SENDS",
    };
  }

  // Tahap 3 — Minat: resonan tapi tidak memancing kunjungan profil.
  if (
    visitRate !== null &&
    bench.medianVisitRate > 0 &&
    visitRate < half(bench.medianVisitRate) &&
    !saveWeak
  ) {
    return {
      postId: post.id, insufficient: false, stage: "MINAT", findings, confidence,
      advice:
        "Kontennya dihargai (save/share jalan) tapi tidak memancing 'siapa ini?'. Tambahkan identitas: wajah, opini, tanda tangan visual — konten bagus yang anonim membesarkan topik, bukan akunmu.",
      principleId: "PROFILE",
    };
  }

  // Tahap 4 — Aksi: tidak ada jembatan ke WA.
  if ((post.waClicks ?? 0) === 0 && (post.saves ?? 0) + (post.shares ?? 0) > 0) {
    return {
      postId: post.id, insufficient: false, stage: "AKSI", findings, confidence,
      advice:
        "Ada minat, nol klik WA — post ini tidak memasang jembatan. Satu CTA spesifik dan rendah-komitmen ('DM ESTIMASI untuk hitungan kasar unitmu') mengalahkan 'hubungi kami'.",
      principleId: "PROFILE",
    };
  }

  // Tahap 5 — Bisnis: klik WA ada, lead tidak tercatat.
  if ((post.waClicks ?? 0) >= 3 && post.leadsAttributed === 0) {
    return {
      postId: post.id, insufficient: false, stage: "BISNIS", findings, confidence,
      advice:
        "Orang mengklik WA tapi tidak ada lead tercatat dari post ini — antara chat tidak dicatat (masalah disiplin log) atau pesan pembuka membuat orang mundur. Cek dua-duanya.",
      principleId: "PROFILE",
    };
  }

  return {
    postId: post.id, insufficient: false, stage: "SEHAT", findings, confidence,
    advice:
      "Corong post ini sehat relatif terhadap akunmu sendiri. Kalau angkanya juga tinggi absolut, ini kandidat pemenang — cek daftar 'jadikan iklan'.",
    principleId: "SURFACE",
  };
}

// ── 4. Waktu & ritme posting dari data sendiri ──
const WIB_MS = 7 * 3600 * 1000;
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export interface TimeSlotStat {
  label: string;
  n: number;
  medianNonFollowerPct: number;
}

export interface TimingResult {
  insufficient: boolean;
  minPerSlot: number;
  slots: TimeSlotStat[]; // hanya slot dengan n cukup
  note: string;
}

/** Hari terbaik menurut % non-follower — HANYA dari data sendiri, min 3 post per hari. */
export function bestPostingDays(posts: IgPostInput[], minPerSlot = 3): TimingResult {
  const buckets = new Map<number, number[]>();
  for (const p of posts) {
    const pct = rate(p.reachNonFollower, p.reach);
    if (pct === null) continue;
    const day = new Date(p.postedAt.getTime() + WIB_MS).getUTCDay();
    buckets.set(day, [...(buckets.get(day) ?? []), pct]);
  }
  const slots = [...buckets.entries()]
    .filter(([, xs]) => xs.length >= minPerSlot)
    .map(([day, xs]) => ({
      label: HARI[day],
      n: xs.length,
      medianNonFollowerPct: Math.round(median(xs) * 10) / 10,
    }))
    .sort((a, b) => b.medianNonFollowerPct - a.medianNonFollowerPct);
  return {
    insufficient: slots.length === 0,
    minPerSlot,
    slots,
    note:
      slots.length === 0
        ? `Belum ada hari dengan ≥ ${minPerSlot} post ber-data — sistem tidak menebak jam emas dari sampel 1–2 post.`
        : "Dihitung dari akunmu sendiri (median % non-follower per hari, WIB). Jam posting adalah faktor KECIL dibanding kualitas konten — pakai ini sebagai penyetel halus, bukan jimat.",
  };
}

export interface CadenceResult {
  insufficient: boolean;
  medianGapDays: number | null;
  advice: string;
}

export function postingCadence(posts: IgPostInput[]): CadenceResult {
  if (posts.length < 4)
    return { insufficient: true, medianGapDays: null, advice: "Butuh ≥ 4 post untuk menilai ritme." };
  const sorted = [...posts].sort((a, b) => a.postedAt.getTime() - b.postedAt.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i].postedAt.getTime() - sorted[i - 1].postedAt.getTime()) / (24 * 3600 * 1000));
  }
  const m = Math.round(median(gaps) * 10) / 10;
  return {
    insufficient: false,
    medianGapDays: m,
    advice:
      m > 4
        ? `Median jeda antar-post ${m} hari — terlalu jarang untuk membangun momentum penemuan. Target realistis: 3–4 post berkualitas/minggu (hipotesis konsistensi, diuji lewat tren non-follower).`
        : m < 1
          ? `Median jeda ${m} hari — volume tinggi. Pastikan kualitas tidak dikorbankan; satu post resonan mengalahkan tiga post pengisi.`
          : `Median jeda antar-post ${m} hari — ritme sehat. Pertahankan.`,
  };
}

// ── 5. Rencana pelatih mingguan ──
export interface CoachAction {
  rank: number;
  action: string;
  reason: string;
  principleId: string | null;
}

export interface CoachPlanInput {
  bench: AccountBenchmarks;
  gate0Red: boolean;
  trendDirection: string;
  cadence: CadenceResult;
  stageCounts: Partial<Record<CoachStage, number>>; // dari coachPost semua post
  missingPillars: string[];
  visitToFollowPct: number | null; // total follows / total profileVisits
}

export function buildCoachPlan(i: CoachPlanInput): CoachAction[] {
  const out: Omit<CoachAction, "rank">[] = [];

  if (i.gate0Red)
    out.push({
      action: "Bereskan status akun & kelayakan rekomendasi SEBELUM mengutak-atik konten.",
      reason: "Distribusi punya langit-langit dari status akun — konten terbaik pun tidak bisa menembus akun yang dibatasi.",
      principleId: "ELIGIBLE",
    });

  if (i.bench.insufficient) {
    out.push({
      action: `Lengkapi data ${i.bench.minNeeded - i.bench.n} post lagi (reach + saves/shares/klik WA).`,
      reason: "Pelatih tanpa tolok ukur akun = pelatih yang menebak. Data dulu, saran kemudian.",
      principleId: null,
    });
    return out.map((x, idx) => ({ ...x, rank: idx + 1 }));
  }

  const sc = i.stageCounts;
  const worstStage = (Object.entries(sc) as Array<[CoachStage, number]>)
    .filter(([s]) => s !== "SEHAT")
    .sort((a, b) => b[1] - a[1])[0];
  if (worstStage && worstStage[1] >= 2) {
    const [stage, count] = worstStage;
    const fix: Record<Exclude<CoachStage, "SEHAT">, [string, string]> = {
      DISTRIBUSI: [
        "Prioritaskan topik yang relevan untuk ORANG ASING (masalah umum renovasi, angka budget), bukan update internal.",
        "SENDS",
      ] as [string, string],
      RESONANSI: [
        "Rombak isi: setiap post wajib membawa satu hal yang layak disimpan (angka, checklist, perbandingan) ATAU layak diteruskan ke pasangan.",
        "SAVE",
      ] as [string, string],
      MINAT: [
        "Suntik identitas: minimal 1 konten wajah/opini founder per minggu supaya konten yang resonan menaikkan akun, bukan cuma topiknya.",
        "PROFILE",
      ] as [string, string],
      AKSI: [
        "Pasang CTA spesifik & rendah-komitmen di setiap post yang resonan — jembatan ke WA tidak boleh implisit.",
        "PROFILE",
      ] as [string, string],
      BISNIS: [
        "Perketat disiplin log lead + periksa pesan pembuka WA — klik yang tidak jadi chat adalah kebocoran paling mahal.",
        "PROFILE",
      ] as [string, string],
    };
    const [action, pid] = fix[stage as Exclude<CoachStage, "SEHAT">];
    out.push({
      action,
      reason: `${count} post terakhir jatuh di tahap yang sama: ${STAGE_LABEL[stage]}.`,
      principleId: pid,
    });
  }

  if (i.trendDirection === "TURUN")
    out.push({
      action: "Jalankan eksperimen pemulihan distribusi: 3 post topik-universal berturut-turut, ukur % non-follower.",
      reason: "Tren reach non-follower sedang turun — butuh intervensi terukur, bukan posting seperti biasa.",
      principleId: "ELIGIBLE",
    });

  if (i.cadence.medianGapDays !== null && i.cadence.medianGapDays > 4)
    out.push({ action: "Naikkan ritme ke 3–4 post/minggu.", reason: i.cadence.advice, principleId: null });

  if (i.missingPillars.length > 0)
    out.push({
      action: `Isi pilar yang kosong: ${i.missingPillars.slice(0, 3).join(", ")} — lewat kartu eksperimen, bukan asal posting.`,
      reason: "Akun yang hanya memajang portofolio tidak memberi orang asing alasan peduli.",
      principleId: "SURFACE",
    });

  if (i.visitToFollowPct !== null && i.visitToFollowPct < 5)
    out.push({
      action: "Audit bio & 9 post teratas grid: orang datang ke profil lalu pergi tanpa follow.",
      reason: `Hanya ${i.visitToFollowPct.toFixed(1)}% kunjungan profil yang jadi follow — pintu tokonya ramai, tapi orang tidak masuk.`,
      principleId: "PROFILE",
    });

  return out.slice(0, 5).map((x, idx) => ({ ...x, rank: idx + 1 }));
}
