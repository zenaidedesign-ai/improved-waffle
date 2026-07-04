import Link from "next/link";
import { deleteExampleData, loadExampleData } from "@/actions/seed";
import { Card, GateLockBanner, PageHeader, StatusChip } from "@/components/ui";
import { currentWeekStart, getGateStatus, getWeekMetrics, isLeadQualified } from "@/lib/data";
import { db } from "@/lib/db";
import { KEPUTUSAN_LABEL, type Keputusan } from "@/lib/domain/enums";
import { formatJuta } from "@/lib/format";
import { gateLock } from "@/lib/engine/gates";

export const dynamic = "force-dynamic";

export default async function RuangKendali() {
  const gates = await getGateStatus();
  const lock = gateLock(gates.gate0, gates.gate1);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [leadsThisMonth, hasAnyData, openDecisions, weekMetrics] = await Promise.all([
    db.lead.findMany({ where: { createdAt: { gte: monthStart } } }),
    db.igPost.count().then((n) => n > 0),
    db.warRoomDecision.findMany({
      where: { status: "TERBUKA" },
      orderBy: { id: "desc" },
      take: 5,
      include: { session: true },
    }),
    getWeekMetrics(currentWeekStart()),
  ]);

  const qualifiedThisMonth = leadsThisMonth.filter(isLeadQualified).length;
  const pipelineJuta = leadsThisMonth
    .filter((l) => !["CLOSING_KALAH", "GHOSTING"].includes(l.status))
    .reduce((s, l) => s + l.estimatedValueJuta, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Ruang Kendali"
        subtitle="Status fondasi dulu, baru angka. Sistem menolak vonis kampanye/konten sebelum gerbang terbuka."
      />

      {lock.locked && lock.lockVerdict && (
        <div className="mb-6">
          <GateLockBanner verdict={lock.lockVerdict} />
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card title="Gerbang 0 — Fondasi Akun">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <Link href="/audit/meta-account" className="text-gray-700 underline-offset-2 hover:underline">
                Audit Akun Meta
              </Link>
              <StatusChip status={gates.metaVerdict} />
            </div>
            <div className="flex items-center justify-between">
              <Link href="/audit/rekomendasi" className="text-gray-700 underline-offset-2 hover:underline">
                Kelayakan Rekomendasi
              </Link>
              <StatusChip status={gates.rekomendasiVerdict} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 font-semibold">
              <span>Gabungan</span>
              <StatusChip status={gates.gate0} />
            </div>
          </div>
        </Card>
        <Card title="Gerbang 1 — Tracking">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <Link href="/audit/tracking" className="text-gray-700 underline-offset-2 hover:underline">
                Audit Tracking
              </Link>
              <StatusChip status={gates.trackingVerdict} />
            </div>
            <p className="pt-2 text-xs text-gray-500">
              Tanpa tracking yang bisa dipercaya, semua angka biaya per hasil adalah tebakan.
            </p>
          </div>
        </Card>
        <Card title="Metrik Utama Bulan Ini">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Lead berkualitas</span>
              <span className="font-bold">{qualifiedThisMonth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nilai pipeline</span>
              <span className="font-bold">{formatJuta(pipelineJuta)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Lead berkualitas minggu ini</span>
              <span className="font-bold">{weekMetrics.qualifiedLeads}</span>
            </div>
            <p className="pt-2 text-xs text-gray-400">
              Reach, likes, dan followers TIDAK tampil di sini — itu bahan diagnosa, bukan keberhasilan.
            </p>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="Keputusan Terbuka (dari War Room)">
          {openDecisions.length === 0 ? (
            <p className="text-sm text-gray-500">
              Belum ada keputusan terbuka.{" "}
              <Link href="/war-room" className="underline">
                Jalankan War Room mingguan →
              </Link>
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {openDecisions.map((d) => (
                <li key={d.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                  <span className="font-semibold">{KEPUTUSAN_LABEL[d.decision as Keputusan] ?? d.decision}</span>
                  <span className="text-gray-500"> — {d.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Data Contoh">
          <p className="mb-3 text-sm text-gray-500">
            Fase 1 berjalan dengan input manual. Muat data contoh (berlabel <code>[CONTOH]</code>) untuk
            melihat seluruh diagnosa bekerja — termasuk gerbang terkunci dan jebakan chat murah.
            Menghapus data contoh tidak menyentuh data asli.
          </p>
          <div className="flex gap-2">
            <form action={loadExampleData}>
              <button className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700">
                {hasAnyData ? "Muat ulang data contoh" : "Muat data contoh"}
              </button>
            </form>
            <form action={deleteExampleData}>
              <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
                Hapus data contoh
              </button>
            </form>
          </div>
        </Card>
      </div>

      <Card title="Alur kerja yang disarankan">
        <ol className="list-inside list-decimal space-y-1 text-sm text-gray-700">
          <li>Jalankan tiga audit (Akun Meta, Rekomendasi, Tracking) — buka gerbangnya.</li>
          <li>Isi log konten Instagram &amp; snapshot mingguan → lihat Diagnosa Instagram.</li>
          <li>Masukkan kampanye &amp; angka corong manual → lihat vonis Meta Ads Rescue.</li>
          <li>Setiap minggu: buka War Room, baca perbandingan, komit maksimal 5 keputusan.</li>
        </ol>
      </Card>
    </div>
  );
}
