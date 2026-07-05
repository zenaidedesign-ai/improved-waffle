import { notFound } from "next/navigation";
import { recordCampaignVerdict } from "@/actions/campaign";
import { FunnelUpdateForm, MetricAddForm } from "@/components/CampaignForms";
import { Card, DecisionChip, PageHeader, VerdictCard } from "@/components/ui";
import { buildCampaignFunnel, getGateStatus } from "@/lib/data";
import { db } from "@/lib/db";
import { CONFIG } from "@/lib/domain/config";
import { LAPISAN_LABEL, type Keputusan } from "@/lib/domain/enums";
import { formatAngka, formatRibu, formatTanggal, formatTanggalJam } from "@/lib/format";
import { assessDataQuality, computeCostChain, decideCampaign, diagnoseLayer } from "@/lib/engine/adsRescue";

export const dynamic = "force-dynamic";

export default async function KampanyeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      metrics: { orderBy: { date: "desc" } },
      leads: true,
      verdicts: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!campaign) notFound();

  const gates = await getGateStatus();
  const chain = computeCostChain(buildCampaignFunnel(campaign));
  const target = campaign.targetCpqlRibu ?? CONFIG.adsTargetCpqlRibu;
  const dq = assessDataQuality(campaign.metrics.map((m) => ({ date: m.date, sourceType: m.sourceType })), new Date());
  const verdict = decideCampaign(chain, gates.gate0, gates.gate1, target, dq);
  const layer = diagnoseLayer(chain, gates.gate0, gates.gate1);
  const recordWithId = recordCampaignVerdict.bind(null, campaign.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={campaign.name}
        subtitle={`Target CPQL: ${formatRibu(target)} per lead berkualitas. Lapisan masalah terdeteksi: ${LAPISAN_LABEL[layer.layer]}.`}
      />

      <div className="mb-4">
        <VerdictCard verdict={verdict} />
        <form action={recordWithId} className="mt-2">
          <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">
            Catat vonis ini ke log keputusan
          </button>
        </form>
      </div>

      <Card title="Corong manual (dari log WhatsApp Anda)" className="mb-4">
        <FunnelUpdateForm
          campaignId={campaign.id}
          initial={{
            manualChats: campaign.manualChats,
            manualQualifiedLeads: campaign.manualQualifiedLeads,
            manualSurveys: campaign.manualSurveys,
            manualPipelineJuta: campaign.manualPipelineJuta,
            status: campaign.status,
            notes: campaign.notes ?? "",
          }}
        />
      </Card>

      <Card title="Data harian (dari Ads Manager)" className="mb-4">
        <MetricAddForm campaignId={campaign.id} />
        {campaign.metrics.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3 text-right">Spend</th>
                  <th className="py-2 pr-3 text-right">Impresi</th>
                  <th className="py-2 pr-3 text-right">Klik</th>
                  <th className="py-2 text-right">“Hasil” Ads Mgr</th>
                </tr>
              </thead>
              <tbody>
                {campaign.metrics.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-gray-500">{formatTanggal(m.date)}</td>
                    <td className="py-2 pr-3 text-right">{formatRibu(m.spendRibu)}</td>
                    <td className="py-2 pr-3 text-right">{formatAngka(m.impressions)}</td>
                    <td className="py-2 pr-3 text-right">{formatAngka(m.clicks)}</td>
                    <td className="py-2 text-right">{formatAngka(m.resultsPlatform)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-400">
              Kolom “Hasil” hanya pembanding kejujuran tracking — vonis dihitung dari chat & lead nyata.
            </p>
          </div>
        )}
      </Card>

      {campaign.verdicts.length > 0 && (
        <Card title="Log vonis kampanye ini">
          <ul className="space-y-2 text-sm">
            {campaign.verdicts.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400">{formatTanggalJam(v.createdAt)}</span>
                <DecisionChip decision={v.decision as Keputusan} />
                <span className="text-xs text-gray-500">aturan: {v.ruleFired}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
