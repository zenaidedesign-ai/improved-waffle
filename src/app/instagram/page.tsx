import Link from "next/link";
import { Card, EmptyState, GateLockBanner, PageHeader, StatusChip } from "@/components/ui";
import { SnapshotForm } from "@/components/SnapshotForm";
import { mapPostToInput, getGateStatus } from "@/lib/data";
import { db } from "@/lib/db";
import { CONFIG } from "@/lib/domain/config";
import {
  IG_FORMAT_LABEL,
  PILAR_LABEL,
  type IgFormat,
  type Pilar,
} from "@/lib/domain/enums";
import { formatAngka, formatPct, formatTanggal } from "@/lib/format";
import { gateLock } from "@/lib/engine/gates";
import {
  compareByDimension,
  contentMixAnalysis,
  detectOrganicWinners,
  nonFollowerTrend,
} from "@/lib/engine/igDiagnosis";

export const dynamic = "force-dynamic";

export default async function InstagramPage() {
  const gates = await getGateStatus();
  const lock = gateLock(gates.gate0, gates.gate1);

  const [posts, snapshots] = await Promise.all([
    db.igPost.findMany({ orderBy: { postedAt: "desc" }, include: { leads: true } }),
    db.igAccountSnapshot.findMany({ orderBy: { weekStart: "desc" }, take: 12 }),
  ]);
  const inputs = posts.map(mapPostToInput);

  const trend = nonFollowerTrend(
    snapshots
      .filter((s) => s.reachNonFollowerPct != null)
      .map((s) => ({ date: s.weekStart, pct: s.reachNonFollowerPct! })),
  );
  const mix = contentMixAnalysis(inputs);
  const winners = detectOrganicWinners(inputs);
  const winnerIds = new Set(winners.winners.map((w) => w.postId));
  const byFormat = compareByDimension(inputs, "format");
  const byPillar = compareByDimension(inputs, "pillar");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Diagnosa Distribusi Instagram"
        subtitle="Apakah konten menjangkau non-follower? Post mana yang menghasilkan saves, shares, kunjungan profil, klik WA, dan lead berkualitas? Terlalu berat portofolio?"
        action={
          <Link
            href="/instagram/post/baru"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
          >
            + Catat post (±60 detik)
          </Link>
        }
      />

      {lock.locked && lock.lockVerdict && (
        <div className="mb-6">
          <GateLockBanner verdict={lock.lockVerdict} />
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card title="Tren % reach non-follower">
          {trend.direction === "DATA_KURANG" ? (
            <p className="text-sm text-gray-500">
              Data belum cukup — butuh minimal {CONFIG.trendMinPoints} snapshot mingguan.
            </p>
          ) : (
            <div>
              <div className="text-2xl font-black">
                {trend.direction === "NAIK" ? "↗ Naik" : trend.direction === "TURUN" ? "↘ Turun" : "→ Datar"}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {trend.slopePctPerWeek! > 0 ? "+" : ""}
                {trend.slopePctPerWeek} poin persen per minggu. Snapshot terakhir:{" "}
                {formatPct(snapshots[0]?.reachNonFollowerPct)}.
              </p>
            </div>
          )}
        </Card>

        <Card title="Campuran konten">
          {mix.insufficient ? (
            <p className="text-sm text-gray-500">
              Data belum cukup — catat minimal {CONFIG.winnerMinPosts} post.
            </p>
          ) : (
            <div className="text-sm">
              <div className="text-2xl font-black">{mix.portfolioSharePct}% portofolio</div>
              {mix.tooPortfolioHeavy ? (
                <p className="mt-1 font-semibold text-red-700">
                  Terlalu berat portofolio (ambang {CONFIG.portfolioHeavyPct}%). Non-follower tidak
                  punya alasan peduli — mereka belum kenal Zenaide.
                </p>
              ) : (
                <p className="mt-1 text-emerald-700">Campuran konten dalam batas sehat.</p>
              )}
              {mix.missingPillars.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Pilar yang belum ada:{" "}
                  {mix.missingPillars.map((p) => PILAR_LABEL[p as Pilar]).join(", ")}.
                </p>
              )}
            </div>
          )}
        </Card>

        <Card title="Status rekomendasi (snapshot)">
          {snapshots[0] ? (
            <div className="text-sm">
              <StatusChip
                status={
                  snapshots[0].recommendationStatus === "LAYAK"
                    ? "HIJAU"
                    : snapshots[0].recommendationStatus === "BELUM_DICEK"
                      ? "BELUM_DICEK"
                      : "MERAH"
                }
                label={snapshots[0].recommendationStatus.replaceAll("_", " ").toLowerCase()}
              />
              <p className="mt-2 text-xs text-gray-500">
                Cek mendalam ada di{" "}
                <Link className="underline" href="/audit/rekomendasi">
                  Audit Kelayakan Rekomendasi
                </Link>
                .
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Belum ada snapshot mingguan.</p>
          )}
        </Card>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="Performa per format (median)">
          <CompareTable rows={byFormat} labeler={(k) => IG_FORMAT_LABEL[k as IgFormat] ?? k} />
        </Card>
        <Card title="Performa per pilar (median)">
          <CompareTable rows={byPillar} labeler={(k) => PILAR_LABEL[k as Pilar] ?? k} />
        </Card>
      </div>

      <Card title="Pemenang organik → kandidat iklan" className="mb-6">
        {winners.insufficient ? (
          <p className="text-sm text-gray-500">
            Data belum cukup — butuh minimal {winners.minNeeded} post untuk deteksi pemenang yang jujur.
          </p>
        ) : winners.winners.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada post yang lolos kriteria pemenang (sinyal ≥ persentil-80 DAN minimal 1 lead terlacak).
          </p>
        ) : (
          <ul className="space-y-2">
            {winners.winners.map((w) => {
              const post = posts.find((p) => p.id === w.postId)!;
              return (
                <li key={w.postId} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <div className="font-semibold text-gray-900">🏆 {post.hook}</div>
                  <div className="mt-0.5 text-xs text-gray-600">{w.reasons.join(" · ")}</div>
                  <div className="mt-1 text-xs font-semibold text-emerald-700">
                    Keputusan: jadikan iklan — pertahankan hook, uji CTA langsung ke WA.
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Log konten" className="mb-6">
        {posts.length === 0 ? (
          <EmptyState>
            Belum ada post tercatat. Mulai dari{" "}
            <Link href="/instagram/post/baru" className="underline">
              form 60 detik
            </Link>{" "}
            atau muat data contoh di Ruang Kendali.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Hook</th>
                  <th className="py-2 pr-3">Format</th>
                  <th className="py-2 pr-3">Pilar</th>
                  <th className="py-2 pr-3 text-right">Reach</th>
                  <th className="py-2 pr-3 text-right">Non-follower</th>
                  <th className="py-2 pr-3 text-right">Saves</th>
                  <th className="py-2 pr-3 text-right">Shares</th>
                  <th className="py-2 pr-3 text-right">Klik WA</th>
                  <th className="py-2 pr-3 text-right">Lead ✓</th>
                  <th className="py-2 text-right">Skor sinyal</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p, i) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 whitespace-nowrap text-gray-500">{formatTanggal(p.postedAt)}</td>
                    <td className="max-w-72 truncate py-2 pr-3" title={p.hook}>
                      {winnerIds.has(p.id) && "🏆 "}
                      {p.hook}
                    </td>
                    <td className="py-2 pr-3">{IG_FORMAT_LABEL[p.format as IgFormat] ?? p.format}</td>
                    <td className="py-2 pr-3 text-xs">{PILAR_LABEL[p.pillar as Pilar] ?? p.pillar}</td>
                    <td className="py-2 pr-3 text-right">{formatAngka(p.reach)}</td>
                    <td className="py-2 pr-3 text-right">{formatAngka(p.reachNonFollower)}</td>
                    <td className="py-2 pr-3 text-right">{formatAngka(p.saves)}</td>
                    <td className="py-2 pr-3 text-right">{formatAngka(p.shares)}</td>
                    <td className="py-2 pr-3 text-right">{formatAngka(p.waClicks)}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{inputs[i].qualifiedLeadsAttributed}</td>
                    <td className="py-2 text-right">{p.signalScore ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Snapshot mingguan akun">
        <SnapshotForm />
        {snapshots.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3">Minggu mulai</th>
                  <th className="py-2 pr-3 text-right">Followers</th>
                  <th className="py-2 pr-3 text-right">Reach</th>
                  <th className="py-2 pr-3 text-right">% non-follower</th>
                  <th className="py-2 pr-3 text-right">Kunjungan profil</th>
                  <th className="py-2">Rekomendasi</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-gray-500">{formatTanggal(s.weekStart)}</td>
                    <td className="py-2 pr-3 text-right">{formatAngka(s.followerCount)}</td>
                    <td className="py-2 pr-3 text-right">{formatAngka(s.reachTotal)}</td>
                    <td className="py-2 pr-3 text-right">{formatPct(s.reachNonFollowerPct)}</td>
                    <td className="py-2 pr-3 text-right">{formatAngka(s.profileVisits)}</td>
                    <td className="py-2 text-xs">{s.recommendationStatus.replaceAll("_", " ").toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function CompareTable({
  rows,
  labeler,
}: {
  rows: Array<{
    key: string;
    n: number;
    medianReach: number | null;
    medianSaves: number | null;
    medianShares: number | null;
    medianWaClicks: number | null;
    totalQualifiedLeads: number;
  }>;
  labeler: (k: string) => string;
}) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">Belum ada data.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
          <th className="py-1.5 pr-2"></th>
          <th className="py-1.5 pr-2 text-right">n</th>
          <th className="py-1.5 pr-2 text-right">Reach</th>
          <th className="py-1.5 pr-2 text-right">Saves</th>
          <th className="py-1.5 pr-2 text-right">Shares</th>
          <th className="py-1.5 pr-2 text-right">Klik WA</th>
          <th className="py-1.5 text-right">Lead ✓</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-b border-gray-100">
            <td className="py-1.5 pr-2 text-xs font-semibold">{labeler(r.key)}</td>
            <td className="py-1.5 pr-2 text-right text-gray-500">{r.n}</td>
            <td className="py-1.5 pr-2 text-right">{formatAngka(r.medianReach)}</td>
            <td className="py-1.5 pr-2 text-right">{formatAngka(r.medianSaves)}</td>
            <td className="py-1.5 pr-2 text-right">{formatAngka(r.medianShares)}</td>
            <td className="py-1.5 pr-2 text-right">{formatAngka(r.medianWaClicks)}</td>
            <td className="py-1.5 text-right font-semibold">{r.totalQualifiedLeads}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
