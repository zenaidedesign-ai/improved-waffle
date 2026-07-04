"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { commitWarRoomSession } from "@/actions/warRoom";
import { KEPUTUSAN, KEPUTUSAN_LABEL, type Keputusan } from "@/lib/domain/enums";

interface DraftDecision {
  decision: Keputusan;
  reason: string;
}

export function WarRoomForm({ maxDecisions, remaining }: { maxDecisions: number; remaining: number }) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<DraftDecision[]>([
    { decision: "ITERATE_KAMPANYE", reason: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (remaining <= 0) {
    return (
      <p className="text-sm text-gray-500">
        Kuota keputusan minggu ini sudah penuh ({maxDecisions}). Fokus eksekusi — keputusan baru
        menunggu minggu depan.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {decisions.map((d, i) => (
        <div key={i} className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-[240px_1fr_auto]">
          <select
            value={d.decision}
            onChange={(e) =>
              setDecisions((ds) => ds.map((x, j) => (j === i ? { ...x, decision: e.target.value as Keputusan } : x)))
            }
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            {KEPUTUSAN.map((k) => (
              <option key={k} value={k}>
                {KEPUTUSAN_LABEL[k]}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Alasan — sebut angka/kampanye/post yang mendasari"
            value={d.reason}
            onChange={(e) =>
              setDecisions((ds) => ds.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)))
            }
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => setDecisions((ds) => ds.filter((_, j) => j !== i))}
            className="text-sm text-gray-400 hover:text-red-600"
            title="Hapus"
          >
            ✕
          </button>
        </div>
      ))}

      {decisions.length < remaining && (
        <button
          type="button"
          onClick={() => setDecisions((ds) => [...ds, { decision: "ITERATE_KAMPANYE", reason: "" }])}
          className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
        >
          + Tambah keputusan ({decisions.length}/{remaining} sisa kuota minggu ini)
        </button>
      )}

      <textarea
        placeholder="Catatan sesi (opsional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
      />

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <button
        disabled={pending}
        onClick={() => {
          setError(null);
          const cleaned = decisions.filter((d) => d.reason.trim());
          if (cleaned.length === 0) {
            setError("Minimal satu keputusan dengan alasan terisi.");
            return;
          }
          if (cleaned.length < decisions.length) {
            setError("Ada keputusan tanpa alasan — isi atau hapus dulu.");
            return;
          }
          startTransition(async () => {
            try {
              await commitWarRoomSession({ notes: notes || undefined, decisions: cleaned });
              router.refresh();
              setDecisions([{ decision: "ITERATE_KAMPANYE", reason: "" }]);
              setNotes("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Gagal menyimpan sesi.");
            }
          });
        }}
        className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Menyimpan…" : "Komit keputusan minggu ini"}
      </button>
      <p className="text-xs text-gray-400">
        Maksimal {maxDecisions} keputusan per minggu — lebih dari itu tidak ada yang benar-benar jalan.
      </p>
    </div>
  );
}
