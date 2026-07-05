import { Card, DecisionChip, PageHeader } from "@/components/ui";
import { getDashboardData } from "@/lib/dashboard";
import { currentWeekStart, getWeekMetrics } from "@/lib/data";
import { AD_CHANNEL_LABEL, KEPUTUSAN_LABEL, type AdChannel, type Keputusan, PILAR_LABEL, type Pilar } from "@/lib/domain/enums";
import { formatJuta, formatTanggal } from "@/lib/format";
import { db } from "@/lib/db";
import { mapPostToInput } from "@/lib/data";
import { compareByDimension } from "@/lib/engine/igDiagnosis";

export const dynamic = "force-dynamic";

export default async function LaporanPage() {
  const weekStart = currentWeekStart();
  const [d, thisWeek, posts] = await Promise.all([
    getDashboardData(),
    getWeekMetrics(weekStart),
    db.igPost.findMany({ include: { leads: true } }),
  ]);

  const byPillar = compareByDimension(posts.map(mapPostToInput), "pillar")
    .filter((r) => r.n >= 2)
    .sort(
      (a, b) =>
        (b.medianShares ?? 0) + b.totalQualifiedLeads * 5 - ((a.medianShares ?? 0) + a.totalQualifiedLeads * 5),
    );
  const topPillar = byPillar[0];

  const channels = [...new Set(d.allCampaigns.map((c) => c.channel))] as AdChannel[];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Laporan Revenue Mingguan"
        subtitle={`Minggu mulai ${formatTanggal(weekStart)} — semua angka dari data yang tercatat di sistem, bukan estimasi.`}
      />

      <Card title="Pipeline minggu ini" className="mb-4">
        <div className="text-3xl font-black">{formatJuta(d.primary.pipelineValueJuta)}</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Num label="Qualified Leads" value={thisWeek.qualifiedLeads} />
          <Num label="Survey" value={thisWeek.surveys} />
          <Num label="Proposal" value={thisWeek.proposals} />
          <Num label="Closing" value={formatJuta(thisWeek.closingValueJuta)} />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Angka mingguan dihitung dari lead yang dibuat minggu ini (pendekatan — modul Leads mencatat
          status, bukan tanggal kejadian per tahap).
        </p>
      </Card>

      {channels.map((ch) => {
        const rows = d.allCampaigns.filter((c) => c.channel === ch && c.status === "AKTIF");
        if (rows.length === 0) return null;
        return (
          <Card key={ch} title={AD_CHANNEL_LABEL[ch] ?? ch} className="mb-4">
            <ul className="space-y-2 text-sm">
              {rows.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{c.name}</span>
                  <DecisionChip decision={c.verdict.decision} />
                  <span className="text-xs text-gray-400">({c.verdict.confidence.toLowerCase()})</span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
      {channels.length === 0 && (
        <Card title="Iklan" className="mb-4">
          <p className="text-sm text-gray-500">Belum ada kampanye tercatat minggu ini.</p>
        </Card>
      )}

      <Card title="Instagram" className="mb-4">
        <p className="text-sm text-gray-700">{d.igHealth.summary}</p>
        {topPillar ? (
          <p className="mt-1 text-sm text-gray-700">
            Pilar terkuat saat ini: <b>{PILAR_LABEL[topPillar.key as Pilar] ?? topPillar.key}</b> (median
            shares {topPillar.medianShares ?? 0}, {topPillar.totalQualifiedLeads} lead berkualitas dari{" "}
            {topPillar.n} post).
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-500">Belum cukup post per pilar untuk menyebut pilar terkuat.</p>
        )}
      </Card>

      <Card title="Top Priority" className="mb-4 border-2 border-gray-900">
        {d.top5.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada prioritas mendesak dari data minggu ini.</p>
        ) : (
          <ol className="list-inside list-decimal space-y-1.5 text-sm">
            {d.top5.map((p) => (
              <li key={p.rank}>
                <span className="font-semibold">{p.title}</span>
                {p.decision && (
                  <span className="ml-1 text-xs text-gray-500">({KEPUTUSAN_LABEL[p.decision as Keputusan]})</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <p className="text-xs text-gray-400">
        Laporan ini dirakit ulang setiap kali dibuka — tidak ada angka yang dikarang. Bagian yang
        kosong berarti datanya memang belum dicatat.
      </p>
    </div>
  );
}

function Num({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-lg font-black">{value}</div>
    </div>
  );
}
