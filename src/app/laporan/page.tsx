// Revenue War Room — laporan eksekutif mingguan (Phase 10).
// Nada: langsung, senior, fokus revenue. Bagian kosong = datanya memang kosong.

import Link from "next/link";
import { Card, DecisionChip, PageHeader } from "@/components/ui";
import { getDashboardData } from "@/lib/dashboard";
import { DataTruthPanel } from "@/components/DataTruthPanel";
import { getTruthPanelData } from "@/lib/truthPanel";
import { currentWeekStart, getWeekMetrics, isLeadQualified, mapPostToInput } from "@/lib/data";
import { db } from "@/lib/db";
import {
  AD_CHANNEL_LABEL,
  KEPUTUSAN_LABEL,
  PILAR_LABEL,
  type AdChannel,
  type Keputusan,
  type Pilar,
} from "@/lib/domain/enums";
import { formatJuta, formatRibu, formatTanggal } from "@/lib/format";
import { compareByDimension } from "@/lib/engine/igDiagnosis";
import { triageLead } from "@/lib/engine/leadTriage";
import {
  buildOwnerActions,
  buildWorkedFailed,
  detectFunnelLeak,
  pickBestWorstCampaigns,
  top3,
} from "@/lib/engine/weeklyReport";

export const dynamic = "force-dynamic";

export default async function LaporanPage() {
  const now = new Date();
  const weekStart = currentWeekStart();
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 3600 * 1000);

  const [d, thisWeek, lastWeek, allLeads, posts, openDecisions, truth] = await Promise.all([
    getDashboardData(),
    getWeekMetrics(weekStart),
    getWeekMetrics(lastWeekStart),
    db.lead.findMany(),
    db.igPost.findMany({ include: { leads: true } }),
    db.warRoomDecision.findMany({ where: { status: "TERBUKA" } }),
    getTruthPanelData(),
  ]);

  // Corong keseluruhan (semua lead tercatat) — untuk deteksi bocor.
  const funnel = {
    chats: allLeads.length,
    qualified: allLeads.filter(isLeadQualified).length,
    surveys: allLeads.filter((l) =>
      ["SURVEI_TERJADWAL", "SURVEI_SELESAI", "PROPOSAL_TERKIRIM", "NEGOSIASI", "CLOSING_MENANG"].includes(l.status),
    ).length,
    proposals: allLeads.filter((l) => ["PROPOSAL_TERKIRIM", "NEGOSIASI", "CLOSING_MENANG"].includes(l.status)).length,
    closings: allLeads.filter((l) => l.status === "CLOSING_MENANG").length,
  };
  const leak = detectFunnelLeak(funnel);

  const scaleCampaigns = d.allCampaigns.filter((c) => c.verdict.decision === "SCALE_KAMPANYE");
  const killCampaigns = d.allCampaigns.filter((c) => c.verdict.decision === "KILL_KAMPANYE");
  const cheapChat = d.allCampaigns.filter((c) => c.verdict.decision === "GANTI_PENAWARAN");
  const bw = pickBestWorstCampaigns(d.allCampaigns);

  const ghostingCount = allLeads.filter(
    (l) =>
      l.status === "GHOSTING" ||
      triageLead(
        { id: l.id, name: l.name, status: l.status, qualityScore: l.qualityScore, qualAnswersCount: l.qualAnswersCount, estimatedValueJuta: l.estimatedValueJuta, createdAt: l.createdAt, lastContactAt: l.lastContactAt, surveyAt: l.surveyAt, proposalSentAt: l.proposalSentAt },
        now,
      ).ghostingRisk,
  ).length;

  const wf = buildWorkedFailed({
    scaleCampaigns,
    killCampaigns,
    cheapChatCampaigns: cheapChat,
    winners: d.winners.map((w) => ({ hook: w.hook, reasons: "sinyal ≥ p80 + lead terlacak" })),
    qualifiedThisWeek: thisWeek.qualifiedLeads,
    qualifiedLastWeek: lastWeek.qualifiedLeads,
    closingValueJutaThisWeek: thisWeek.closingValueJuta,
    trendDirection: d.igHealth.trend.direction,
    ghostingCount,
    urgentCount: d.followUps.filter((f) => f.triage === "URGENT").length,
  });

  // Kanal → lead berkualitas minggu ini.
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 3600 * 1000);
  const leadsThisWeek = allLeads.filter((l) => l.createdAt >= weekStart && l.createdAt < weekEnd);
  const byChannel = ["ADS", "IG_ORGANIK", "REFERRAL", "LAINNYA"]
    .map((src) => ({
      src,
      total: leadsThisWeek.filter((l) => l.leadSource === src).length,
      qualified: leadsThisWeek.filter((l) => l.leadSource === src && isLeadQualified(l)).length,
    }))
    .filter((r) => r.total > 0);

  // Konten yang layak diulang: pemenang + pilar terkuat.
  const byPillar = compareByDimension(posts.map(mapPostToInput), "pillar")
    .filter((r) => r.n >= 2)
    .sort((a, b) => b.totalQualifiedLeads - a.totalQualifiedLeads || (b.medianSaves ?? 0) - (a.medianSaves ?? 0));
  const topPillar = byPillar[0];

  const ownerActions = buildOwnerActions({
    lockRepair: d.lock.locked
      ? `Bereskan fondasi dulu: ${d.lock.lockVerdict?.explanation ?? ""}`
      : null,
    killCampaigns,
    scaleCampaigns,
    moveBudgetText: d.moveBudget?.explanation ?? null,
    urgentFollowUps: d.followUps,
    winners: d.winners.map((w) => ({ hook: w.hook })),
    leak,
    openDecisions: openDecisions.length,
  });

  const urgent = d.followUps.filter((f) => f.triage === "URGENT");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Laporan Mingguan (Revenue War Room)"
        subtitle={`Minggu mulai ${formatTanggal(weekStart)}. Semua klaim membawa angka; aktivitas tanpa hasil tidak dihitung sebagai kemajuan.`}
      />

      {/* Angka inti */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          <Num label="Pipeline" value={formatJuta(d.primary.pipelineValueJuta)} />
          <Num label="Lead Berkualitas" value={String(thisWeek.qualifiedLeads)} />
          <Num label="Survei" value={String(thisWeek.surveys)} />
          <Num label="Proposal" value={String(thisWeek.proposals)} />
          <Num label="Closing" value={formatJuta(thisWeek.closingValueJuta)} />
        </div>
      </Card>

      <div className="mb-4">
        <DataTruthPanel data={truth} />
      </div>

      <Card title="1 · Apa yang bekerja minggu ini" className="mb-4">
        <ReportList items={wf.worked} tone="pos" />
      </Card>

      <Card title="2 · Apa yang gagal" className="mb-4">
        <ReportList items={wf.failed} tone="neg" />
      </Card>

      <Card title="3 · Kanal mana yang menghasilkan lead berkualitas" className="mb-4">
        {byChannel.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada lead baru tercatat minggu ini — itu sendiri adalah temuan.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {byChannel.map((r) => (
              <li key={r.src} className="flex justify-between">
                <span>{r.src === "ADS" ? "Iklan" : r.src === "IG_ORGANIK" ? "IG organik" : r.src === "REFERRAL" ? "Referral" : "Lainnya"}</span>
                <span>
                  <b>{r.qualified}</b> berkualitas dari {r.total} lead
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card title="4 · Kampanye yang harus dimatikan / diwaspadai">
          {killCampaigns.length === 0 && cheapChat.length === 0 ? (
            <p className="text-sm text-gray-500">{d.lock.locked ? "Vonis dikunci — fondasi dulu." : "Tidak ada kandidat kill saat ini."}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {[...killCampaigns, ...cheapChat].map((c) => (
                <li key={c.id}>
                  <Link href={`/kampanye/${c.id}`} className="font-semibold text-red-700 underline-offset-2 hover:underline">{c.name}</Link>
                  <span className="text-xs text-gray-500"> — {KEPUTUSAN_LABEL[c.verdict.decision]}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="5 · Kampanye yang layak di-scale">
          {scaleCampaigns.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada yang memenuhi syarat scale (CPQL ≤ target, ≥ 3 lead ✓, ada survei).</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {scaleCampaigns.map((c) => (
                <li key={c.id}>
                  <span className="font-semibold text-emerald-700">{c.name}</span>
                  <span className="text-xs text-gray-500"> — CPQL {c.cpqlRibu != null ? formatRibu(c.cpqlRibu) : "—"}, naikkan bertahap +25%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Kampanye terbaik & terburuk" className="mb-4">
        {bw.best || bw.worst ? (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-bold uppercase text-gray-400">Terbaik</div>
              {bw.best ? (
                <p><b>{bw.best.name}</b> ({AD_CHANNEL_LABEL[bw.best.channel as AdChannel]}) — CPQL {bw.best.cpqlRibu != null ? formatRibu(bw.best.cpqlRibu) : "—"}, {bw.best.qualifiedLeads} lead ✓</p>
              ) : <p className="text-gray-500">—</p>}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-gray-400">Terburuk</div>
              {bw.worst ? (
                <p><b>{bw.worst.name}</b> — spend {formatRibu(bw.worst.spendRibu)}, {bw.worst.qualifiedLeads} lead ✓</p>
              ) : <p className="text-gray-500">—</p>}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{bw.note}</p>
        )}
      </Card>

      <Card title="6 · Konten yang layak diulang" className="mb-4">
        {d.winners.length === 0 && !topPillar ? (
          <p className="text-sm text-gray-500">Belum ada pemenang yang terbukti — jangan ulangi apa pun hanya karena terasa bagus.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {d.winners.slice(0, 3).map((w) => (
              <li key={w.postId}>🏆 <b>{w.hook.slice(0, 70)}</b> <span className="text-xs text-gray-500">(keyakinan {w.verdict.confidence.toLowerCase()})</span></li>
            ))}
            {topPillar && (
              <li className="text-xs text-gray-500">
                Pilar terkuat: <b>{PILAR_LABEL[topPillar.key as Pilar] ?? topPillar.key}</b> — {topPillar.totalQualifiedLeads} lead ✓ dari {topPillar.n} post.
              </li>
            )}
          </ul>
        )}
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card title="7 · Lead yang wajib di-follow-up">
          {urgent.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada yang urgen. Jaga begitu.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {urgent.map((f) => (
                <li key={f.id}>
                  <Link href="/leads" className="font-semibold text-red-700 underline-offset-2 hover:underline">{f.name}</Link>
                  <p className="text-xs text-gray-500">{f.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="8 · Di mana corong bocor">
          <p className={`text-sm ${leak.insufficient ? "text-gray-500" : "font-semibold text-red-700"}`}>{leak.explanation}</p>
          <p className="mt-2 text-xs text-gray-400">
            Corong total: {funnel.chats} chat → {funnel.qualified} berkualitas → {funnel.surveys} survei → {funnel.proposals} proposal → {funnel.closings} closing.
          </p>
        </Card>
      </div>

      <Card title="9 · Yang harus Noor kerjakan minggu depan" className="mb-4">
        {ownerActions.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada aksi mendesak dari data — isi data kalau kosong, atau nikmati minggu yang tenang.</p>
        ) : (
          <ol className="list-inside list-decimal space-y-1.5 text-sm">
            {ownerActions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="10 · Top 3 prioritas revenue" className="mb-4 border-2 border-gray-900">
        {top3(d.top5).length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada prioritas terdeteksi dari data.</p>
        ) : (
          <ol className="list-inside list-decimal space-y-1.5 text-sm">
            {top3(d.top5).map((p) => (
              <li key={p.rank}>
                <span className="font-semibold">{p.title}</span>
                {p.decision && <span className="ml-1.5 align-middle"><DecisionChip decision={p.decision as Keputusan} /></span>}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="Keputusan yang menunggu owner">
        {openDecisions.length === 0 && !d.lock.locked ? (
          <p className="text-sm text-gray-500">Tidak ada keputusan menggantung.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {d.lock.locked && <li className="font-semibold text-red-700">Fondasi/tracking belum lolos audit — semua vonis kampanye tertahan.</li>}
            {openDecisions.map((o) => (
              <li key={o.id}>
                <DecisionChip decision={o.decision as Keputusan} /> <span className="text-gray-600">{o.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="mt-4 text-xs text-gray-400">
        Laporan dirakit ulang dari data setiap kali dibuka. Tidak ada angka yang dikarang; bagian kosong berarti datanya belum dicatat.
      </p>
    </div>
  );
}

function Num({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] text-gray-300">minggu ini</div>
    </div>
  );
}

function ReportList({ items, tone }: { items: Array<{ text: string; evidence: string }>; tone: "pos" | "neg" }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((it, i) => (
        <li key={i} className={tone === "pos" ? "text-gray-800" : "text-red-800"}>
          {tone === "pos" ? "✓" : "✗"} {it.text}
          <span className="ml-1 text-xs text-gray-500">({it.evidence})</span>
        </li>
      ))}
    </ul>
  );
}
