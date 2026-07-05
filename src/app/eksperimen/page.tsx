import Link from "next/link";
import { setExperimentStatus } from "@/actions/experiment";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { PILAR_LABEL, PILAR_PEMULIHAN, type Pilar } from "@/lib/domain/enums";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  RUNNING: "Berjalan (siklus 30 hari)",
  PASSED: "Lolos",
  FAILED: "Gagal",
};

export default async function EksperimenPage() {
  const experiments = await db.experiment.findMany({
    orderBy: { createdAt: "desc" },
    include: { posts: { orderBy: { postedAt: "desc" } } },
  });
  const now = new Date();
  const due = experiments.filter((e) => e.status === "RUNNING" && e.cycleEnd && e.cycleEnd <= now);
  const byStatus = (s: string) => experiments.filter((e) => e.status === s);
  const coveredPillars = new Set(experiments.map((e) => e.pillar));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Eksperimen Konten — Siklus 30 Hari"
        subtitle="Setiap kartu hipotesis WAJIB punya 6 kolom: kenapa, sinyal yang dibidik, reaksi audiens, hasil bisnis, metrik sukses, aturan keputusan. Tanpa 6 kolom, kartu tidak bisa disimpan."
        action={
          <Link href="/eksperimen/baru" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">
            + Kartu hipotesis
          </Link>
        }
      />

      {due.length > 0 && (
        <Card title="⏰ Jatuh tempo evaluasi" className="mb-6 border-2 border-amber-400">
          <ul className="space-y-2 text-sm">
            {due.map((e) => (
              <li key={e.id} className="rounded-lg bg-amber-50 p-2">
                <span className="font-semibold">{e.title}</span>
                <span className="ml-2 text-xs text-gray-500">siklus berakhir {formatTanggal(e.cycleEnd!)}</span>
                <p className="mt-0.5 text-xs text-gray-600">Aturan keputusan yang Anda tulis: {e.decisionRuleAfterTest}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Cakupan 7 pilar pemulihan" className="mb-6">
        <div className="flex flex-wrap gap-1.5">
          {PILAR_PEMULIHAN.map((p) => (
            <span
              key={p}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                coveredPillars.has(p) ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
              }`}
            >
              {coveredPillars.has(p) ? "✓ " : "○ "}
              {PILAR_LABEL[p as Pilar]}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">Pilar tanpa eksperimen = hipotesis yang belum pernah diuji.</p>
      </Card>

      {experiments.length === 0 ? (
        <EmptyState>
          Belum ada kartu hipotesis. Mulai dari pilar yang kosong menurut Diagnosa Instagram — biasanya
          edukasi budget dan founder POV.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(["RUNNING", "DRAFT", "PASSED", "FAILED"] as const).map((status) => (
            <Card key={status} title={STATUS_LABEL[status]}>
              {byStatus(status).length === 0 ? (
                <p className="text-sm text-gray-400">—</p>
              ) : (
                <ul className="space-y-2">
                  {byStatus(status).map((e) => (
                    <li key={e.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold">{e.title}</span>
                          <span className="ml-2 text-[10px] text-gray-400">
                            {PILAR_LABEL[e.pillar as Pilar]} · {e.channel === "IKLAN" ? "iklan" : "organik"}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        <b>Sinyal:</b> {e.signalTargeted} · <b>Metrik sukses:</b> {e.successMetric}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        <b>Aturan setelah uji:</b> {e.decisionRuleAfterTest}
                      </p>
                      {e.resultNotes && <p className="mt-1 text-xs text-gray-600">Hasil: {e.resultNotes}</p>}
                      {e.posts.length > 0 ? (
                        <div className="mt-1.5 rounded bg-white p-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            Post tertaut ({e.posts.length}) — bandingkan dengan metrik sukses di atas
                          </p>
                          <ul className="mt-0.5 space-y-0.5 text-xs text-gray-600">
                            {e.posts.map((p) => (
                              <li key={p.id}>
                                • {p.hook.slice(0, 55)} — reach {p.reach ?? "—"}, saves {p.saves ?? "—"},
                                shares {p.shares ?? "—"}, klik WA {p.waClicks ?? "—"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        e.status === "RUNNING" && (
                          <p className="mt-1 text-[11px] text-amber-600">
                            Belum ada post tertaut — tautkan dari form “Catat post” agar hasil bisa dievaluasi.
                          </p>
                        )
                      )}
                      <div className="mt-2 flex gap-1.5">
                        {status === "DRAFT" && <ActionBtn id={e.id} to="RUNNING" label="▶ Mulai siklus 30 hari" />}
                        {status === "RUNNING" && (
                          <>
                            <ActionBtn id={e.id} to="PASSED" label="✓ Lolos" />
                            <ActionBtn id={e.id} to="FAILED" label="✗ Gagal" />
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ id, to, label }: { id: string; to: "RUNNING" | "PASSED" | "FAILED"; label: string }) {
  const bound = setExperimentStatus.bind(null, id, to, undefined);
  return (
    <form action={bound}>
      <button className="rounded border border-gray-300 px-2 py-0.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100">
        {label}
      </button>
    </form>
  );
}
