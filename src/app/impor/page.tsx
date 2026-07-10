import { cancelImportBatch } from "@/actions/importCsv";
import { CsvImport } from "@/components/CsvImport";
import { ScreenshotEntry } from "@/components/ScreenshotEntry";
import { Card, PageHeader, SensitiveDataNotice } from "@/components/ui";
import { db } from "@/lib/db";
import { NORMALIZATION_NOTES } from "@/lib/csv";
import { CONFIG } from "@/lib/domain/config";
import { backupDue, DATA_SOURCE, DATA_SOURCE_LABEL, RELIABILITY } from "@/lib/engine/dataTruth";
import { formatTanggal, formatTanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ImporPage() {
  const [batches, campaigns, lastBackupSetting] = await Promise.all([
    db.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.campaign.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    db.setting.findUnique({ where: { key: "backup.lastExportAt" } }),
  ]);
  const lastBackupAt = lastBackupSetting ? new Date(lastBackupSetting.value) : null;
  const backup = backupDue(lastBackupAt, new Date(), CONFIG.backupMaxAgeDays);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Impor & Ekspor Data"
        subtitle="Jalur data Fase ini: CSV masuk (template sistem atau ekspor Ads Manager), CSV keluar untuk cadangan. Tanpa API live — lihat docs/API-READINESS.md untuk syarat sebelum API apa pun dinyalakan."
      />

      <SensitiveDataNotice />

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

      <Card title="Pusat Cadangan" className="border-2 border-gray-900">
        <div
          className={`mb-3 rounded-lg p-2.5 text-sm ${
            backup.due ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {backup.due
            ? `⚠ ${backup.message}`
            : `✅ Cadangan terakhir ${formatTanggal(lastBackupAt!)} — masih di dalam ambang ${CONFIG.backupMaxAgeDays} hari.`}
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <div className="font-semibold text-gray-700">Langkah 1 — Ekspor CSV per tabel (bisa dibaca di mana saja)</div>
            <div className="mt-1.5 flex flex-wrap gap-2">
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
          </div>

          <div>
            <div className="font-semibold text-gray-700">Langkah 2 — Unduh file database utuh (SEMUA tabel, termasuk learning & audit)</div>
            <a
              href="/api/backup/db"
              className="mt-1.5 inline-block rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-bold text-white hover:bg-gray-700"
            >
              ⬇ Unduh file database (.db)
            </a>
            <p className="mt-1 text-xs text-gray-500">
              Snapshot konsisten (VACUUM INTO) — aman diunduh kapan pun. Basis data aplikasi ini SATU file
              SQLite; file unduhan ini adalah salinan lengkapnya.
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">
            <b>Rutinitas mingguan (tiap Senin, ±2 menit):</b> unduh file .db + 3 CSV, simpan ke folder
            pribadi yang tersinkron cloud (mis. Google Drive akun owner) dengan nama berformat tanggal.
            Simpan minimal 4 cadangan terakhir.
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            <b>Peringatan restore:</b> memulihkan cadangan berarti MENIMPA seluruh data sesudah tanggal
            cadangan itu — data yang diinput setelahnya hilang. Restore = ganti file <code>prisma/dev.db</code>{" "}
            dengan file cadangan SAAT APLIKASI MATI, lalu nyalakan lagi. Kalau ragu, jangan lakukan sendiri.
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-xs text-orange-700">
            <b>Jangan dibagikan:</b> file .db dan CSV berisi identitas lead, nilai proyek, dan strategi —
            jangan kirim lewat grup WA, email umum, atau folder bersama staf. Cadangan hanya untuk owner.
          </div>
        </div>
      </Card>
    </div>
  );
}
