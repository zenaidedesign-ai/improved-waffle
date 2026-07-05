import Link from "next/link";
import { deleteExampleData, loadExampleData } from "@/actions/seed";
import { Card, DecisionChip, GateLockBanner, PageHeader, StatusChip, VerdictCard } from "@/components/ui";
import { getDashboardData } from "@/lib/dashboard";
import {
  AD_CHANNEL_LABEL,
  IG_FORMAT_LABEL,
  type AdChannel,
  type IgFormat,
} from "@/lib/domain/enums";
import { KESEHATAN_LABEL } from "@/lib/engine/adsRescue";
import { TRIAGE_LABEL } from "@/lib/engine/leadTriage";
import { formatAngka, formatJuta, formatRibu } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = await getDashboardData();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard Intelijen Pemasaran"
        subtitle="Delapan pertanyaan eksekutif, dijawab dari data nyata. Metrik utama di atas — reach, followers, dan impresi sengaja di paling bawah."
      />

      {/* ── Metrik UTAMA (bulan berjalan) ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        <Tile label="Lead Berkualitas" value={String(d.primary.qualifiedLeads)} />
        <Tile label="Survei" value={String(d.primary.surveys)} />
        <Tile label="Proposal" value={String(d.primary.proposals)} />
        <Tile label="Nilai Closing" value={formatJuta(d.primary.closingValueJuta)} />
        <Tile label="Nilai Pipeline" value={formatJuta(d.primary.pipelineValueJuta)} accent />
        <Tile label="CPQL Iklan" value={d.primary.cpqlRibu != null ? formatRibu(d.primary.cpqlRibu) : "—"} />
      </div>

      {d.lock.locked && d.lock.lockVerdict && (
        <div className="mb-6">
          <GateLockBanner verdict={d.lock.lockVerdict} />
        </div>
      )}

      {!d.hasAnyData && (
        <Card className="mb-6">
          <p className="mb-3 text-sm text-gray-600">
            Belum ada data. Muat data contoh (berlabel <code>[CONTOH]</code>) untuk melihat seluruh
            dashboard bekerja — atau mulai isi data asli dari menu kiri.
          </p>
          <div className="flex gap-2">
            <form action={loadExampleData}>
              <button className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700">
                Muat data contoh
              </button>
            </form>
          </div>
        </Card>
      )}

      {/* ── Q8: Top 5 prioritas hari ini (paling atas — ini yang dikerjakan) ── */}
      <Card title="Top 5 Prioritas Hari Ini" className="mb-6 border-2 border-gray-900">
        {d.top5.length === 0 ? (
          <p className="text-sm text-gray-500">
            Tidak ada prioritas mendesak yang terdeteksi dari data. Sistem tidak mengarang prioritas —
            kalau data belum diisi, isi dulu.
          </p>
        ) : (
          <ol className="space-y-2">
            {d.top5.map((p) => (
              <li key={p.rank} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-black text-white">
                  {p.rank}
                </span>
                <div className="min-w-0">
                  <Link href={p.href} className="font-semibold text-gray-900 underline-offset-2 hover:underline">
                    {p.title}
                  </Link>
                  {p.decision && (
                    <span className="ml-2 align-middle">
                      <DecisionChip decision={p.decision} />
                    </span>
                  )}
                  <p className="mt-0.5 text-xs text-gray-500">{p.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* ── Q1 & Q2: kesehatan ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="Q1 · Apakah Instagram sehat?">
          <div className="flex items-center gap-2">
            <StatusChip status={d.igHealth.status} />
            {d.igHealth.lastNonFollowerPct != null && (
              <span className="text-xs text-gray-500">
                reach non-follower terakhir: {d.igHealth.lastNonFollowerPct}%
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-700">{d.igHealth.summary}</p>
          <Link href="/instagram" className="mt-2 inline-block text-xs text-gray-500 underline">
            Buka Diagnosa Instagram →
          </Link>
        </Card>
        <Card title="Q2 · Apakah iklan sehat?">
          <StatusChip status={d.adsHealth.status} />
          <p className="mt-2 text-sm text-gray-700">{d.adsHealth.summary}</p>
          <Link href="/kampanye" className="mt-2 inline-block text-xs text-gray-500 underline">
            Buka Ads Intelligence →
          </Link>
        </Card>
      </div>

      {/* ── Q3 & Q7 ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="Q3 · Pipeline hari ini">
          {d.pipelineByStatus.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada lead aktif di pipeline.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {d.pipelineByStatus.map((r) => (
                <li key={r.status} className="flex items-center justify-between">
                  <span className="text-gray-600">
                    {r.status.toLowerCase().replaceAll("_", " ")} <span className="text-gray-400">×{r.count}</span>
                  </span>
                  <span className="font-semibold">{formatJuta(r.valueJuta)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-gray-200 pt-1.5 font-bold">
                <span>Total pipeline</span>
                <span>{formatJuta(d.primary.pipelineValueJuta)}</span>
              </li>
            </ul>
          )}
        </Card>
        <Card title="Q7 · Lead yang butuh follow-up HARI INI">
          {d.followUps.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada lead yang menunggu follow-up. Bagus — jaga begitu.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.followUps.slice(0, 6).map((f) => (
                <li key={f.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link href="/leads" className="font-semibold underline-offset-2 hover:underline">
                      {f.name}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        f.triage === "URGENT" ? "bg-red-100 text-red-700" : f.triage === "HOT_LEAD" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {TRIAGE_LABEL[f.triage]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {f.reason} {f.ghostingRisk && <b className="text-red-600">· risiko ghosting</b>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Q4: kampanye buang uang ── */}
      <Card title="Q4 · Kampanye mana yang membuang uang?" className="mb-6">
        {d.lock.locked ? (
          <p className="text-sm text-gray-500">Vonis kampanye dikunci sampai fondasi & tracking lolos audit.</p>
        ) : d.wastingCampaigns.length === 0 && !d.moveBudget ? (
          <p className="text-sm text-gray-500">
            {d.allCampaigns.filter((c) => c.status === "AKTIF").length === 0
              ? "Belum ada kampanye aktif tercatat."
              : "Tidak ada kampanye yang terdeteksi membuang uang saat ini."}
          </p>
        ) : (
          <div className="space-y-3">
            {d.wastingCampaigns.map((c) => (
              <div key={c.id} className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <Link href={`/kampanye/${c.id}`} className="font-bold underline-offset-2 hover:underline">
                    {c.name}
                  </Link>
                  <span className="text-xs text-gray-500">
                    {AD_CHANNEL_LABEL[c.channel as AdChannel] ?? c.channel} · spend {formatRibu(c.spendRibu)} ·{" "}
                    {c.qualifiedLeads} lead ✓ · {KESEHATAN_LABEL[c.health]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">{c.verdict.explanation}</p>
              </div>
            ))}
            {d.moveBudget && <VerdictCard verdict={d.moveBudget} />}
          </div>
        )}
      </Card>

      {/* ── Q5 & Q6 ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="Q5 · Konten organik yang layak jadi iklan">
          {d.lock.locked ? (
            <p className="text-sm text-gray-500">Dikunci sampai gerbang terbuka.</p>
          ) : d.winnersInsufficient ? (
            <p className="text-sm text-gray-500">Data belum cukup — catat minimal 8 post dulu.</p>
          ) : d.winners.length === 0 ? (
            <p className="text-sm text-gray-500">
              Belum ada post yang lolos kriteria (sinyal ≥ p80 DAN ≥ 1 lead terlacak).
            </p>
          ) : (
            <ul className="space-y-2">
              {d.winners.slice(0, 3).map((w) => (
                <li key={w.postId} className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm">
                  <div className="font-semibold">🏆 {w.hook}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <DecisionChip decision={w.verdict.decision} />
                    <span className="text-[10px] text-gray-500">keyakinan {w.verdict.confidence.toLowerCase()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Q6 · Format konten terbaik saat ini">
          {d.bestFormat.insufficient || !d.bestFormat.best ? (
            <p className="text-sm text-gray-500">
              Data belum cukup — butuh ≥ 3 post per format sebelum ada jawaban jujur.
            </p>
          ) : (
            <div>
              <div className="text-2xl font-black">
                {IG_FORMAT_LABEL[d.bestFormat.best.format as IgFormat] ?? d.bestFormat.best.format}
              </div>
              <p className="mt-1 text-sm text-gray-600">{d.bestFormat.best.reason}</p>
              <p className="mt-1 text-xs text-gray-400">
                Berdasarkan median sinyal niat & bisnis, bukan reach. Format terbaik ≠ satu-satunya format.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Metrik sekunder — sengaja terakhir ── */}
      <Card title="Metrik sekunder — bahan diagnosa, bukan keberhasilan" className="mb-6">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Reach (30 hari)</div>
            <div className="font-semibold text-gray-600">{formatAngka(d.secondary.reach30d)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Followers</div>
            <div className="font-semibold text-gray-600">{formatAngka(d.secondary.followers)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Impresi iklan (30 hari)</div>
            <div className="font-semibold text-gray-600">{formatAngka(d.secondary.impressions30d)}</div>
          </div>
        </div>
      </Card>

      {d.hasAnyData && (
        <div className="flex gap-2">
          <form action={loadExampleData}>
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100">
              Muat ulang data contoh
            </button>
          </form>
          <form action={deleteExampleData}>
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100">
              Hapus data contoh
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${accent ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white"}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wide ${accent ? "text-gray-300" : "text-gray-400"}`}>
        {label}
      </div>
      <div className="text-xl font-black">{value}</div>
      <div className={`text-[10px] ${accent ? "text-gray-400" : "text-gray-300"}`}>bulan ini</div>
    </div>
  );
}
