import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getGateStatus, mapPostToInput } from "@/lib/data";
import { db } from "@/lib/db";
import { formatTanggal } from "@/lib/format";
import { contentMixAnalysis, nonFollowerTrend } from "@/lib/engine/igDiagnosis";
import {
  accountBenchmarks,
  bestPostingDays,
  buildCoachPlan,
  COACH_PRINCIPLES,
  coachPost,
  postingCadence,
  principle,
  STAGE_LABEL,
  type CoachStage,
} from "@/lib/engine/igCoach";

export const dynamic = "force-dynamic";

const STAGE_STYLE: Record<CoachStage, string> = {
  DISTRIBUSI: "bg-red-100 text-red-700",
  RESONANSI: "bg-amber-100 text-amber-700",
  MINAT: "bg-blue-50 text-blue-700",
  AKSI: "bg-purple-50 text-purple-700",
  BISNIS: "bg-orange-50 text-orange-700",
  SEHAT: "bg-emerald-100 text-emerald-700",
};

export default async function CoachPage() {
  const [posts, snapshots, gates] = await Promise.all([
    db.igPost.findMany({ orderBy: { postedAt: "desc" }, include: { leads: true } }),
    db.igAccountSnapshot.findMany({ orderBy: { weekStart: "desc" }, take: 12 }),
    getGateStatus(),
  ]);
  const inputs = posts.map(mapPostToInput);
  const bench = accountBenchmarks(inputs);
  const coachings = inputs.map((p) => coachPost(p, bench));
  const stageCounts: Partial<Record<CoachStage, number>> = {};
  for (const c of coachings.filter((x) => !x.insufficient)) {
    stageCounts[c.stage] = (stageCounts[c.stage] ?? 0) + 1;
  }
  const trend = nonFollowerTrend(
    snapshots.filter((s) => s.reachNonFollowerPct != null).map((s) => ({ date: s.weekStart, pct: s.reachNonFollowerPct! })),
  );
  const cadence = postingCadence(inputs);
  const timing = bestPostingDays(inputs);
  const mix = contentMixAnalysis(inputs);
  const totalVisits = inputs.reduce((s, p) => s + (p.profileVisits ?? 0), 0);
  const totalFollows = inputs.reduce((s, p) => s + (p.follows ?? 0), 0);
  const visitToFollowPct = totalVisits >= 50 ? (totalFollows / totalVisits) * 100 : null;

  const plan = buildCoachPlan({
    bench,
    gate0Red: gates.gate0 === "MERAH" || gates.gate0 === null,
    trendDirection: trend.direction,
    cadence,
    stageCounts,
    missingPillars: mix.insufficient ? [] : mix.missingPillars,
    visitToFollowPct,
  });

  const recent = coachings.filter((c) => !c.insufficient).slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Instagram Intelligence — Pelatih"
        subtitle="Membaca akunmu seperti strategist senior: prinsip ranking yang Meta nyatakan PUBLIK + tolok ukur dari akunmu sendiri. Tidak ada klaim algoritma rahasia — setiap saran adalah hipotesis yang bisa diuji."
      />

      <Card title="Rencana pelatih minggu ini" className="mb-6 border-2 border-gray-900">
        {plan.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada koreksi mendesak — akun bergerak sehat relatif terhadap datanya sendiri.</p>
        ) : (
          <ol className="space-y-2">
            {plan.map((a) => (
              <li key={a.rank} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                <div className="font-semibold">{a.rank}. {a.action}</div>
                <p className="mt-0.5 text-xs text-gray-500">{a.reason}</p>
                {a.principleId && (
                  <p className="mt-0.5 text-[11px] text-gray-400">Prinsip: {principle(a.principleId).title}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card title="Tolok ukur akun (median)">
          {bench.insufficient ? (
            <p className="text-sm text-gray-500">Butuh ≥ {bench.minNeeded} post ber-reach ({bench.n} saat ini).</p>
          ) : (
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span className="text-gray-500">% non-follower</span><b>{bench.medianNonFollowerPct.toFixed(1)}%</b></li>
              <li className="flex justify-between"><span className="text-gray-500">Save / 100 reach</span><b>{bench.medianSaveRate.toFixed(1)}</b></li>
              <li className="flex justify-between"><span className="text-gray-500">Share / 100 reach</span><b>{bench.medianShareRate.toFixed(1)}</b></li>
              <li className="flex justify-between"><span className="text-gray-500">Kunjungan profil / 100</span><b>{bench.medianVisitRate.toFixed(1)}</b></li>
              <li className="flex justify-between"><span className="text-gray-500">Klik WA / 100</span><b>{bench.medianWaRate.toFixed(1)}</b></li>
            </ul>
          )}
          <p className="mt-2 text-xs text-gray-400">Pembanding = akunmu sendiri, bukan angka ajaib industri.</p>
        </Card>

        <Card title="Hari terbaik (dari datamu)">
          {timing.insufficient ? (
            <p className="text-sm text-gray-500">{timing.note}</p>
          ) : (
            <>
              <ul className="space-y-1 text-sm">
                {timing.slots.slice(0, 4).map((s) => (
                  <li key={s.label} className="flex justify-between">
                    <span className="text-gray-600">{s.label} <span className="text-xs text-gray-400">({s.n} post)</span></span>
                    <b>{s.medianNonFollowerPct}%</b>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-400">{timing.note}</p>
            </>
          )}
        </Card>

        <Card title="Ritme & pintu toko">
          <p className="text-sm text-gray-700">{cadence.insufficient ? cadence.advice : cadence.advice}</p>
          <div className="mt-2 border-t border-gray-100 pt-2 text-sm">
            {visitToFollowPct === null ? (
              <p className="text-gray-500">Rasio kunjungan profil → follow: butuh ≥ 50 kunjungan tercatat.</p>
            ) : (
              <p>
                Kunjungan profil → follow: <b>{visitToFollowPct.toFixed(1)}%</b>{" "}
                <span className="text-xs text-gray-400">({totalFollows} follow dari {totalVisits} kunjungan)</span>
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Diagnosa per post — tahap mana yang jatuh" className="mb-6">
        {recent.length === 0 ? (
          <EmptyState>
            Belum bisa melatih per post. {bench.insufficient ? `Lengkapi ${bench.minNeeded} post ber-data dulu.` : "Catat post dengan reach terisi."}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {recent.map((c) => {
              const post = posts.find((p) => p.id === c.postId)!;
              return (
                <li key={c.postId} className="rounded-lg border border-gray-100 bg-white p-3 text-sm shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{post.hook.slice(0, 70)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STAGE_STYLE[c.stage]}`}>
                      {STAGE_LABEL[c.stage]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatTanggal(post.postedAt)} · {c.findings.join(" · ")}
                  </p>
                  <p className="mt-1.5 text-sm text-gray-700">{c.advice}</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Prinsip: {principle(c.principleId).title} · keyakinan {c.confidence.toLowerCase()}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Prinsip yang dipakai pelatih ini (semua publik & teruji di datamu)">
        <ul className="grid gap-3 sm:grid-cols-2">
          {COACH_PRINCIPLES.map((p) => (
            <li key={p.id} className="rounded-lg bg-gray-50 p-3 text-sm">
              <div className="font-semibold">{p.title}</div>
              <p className="mt-0.5 text-xs text-gray-500">{p.statement}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">Diuji lewat: {p.howWeTest}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-400">
          Yang berlabel “hipotesis” bukan pernyataan Meta — dan pernyataan Meta pun tetap kami uji di
          datamu sendiri, karena tiap akun berbeda.{" "}
          <Link href="/eksperimen" className="underline">Uji lewat kartu eksperimen →</Link>
        </p>
      </Card>
    </div>
  );
}
