import Link from "next/link";
import { touchLeadContact } from "@/actions/lead";
import { Card, EmptyState, PageHeader, SensitiveDataNotice } from "@/components/ui";
import { db } from "@/lib/db";
import { formatJuta, formatTanggal } from "@/lib/format";
import {
  followUpQueue,
  triageLead,
  TRIAGE_LABEL,
  type LeadTriageInput,
  type Triage,
} from "@/lib/engine/leadTriage";

export const dynamic = "force-dynamic";

const TRIAGE_STYLE: Record<Triage, string> = {
  HOT_LEAD: "bg-emerald-100 text-emerald-700",
  URGENT: "bg-red-100 text-red-700",
  FOLLOW_UP: "bg-amber-100 text-amber-700",
  NURTURE: "bg-blue-50 text-blue-600",
  IGNORE: "bg-gray-100 text-gray-500",
  DEAD_LEAD: "bg-gray-200 text-gray-500",
};

export default async function LeadsPage() {
  const now = new Date();
  const leads = await db.lead.findMany({ orderBy: { createdAt: "desc" } });
  const inputs: LeadTriageInput[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    status: l.status,
    qualityScore: l.qualityScore,
    qualAnswersCount: l.qualAnswersCount,
    estimatedValueJuta: l.estimatedValueJuta,
    createdAt: l.createdAt,
    lastContactAt: l.lastContactAt,
    surveyAt: l.surveyAt,
    proposalSentAt: l.proposalSentAt,
  }));
  const triaged = new Map(inputs.map((i) => [i.id, triageLead(i, now)]));
  const queue = followUpQueue(inputs, now);
  const upcomingSurveys = leads
    .filter((l) => l.surveyAt && l.surveyAt >= new Date(now.getTime() - 24 * 3600 * 1000))
    .sort((a, b) => a.surveyAt!.getTime() - b.surveyAt!.getTime());
  const proposals = leads.filter((l) => ["PROPOSAL_TERKIRIM", "NEGOSIASI"].includes(l.status));

  const order: Triage[] = ["URGENT", "HOT_LEAD", "FOLLOW_UP", "NURTURE", "IGNORE", "DEAD_LEAD"];
  const sorted = [...leads].sort(
    (a, b) =>
      order.indexOf(triaged.get(a.id)!.triage) - order.indexOf(triaged.get(b.id)!.triage) ||
      b.estimatedValueJuta - a.estimatedValueJuta,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Lead Intelligence"
        subtitle="Triase deterministik — sistem menjelaskan KENAPA setiap lead diberi label. 👑 = wajib ditangani Noor sendiri (nilai besar / negosiasi / prob. closing tinggi). Probabilitas closing = estimasi kasar, bukan ramalan."
        action={
          <Link href="/leads/baru" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">
            + Catat lead
          </Link>
        }
      />

      <SensitiveDataNotice />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card title="Follow-up hari ini">
          {queue.length === 0 ? (
            <p className="text-sm text-gray-500">Kosong — tidak ada yang menunggu.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {queue.slice(0, 5).map((f) => (
                <li key={f.id} className="rounded-lg bg-gray-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{f.name}</span>
                    <form action={touchLeadContact.bind(null, f.id, undefined)}>
                      <button className="rounded border border-gray-300 px-2 py-0.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-100">
                        ✓ Sudah di-follow-up
                      </button>
                    </form>
                  </div>
                  <p className="text-xs text-gray-500">{f.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Jadwal survei">
          {upcomingSurveys.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada survei terjadwal.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {upcomingSurveys.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <Link href={`/leads/${l.id}`} className="underline-offset-2 hover:underline">{l.name}</Link>
                  <span className="text-gray-500">{formatTanggal(l.surveyAt!)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Proposal berjalan">
          {proposals.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada proposal aktif.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {proposals.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <Link href={`/leads/${l.id}`} className="underline-offset-2 hover:underline">{l.name}</Link>
                  <span className="font-semibold">{formatJuta(l.estimatedValueJuta)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Semua lead">
        {sorted.length === 0 ? (
          <EmptyState>Belum ada lead tercatat. Setiap chat masuk = satu baris di sini.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3">Triase</th>
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Skor</th>
                  <th className="py-2 pr-3 text-right">Prob. closing*</th>
                  <th className="py-2 pr-3 text-right">Nilai</th>
                  <th className="py-2 pr-3 text-right">Senyap (hari)</th>
                  <th className="py-2">Alasan triase</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((l) => {
                  const t = triaged.get(l.id)!;
                  return (
                    <tr key={l.id} className="border-b border-gray-100 align-top">
                      <td className="py-2 pr-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${TRIAGE_STYLE[t.triage]}`}>
                          {TRIAGE_LABEL[t.triage]}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <Link href={`/leads/${l.id}`} className="font-semibold underline-offset-2 hover:underline">
                          {t.noorHandle && (
                            <span title={`Tangani Noor sendiri: ${t.noorReason ?? ""}`} className="mr-1">👑</span>
                          )}
                          {l.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-500">{l.status.toLowerCase().replaceAll("_", " ")}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{l.qualityScore}</td>
                      <td className="py-2 pr-3 text-right">{t.closingProbabilityPct}%</td>
                      <td className="py-2 pr-3 text-right">{formatJuta(l.estimatedValueJuta)}</td>
                      <td className={`py-2 pr-3 text-right ${t.ghostingRisk ? "font-bold text-red-600" : ""}`}>
                        {t.silentDays}
                        {t.ghostingRisk && " ⚠"}
                      </td>
                      <td className="max-w-96 py-2 text-xs text-gray-500">{t.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-400">
              *Probabilitas closing = estimasi kasar dari status corong + skor + lama senyap. Setelah ≥ 20
              lead tertutup, angka ini harus dikalibrasi ulang dari data closing nyata.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
