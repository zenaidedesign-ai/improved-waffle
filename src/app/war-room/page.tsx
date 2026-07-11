import { setDecisionStatus } from "@/actions/warRoom";
import { WarRoomForm } from "@/components/WarRoomForm";
import { Card, DecisionChip, GateLockBanner, PageHeader, SensitiveDataNotice } from "@/components/ui";
import { currentWeekStart, getGateStatus, getWeekMetrics } from "@/lib/data";
import { db } from "@/lib/db";
import { CONFIG } from "@/lib/domain/config";
import { KEPUTUSAN_LABEL, type Keputusan } from "@/lib/domain/enums";
import { formatTanggal, formatTanggalJam } from "@/lib/format";
import { gateLock } from "@/lib/engine/gates";
import { buildWeeklyCompare } from "@/lib/engine/warRoom";

export const dynamic = "force-dynamic";

export default async function WarRoomPage() {
  const gates = await getGateStatus();
  const lock = gateLock(gates.gate0, gates.gate1);
  const weekStart = currentWeekStart();
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 3600 * 1000);

  const [thisWeek, lastWeek, thisSession, lastSession, verdictsThisWeek] = await Promise.all([
    getWeekMetrics(weekStart),
    getWeekMetrics(lastWeekStart),
    db.warRoomSession.findUnique({ where: { weekStart }, include: { decisions: true } }),
    db.warRoomSession.findUnique({ where: { weekStart: lastWeekStart }, include: { decisions: true } }),
    db.verdict.findMany({ where: { createdAt: { gte: weekStart } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const compare = buildWeeklyCompare(thisWeek, lastWeek);
  const utama = compare.filter((r) => r.kind === "UTAMA");
  const diagnostik = compare.filter((r) => r.kind === "DIAGNOSTIK");
  const decisionsUsed = thisSession?.decisions.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Keputusan Mingguan (War Room)"
        subtitle={`Minggu mulai ${formatTanggal(weekStart)}. Baca metrik UTAMA dulu, diagnostik kedua — lalu komit maksimal ${CONFIG.warRoomMaxDecisions} keputusan untuk minggu depan.`}
      />

      <SensitiveDataNotice />

      {lock.locked && lock.lockVerdict && (
        <div className="mb-6">
          <GateLockBanner verdict={lock.lockVerdict} />
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="Metrik UTAMA — minggu ini vs minggu lalu">
          <CompareList rows={utama} bold />
          <p className="mt-2 text-xs text-gray-400">
            Catatan kejujuran: sebelum modul Leads penuh hadir, survei/proposal dihitung dari status
            lead yang DIBUAT minggu itu — pendekatan, bukan tanggal kejadian persis.
          </p>
        </Card>
        <Card title="Diagnostik — bahan analisis, bukan keberhasilan">
          <CompareList rows={diagnostik} />
        </Card>
      </div>

      {lastSession && lastSession.decisions.length > 0 && (
        <Card title="Keputusan minggu lalu — sudah jalan?" className="mb-6">
          <ul className="space-y-2">
            {lastSession.decisions.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
                <DecisionChip decision={d.decision as Keputusan} />
                <span className="text-gray-600">{d.reason}</span>
                <span className="ml-auto flex gap-1">
                  {(["SELESAI", "BATAL", "TERBUKA"] as const).map((s) => {
                    const bound = setDecisionStatus.bind(null, d.id, s);
                    return (
                      <form key={s} action={bound}>
                        <button
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            d.status === s
                              ? "bg-gray-900 text-white"
                              : "border border-gray-300 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {s === "SELESAI" ? "✓ Selesai" : s === "BATAL" ? "Batal" : "Terbuka"}
                        </button>
                      </form>
                    );
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Vonis yang tercatat minggu ini" className="mb-6">
        {verdictsThisWeek.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada vonis tercatat minggu ini. Vonis tercatat saat audit disimpan atau saat Anda
            menekan “Catat vonis” di kampanye.
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {verdictsThisWeek.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400">{formatTanggalJam(v.createdAt)}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                  {v.subjectType}
                </span>
                <DecisionChip decision={v.decision as Keputusan} />
                <span className="text-xs text-gray-400">aturan: {v.ruleFired}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Eksperimen konten" className="mb-6">
        <p className="text-sm text-gray-500">
          Papan eksperimen 30 hari sudah aktif di menu <b>Eksperimen 30 Hari</b> — kartu yang jatuh
          tempo evaluasinya tampil di sana. Keputusan war room yang menyangkut konten sebaiknya
          merujuk kartu eksperimen, bukan perasaan.
        </p>
      </Card>

      <Card
        title={
          thisSession
            ? `Keputusan minggu ini (${decisionsUsed}/${CONFIG.warRoomMaxDecisions} terpakai)`
            : "Komit keputusan minggu ini"
        }
      >
        {thisSession && thisSession.decisions.length > 0 && (
          <ul className="mb-4 space-y-2">
            {thisSession.decisions.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
                <DecisionChip decision={d.decision as Keputusan} />
                <span className="text-gray-600">{d.reason}</span>
                <span className="ml-auto text-xs text-gray-400">{KEPUTUSAN_LABEL[d.decision as Keputusan] ? d.status : d.status}</span>
              </li>
            ))}
          </ul>
        )}
        <WarRoomForm
          maxDecisions={CONFIG.warRoomMaxDecisions}
          remaining={CONFIG.warRoomMaxDecisions - decisionsUsed}
        />
      </Card>
    </div>
  );
}

function CompareList({
  rows,
  bold = false,
}: {
  rows: Array<{
    key: string;
    label: string;
    thisWeek: number | null;
    lastWeek: number | null;
    deltaPct: number | null;
    direction: string;
  }>;
  bold?: boolean;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
          <th className="py-1.5 pr-2"></th>
          <th className="py-1.5 pr-2 text-right">Minggu ini</th>
          <th className="py-1.5 pr-2 text-right">Minggu lalu</th>
          <th className="py-1.5 text-right">Δ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-b border-gray-100">
            <td className={`py-1.5 pr-2 ${bold ? "font-semibold" : ""}`}>{r.label}</td>
            <td className={`py-1.5 pr-2 text-right ${bold ? "text-lg font-black" : ""}`}>
              {r.thisWeek ?? "—"}
            </td>
            <td className="py-1.5 pr-2 text-right text-gray-500">{r.lastWeek ?? "—"}</td>
            <td
              className={`py-1.5 text-right text-xs font-semibold ${
                r.direction === "NAIK"
                  ? "text-emerald-600"
                  : r.direction === "TURUN"
                    ? "text-red-600"
                    : "text-gray-400"
              }`}
            >
              {r.deltaPct != null ? `${r.deltaPct > 0 ? "+" : ""}${r.deltaPct}%` : r.direction === "BARU" ? "baru" : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
