"use client";

import Papa from "papaparse";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importCsvRows, type ImportResult } from "@/actions/importCsv";
import { CSV_DEF, mapHeader, type CsvType } from "@/lib/csv";
import { AD_CHANNEL, AD_CHANNEL_LABEL, type AdChannel } from "@/lib/domain/enums";

export function CsvImport() {
  const router = useRouter();
  const [type, setType] = useState<CsvType>("IG_POST");
  const [origin, setOrigin] = useState<"CSV" | "GOOGLE_SHEET">("CSV");
  const [forceDup, setForceDup] = useState(false);
  const [adChannel, setAdChannel] = useState<AdChannel | "">(""); // WAJIB dipilih untuk CSV iklan
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rawHeaders = res.meta.fields ?? [];
        const mapping = new Map<string, string>();
        const un: string[] = [];
        for (const h of rawHeaders) {
          const canon = mapHeader(h, type);
          if (canon) mapping.set(h, canon);
          else un.push(h);
        }
        setUnmapped(un);
        setRows(
          res.data.map((row) => {
            const out: Record<string, string> = {};
            for (const [raw, canon] of mapping) out[canon] = row[raw] ?? "";
            return out;
          }),
        );
      },
      error: (e) => setError(`Gagal membaca file: ${e.message}`),
    });
  }

  const def = CSV_DEF[type];
  const requiredFirst = def.headers[0];
  const validCount = rows.filter((r) => (r[requiredFirst] ?? "").trim() !== "").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CSV_DEF) as CsvType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setRows([]); setFileName(null); setResult(null); }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${type === t ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            {CSV_DEF[t].label}
          </button>
        ))}
        <a
          href={`/api/template/${type.toLowerCase().replaceAll("_", "-")}`}
          className="ml-auto rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          ⬇ Unduh template {def.label}
        </a>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-gray-500">Asal file:</span>
        {(["CSV", "GOOGLE_SHEET"] as const).map((o) => (
          <button key={o} onClick={() => setOrigin(o)}
            className={`rounded-lg border px-2.5 py-1 font-semibold ${origin === o ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-600"}`}>
            {o === "CSV" ? "Ekspor resmi platform (andal 90–95%)" : "Google Sheet (andal 80–95%)"}
          </button>
        ))}
      </div>

      <label className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 hover:bg-gray-50">
        {fileName ? `File: ${fileName}` : "Klik untuk pilih file CSV (atau ekspor dari Ads Manager / template sistem)"}
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </label>

      {type === "ADS_METRIC" && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-gray-500">Platform iklan file ini (wajib — tidak ditebak):</span>
          <select
            value={adChannel}
            onChange={(e) => setAdChannel(e.target.value as AdChannel | "")}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
          >
            <option value="" disabled>— pilih platform —</option>
            {AD_CHANNEL.map((c) => (
              <option key={c} value={c}>{AD_CHANNEL_LABEL[c]}</option>
            ))}
          </select>
          <span className="text-gray-400">Kampanye BARU dari file ini akan tercatat di platform tersebut.</span>
        </div>
      )}

      {type === "LEAD" && (
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={forceDup} onChange={(e) => setForceDup(e.target.checked)} />
          Paksa impor baris yang terdeteksi duplikat (nama + sumber + minggu sama) — pakai hanya jika
          Anda yakin itu lead yang berbeda.
        </label>
      )}

      {unmapped.length > 0 && (
        <p className="text-xs text-amber-700">
          Kolom tidak dikenali & diabaikan: {unmapped.join(", ")}
        </p>
      )}

      {rows.length > 0 && !result && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm">
            <b>{validCount}</b> baris siap diimpor dari {rows.length} baris terbaca.
            Duplikat akan <b>dilewati dan dilaporkan</b> — tidak pernah menimpa diam-diam.
          </p>
          <div className="max-h-64 overflow-auto rounded-lg border border-gray-100">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-400">
                  {def.headers.slice(0, 8).map((h) => (
                    <th key={h} className="px-2 py-1.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 30).map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    {def.headers.slice(0, 8).map((h) => (
                      <td key={h} className="max-w-40 truncate px-2 py-1">{r[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
          <button
            disabled={pending || validCount === 0 || (type === "ADS_METRIC" && adChannel === "")}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  const res = await importCsvRows(
                    type,
                    rows.filter((r) => (r[requiredFirst] ?? "").trim() !== ""),
                    fileName ?? "tanpa-nama.csv",
                    origin,
                    type === "LEAD" ? forceDup : false,
                    type === "ADS_METRIC" ? adChannel : undefined,
                  );
                  setResult(res);
                  setRows([]);
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Gagal mengimpor — tidak ada baris yang masuk.");
                }
              });
            }}
            className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {pending
              ? "Mengimpor…"
              : type === "ADS_METRIC" && adChannel === ""
                ? "Pilih platform iklan dulu"
                : `Konfirmasi impor ${validCount} baris`}
          </button>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-800">
            ✓ {result.inserted} baris diimpor.
          </p>
          {result.skippedDuplicates.length > 0 && (
            <p className="mt-1 text-xs text-gray-600">
              {result.skippedDuplicates.length} duplikat dilewati: {result.skippedDuplicates.slice(0, 5).join("; ")}
              {result.skippedDuplicates.length > 5 && " …"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
