import { cancelImportBatch } from "@/actions/importCsv";
import { CsvImport } from "@/components/CsvImport";
import { ScreenshotEntry } from "@/components/ScreenshotEntry";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { NORMALIZATION_NOTES } from "@/lib/csv";
import { DATA_SOURCE, DATA_SOURCE_LABEL, RELIABILITY } from "@/lib/engine/dataTruth";
import { formatTanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ImporPage() {
  const [batches, campaigns] = await Promise.all([
    db.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.campaign.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Impor & Ekspor Data"
        subtitle="Jalur data Fase ini: CSV masuk (template sistem atau ekspor Ads Manager), CSV keluar untuk cadangan. Tanpa API live — lihat docs/API-READINESS.md untuk syarat sebelum API apa pun dinyalakan."
      />

      <Card title="Impor CSV / Google Sheet" className="mb-6">
        <CsvImport />
      </Card>

      <Card title="Input dari screenshot" className="mb-6">
        <ScreenshotEntry campaigns={campaigns} />
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

      <Card title="Keandalan per sumber (Layer D — kebijakan tetap)" className="mb-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
              <th className="py-1.5 pr-2">Sumber</th>
              <th className="py-1.5 pr-2 text-right">Keandalan</th>
              <th className="py-1.5">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {DATA_SOURCE.map((s) => (
              <tr key={s} className="border-b border-gray-100 align-top">
                <td className="py-1.5 pr-2 font-semibold whitespace-nowrap">{DATA_SOURCE_LABEL[s]}</td>
                <td className="py-1.5 pr-2 text-right whitespace-nowrap">{RELIABILITY[s].minPct}–{RELIABILITY[s].maxPct}%</td>
                <td className="py-1.5 text-xs text-gray-500">{RELIABILITY[s].note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Kamus normalisasi lintas platform (Layer C)" className="mb-6">
        <ul className="space-y-2 text-sm">
          {NORMALIZATION_NOTES.map((n) => (
            <li key={n.canonical}>
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{n.canonical}</code>{" "}
              <span className="text-gray-600">← {n.sources}</span>
              <p className="text-xs text-gray-400">{n.note}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Status konektor (Layer B & G)" className="mb-6">
        <ul className="space-y-1.5 text-sm">
          <li>✅ <b>Manual</b> — aktif (semua form).</li>
          <li>✅ <b>CSV</b> — aktif (Meta/Google/TikTok/template sistem; header dinormalkan otomatis).</li>
          <li>✅ <b>Google Sheet</b> — aktif via unduh CSV dari Sheet (File → Download → CSV), asal tercatat GOOGLE_SHEET.</li>
          <li>✅ <b>Screenshot</b> — aktif sebagai transkrip berbantuan; OCR otomatis BELUM diaktifkan.</li>
          <li>✅ <b>Tautan publik kompetitor</b> — aktif via Competitor Lab (observasi manual, tanpa scraping).</li>
          <li>⛔ <b>Laporan email</b> — struktur disiapkan (ImportBatch.origin), konektor belum dibangun.</li>
          <li>⛔ <b>API resmi</b> (IG Graph, Meta Insights, Google Ads, TikTok Business, Google Business) — belum terpasang;
            syarat & rencana rollback di <code>docs/API-READINESS.md</code>. Semua modul diagnosa membaca objek
            ternormalisasi + metadata sumber, jadi API kelak masuk TANPA mengubah logika bisnis (Layer G).</li>
        </ul>
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
