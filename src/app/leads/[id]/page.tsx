import { notFound } from "next/navigation";
import { setLeadStatus } from "@/actions/lead";
import { LeadForm, type LeadFormInitial } from "@/components/LeadForm";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { LEAD_STATUS, type LeadSource, type LeadStatus } from "@/lib/domain/enums";
import { formatTanggalJam } from "@/lib/format";
import { triageLead, TRIAGE_LABEL } from "@/lib/engine/leadTriage";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: { events: { orderBy: { eventAt: "desc" }, take: 20 } },
  });
  if (!lead) notFound();

  const t = triageLead(
    {
      id: lead.id,
      name: lead.name,
      status: lead.status,
      qualityScore: lead.qualityScore,
      qualAnswersCount: lead.qualAnswersCount,
      estimatedValueJuta: lead.estimatedValueJuta,
      createdAt: lead.createdAt,
      lastContactAt: lead.lastContactAt,
      surveyAt: lead.surveyAt,
      proposalSentAt: lead.proposalSentAt,
    },
    new Date(),
  );

  const initial: LeadFormInitial = {
    id: lead.id,
    name: lead.name,
    sourceType: lead.sourceType as LeadSource,
    status: lead.status as LeadStatus,
    signalBudget: lead.signalBudget,
    signalProjectType: lead.signalProjectType,
    signalLocation: lead.signalLocation,
    signalUrgency: lead.signalUrgency,
    signalSeriousness: lead.signalSeriousness,
    qualAnswersCount: lead.qualAnswersCount,
    estimatedValueJuta: lead.estimatedValueJuta,
    surveyAt: lead.surveyAt ? lead.surveyAt.toISOString().slice(0, 16) : "",
    proposalSentAt: lead.proposalSentAt ? lead.proposalSentAt.toISOString().slice(0, 10) : "",
    notes: lead.notes ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`${t.noorHandle ? "👑 " : ""}${lead.name}`}
        subtitle={`${TRIAGE_LABEL[t.triage]} — ${t.reason} · Prob. closing (estimasi kasar): ${t.closingProbabilityPct}%${t.noorHandle ? ` · TANGANI NOOR SENDIRI (${t.noorReason})` : ""}`}
      />

      <Card title="Ubah status cepat" className="mb-4">
        <div className="flex flex-wrap gap-1.5">
          {LEAD_STATUS.map((s) => {
            const bound = setLeadStatus.bind(null, lead.id, s);
            return (
              <form key={s} action={bound}>
                <button
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    lead.status === s ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {s.toLowerCase().replaceAll("_", " ")}
                </button>
              </form>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-400">Mengubah status otomatis mencatat kontak & event.</p>
      </Card>

      <div className="mb-4">
        <LeadForm initial={initial} />
      </div>

      <Card title="Riwayat">
        {lead.events.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada event.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {lead.events.map((e) => (
              <li key={e.id} className="flex gap-2">
                <span className="whitespace-nowrap text-xs text-gray-400">{formatTanggalJam(e.eventAt)}</span>
                <span className="text-gray-600">
                  {e.type === "STATUS_CHANGE"
                    ? `${e.fromStatus?.toLowerCase().replaceAll("_", " ") ?? "—"} → ${e.toStatus?.toLowerCase().replaceAll("_", " ")}`
                    : e.note}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
