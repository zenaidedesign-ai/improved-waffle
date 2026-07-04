import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { db } from "@/lib/db";
import { AUDIT_INTRO, SLUG_TO_TYPE, TYPE_TO_SLUG } from "@/lib/auditSlug";
import { AUDIT_ITEMS } from "@/lib/domain/auditItems";
import { AUDIT_TYPE_LABEL, type StatusAuditItem } from "@/lib/domain/enums";
import { formatTanggal } from "@/lib/format";
import { buildRepairPlan } from "@/lib/engine/gates";
import type { AuditAnswerInput } from "@/lib/engine/types";

export const dynamic = "force-dynamic";

export default async function AuditPage({ params }: { params: Promise<{ type: string }> }) {
  const { type: slug } = await params;
  const type = SLUG_TO_TYPE[slug];
  if (!type) notFound();

  const items = AUDIT_ITEMS[type];
  const runs = await db.auditRun.findMany({
    where: { type },
    orderBy: { runDate: "desc" },
    take: 10,
    include: { answers: true },
  });
  const latest = runs[0];
  const repairPlan = latest
    ? buildRepairPlan(
        latest.answers.map((a) => ({
          itemKey: a.itemKey,
          status: a.status as AuditAnswerInput["status"],
          isBlocking: a.isBlocking,
        })),
        items,
      )
    : [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={AUDIT_TYPE_LABEL[type]}
        subtitle={AUDIT_INTRO[type]}
        action={
          <Link
            href={`/audit/${TYPE_TO_SLUG[type]}/jalankan`}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
          >
            {latest ? "Jalankan audit ulang" : "Mulai audit"}
          </Link>
        }
      />

      {!latest ? (
        <EmptyState>
          Belum pernah diaudit. Selama belum diaudit, gerbang dianggap MERAH — bukan karena ada
          masalah, tapi karena <em>tidak tahu ≠ aman</em>.
        </EmptyState>
      ) : (
        <>
          <Card className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-sm text-gray-500">Audit terakhir: {formatTanggal(latest.runDate)}</span>
                {latest.isExample && <span className="ml-2 text-xs text-amber-600">[CONTOH]</span>}
              </div>
              <StatusChip status={latest.verdict as StatusAuditItem} />
            </div>
            {latest.notes && <p className="mt-2 text-sm text-gray-600">{latest.notes}</p>}
          </Card>

          <Card title="Hasil per item" className="mb-4">
            <ul className="divide-y divide-gray-100">
              {items.map((def) => {
                const ans = latest.answers.find((a) => a.itemKey === def.key);
                return (
                  <li key={def.key} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800">
                        <span className="mr-1.5 text-xs font-bold text-gray-400">{def.key}</span>
                        {def.question}
                        {def.isBlocking && (
                          <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                            MEMBLOKIR
                          </span>
                        )}
                      </div>
                      {ans?.answerText && (
                        <p className="mt-0.5 text-xs text-gray-500">Catatan: {ans.answerText}</p>
                      )}
                    </div>
                    <StatusChip status={(ans?.status as StatusAuditItem) ?? "BELUM_DICEK"} />
                  </li>
                );
              })}
            </ul>
          </Card>

          {repairPlan.length > 0 && (
            <Card title="Rencana perbaikan berurutan" className="mb-4">
              <ol className="space-y-2">
                {repairPlan.map((step) => (
                  <li key={step.itemKey} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                    <div className="font-semibold text-gray-800">
                      {step.priority}. [{step.itemKey}] {step.question}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{step.howToCheck}</p>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {runs.length > 1 && (
            <Card title="Riwayat audit">
              <ul className="space-y-1 text-sm">
                {runs.slice(1).map((r) => (
                  <li key={r.id} className="flex items-center justify-between">
                    <span className="text-gray-600">{formatTanggal(r.runDate)}</span>
                    <StatusChip status={r.verdict as StatusAuditItem} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
