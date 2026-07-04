import Link from "next/link";
import { Card, EmptyState, GateLockBanner, PageHeader, VerdictCard } from "@/components/ui";
import { buildCampaignFunnel, getGateStatus } from "@/lib/data";
import { db } from "@/lib/db";
import { CONFIG } from "@/lib/domain/config";
import { LAPISAN_LABEL } from "@/lib/domain/enums";
import { formatAngka, formatJuta, formatPct, formatRibu } from "@/lib/format";
import { computeCostChain, decideCampaign, diagnoseLayer } from "@/lib/engine/adsRescue";
import { gateLock } from "@/lib/engine/gates";

export const dynamic = "force-dynamic";

export default async function KampanyePage() {
  const gates = await getGateStatus();
  const lock = gateLock(gates.gate0, gates.gate1);
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { metrics: true, leads: true },
  });

  const rows = campaigns.map((c) => {
    const chain = computeCostChain(buildCampaignFunnel(c));
    const target = c.targetCpqlRibu ?? CONFIG.adsTargetCpqlRibu;
    return {
      campaign: c,
      chain,
      verdict: decideCampaign(chain, gates.gate0, gates.gate1, target),
      layer: diagnoseLayer(chain, gates.gate0, gates.gate1),
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Meta Ads Rescue"
        subtitle="Rantai kebenaran biaya: spend → biaya per chat → biaya per lead BERKUALITAS → biaya per survei → nilai pipeline. Chat murah bukan bukti iklan bekerja."
        action={
          <Link
            href="/kampanye/baru"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
          >
            + Tambah kampanye
          </Link>
        }
      />

      {lock.locked && lock.lockVerdict && (
        <div className="mb-6">
          <GateLockBanner verdict={lock.lockVerdict} />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState>
          Belum ada kampanye tercatat. Tambahkan manual dari angka Ads Manager Anda, atau muat data
          contoh di Ruang Kendali.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {rows.map(({ campaign, chain, verdict, layer }) => (
            <Card key={campaign.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/kampanye/${campaign.id}`}
                    className="font-bold text-gray-900 underline-offset-2 hover:underline"
                  >
                    {campaign.name}
                  </Link>
                  <span className="ml-2 text-xs text-gray-400">{campaign.status}</span>
                </div>
                <span className="text-xs text-gray-500">
                  Lapisan masalah: <b>{LAPISAN_LABEL[layer.layer]}</b>
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-7">
                <Stat label="Spend" value={formatRibu(chain.spendRibu)} />
                <Stat label="CTR" value={formatPct(chain.ctrPct, 1)} />
                <Stat label="Chat" value={String(chain.chats)} sub={chain.resultsPlatform != null ? `Ads Mgr klaim: ${formatAngka(chain.resultsPlatform)}` : undefined} />
                <Stat label="Biaya/chat" value={chain.costPerChatRibu != null ? formatRibu(chain.costPerChatRibu) : "—"} />
                <Stat
                  label="Lead ✓ / CPQL"
                  value={`${chain.qualifiedLeads} · ${chain.cpqlRibu != null ? formatRibu(chain.cpqlRibu) : "—"}`}
                  sub={chain.qualRatePct != null ? `kualifikasi ${chain.qualRatePct}%` : undefined}
                />
                <Stat label="Survei" value={String(chain.surveys)} />
                <Stat label="Pipeline" value={formatJuta(chain.pipelineValueJuta)} />
              </div>

              <div className="mt-3">
                <VerdictCard verdict={verdict} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="font-bold text-gray-900">{value}</div>
      {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
    </div>
  );
}
