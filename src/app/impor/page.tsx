import { cancelImportBatch } from "@/actions/importCsv";
import { CsvImport } from "@/components/CsvImport";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatTanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ImporPage() {
  const batches = await db.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Impor & Ekspor Data"
        subtitle="Jalur data Fase ini: CSV masuk (template sistem atau ekspor Ads Manager), CSV keluar untuk cadangan. Tanpa API live — lihat docs/API-READINESS.md untuk syarat sebelum API apa pun dinyalakan."
      />

      <Card title="Impor CSV" className="mb-6">
        <CsvImport />
      </Card>

      <Card title="Riwayat impor (bisa dibatalkan)" className="mb-6">
        {batches.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada impor.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {batches.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span>
                  <b>{b.type}</b> · {b.fileName ?? "—"} · {b.rowCount} baris ·{" "}
                  <span className="text-xs text-gray-400">{formatTanggalJam(b.createdAt)}</span>
                </span>
                <form action={cancelImportBatch.bind(null, b.id)}>
                  <button className="rounded border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                    Batalkan impor ini
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Ekspor CSV (cadangan / analisis luar)">
        <div className="flex flex-wrap gap-2">
          {[
            ["lead", "Semua lead"],
            ["ig-post", "Semua post IG"],
            ["ads-metric", "Semua metrik iklan"],
          ].map(([slug, label]) => (
            <a
              key={slug}
              href={`/api/export/${slug}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              ⬇ {label}
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
