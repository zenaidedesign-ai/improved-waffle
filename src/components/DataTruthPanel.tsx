// Panel Kebenaran Data — server component, tanpa state.
// Kebijakan: sistem tidak pernah berpura-pura data itu live.

import { Card } from "@/components/ui";
import type { TruthPanelData } from "@/lib/truthPanel";
import {
  DATA_SOURCE_LABEL,
  sourceConfidence,
  TRUTH_PHRASES,
} from "@/lib/engine/dataTruth";
import { formatTanggalJam } from "@/lib/format";

export function DataTruthPanel({ data }: { data: TruthPanelData }) {
  const anyProblem = data.warnings.length > 0 || data.conflicts.length > 0;
  return (
    <Card
      title="Kebenaran Data — sumber, kesegaran, konflik"
      className={anyProblem ? "border-2 border-amber-300" : ""}
    >
      {data.conflicts.length > 0 && (
        <div className="mb-3 space-y-2">
          {data.conflicts.map((c, i) => (
            <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm">
              <p className="font-semibold text-red-800">⚠ {c.message}</p>
              <p className="mt-0.5 text-xs text-red-600">Rekomendasi: {c.recommendation}</p>
            </div>
          ))}
        </div>
      )}

      {data.warnings.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm">
          {data.warnings.map((w, i) => (
            <li key={i} className="text-amber-800">
              ⏳ {w.message}
            </li>
          ))}
        </ul>
      )}

      {data.sourceMix.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {data.sourceMix.map((m) => {
            const conf = sourceConfidence(m.source);
            return (
              <span
                key={m.source}
                title={conf.note}
                className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600"
              >
                {DATA_SOURCE_LABEL[m.source]} · {m.count} baris · andal ±{conf.pct}%
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">{TRUTH_PHRASES.notEnough}</p>
      )}

      {data.hasScreenshotData && (
        <p className="mt-2 text-xs font-semibold text-amber-700">{TRUTH_PHRASES.screenshot}</p>
      )}
      {data.hasCompetitorData && (
        <p className="mt-1 text-xs text-gray-500">{TRUTH_PHRASES.publicOnly}</p>
      )}

      <p className="mt-3 border-t border-gray-100 pt-2 text-[11px] text-gray-400">
        {TRUTH_PHRASES.notLive} Pembaruan terakhir — IG:{" "}
        {data.lastUpdated.instagram ? formatTanggalJam(data.lastUpdated.instagram) : "belum ada"} · Iklan:{" "}
        {data.lastUpdated.ads ? formatTanggalJam(data.lastUpdated.ads) : "belum ada"} · Lead:{" "}
        {data.lastUpdated.leads ? formatTanggalJam(data.lastUpdated.leads) : "belum ada"} · Kompetitor:{" "}
        {data.lastUpdated.competitor ? formatTanggalJam(data.lastUpdated.competitor) : "belum ada"}.
      </p>
    </Card>
  );
}
