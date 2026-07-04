"use client";

import { useState, useTransition } from "react";
import { submitAuditRun } from "@/actions/audit";
import type { AuditItemDef } from "@/lib/domain/auditItems";
import type { AuditType, StatusAuditItem } from "@/lib/domain/enums";

interface ItemState {
  status: StatusAuditItem;
  answerText: string;
  note: string;
}

const STATUS_BUTTONS: Array<{ value: StatusAuditItem; label: string; active: string }> = [
  { value: "HIJAU", label: "Hijau — aman", active: "bg-emerald-600 text-white border-emerald-600" },
  { value: "KUNING", label: "Kuning — perlu perhatian", active: "bg-amber-500 text-white border-amber-500" },
  { value: "MERAH", label: "Merah — bermasalah", active: "bg-red-600 text-white border-red-600" },
  { value: "BELUM_DICEK", label: "Belum dicek", active: "bg-gray-500 text-white border-gray-500" },
];

export function AuditWizard({ type, items }: { type: AuditType; items: AuditItemDef[] }) {
  const [state, setState] = useState<Record<string, ItemState>>(
    Object.fromEntries(items.map((i) => [i.key, { status: "BELUM_DICEK", answerText: "", note: "" }])),
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const answered = Object.values(state).filter((s) => s.status !== "BELUM_DICEK").length;
  const unansweredBlocking = items.filter(
    (i) => i.isBlocking && state[i.key].status === "BELUM_DICEK",
  );

  function update(key: string, patch: Partial<ItemState>) {
    setState((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await submitAuditRun({
          type,
          notes: notes || undefined,
          answers: items.map((i) => ({
            itemKey: i.key,
            status: state[i.key].status,
            answerText: state[i.key].answerText || undefined,
            note: state[i.key].note || undefined,
          })),
        });
      } catch (e) {
        // redirect() melempar — biarkan lolos; error lain ditampilkan
        if (e && typeof e === "object" && "digest" in e) throw e;
        setError(e instanceof Error ? e.message : "Gagal menyimpan audit.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 rounded-lg border border-gray-200 bg-white/95 px-4 py-2 text-sm shadow-sm backdrop-blur">
        <span className="font-semibold">{answered}</span> / {items.length} item dijawab
        {unansweredBlocking.length > 0 && (
          <span className="ml-2 text-xs text-red-600">
            ({unansweredBlocking.length} item MEMBLOKIR belum dicek — belum dicek dihitung sebagai masalah)
          </span>
        )}
      </div>

      {items.map((item, idx) => (
        <div key={item.key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-1 text-xs font-bold text-gray-400">
            Item {idx + 1} dari {items.length} · {item.key}
            {item.isBlocking && (
              <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                MEMBLOKIR
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900">{item.question}</h3>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-semibold text-gray-700">Kenapa penting:</span> {item.whyItMatters}
          </p>
          <p className="mt-1 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-700">Cara mengecek:</span> {item.howToCheck}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUS_BUTTONS.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => update(item.key, { status: b.value })}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  state[item.key].status === b.value
                    ? b.active
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Apa yang Anda lihat? (opsional tapi sangat membantu)"
            value={state[item.key].answerText}
            onChange={(e) => update(item.key, { answerText: e.target.value })}
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
      ))}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-1 block text-sm font-semibold text-gray-700">Catatan umum (opsional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Menyimpan…" : "Simpan audit & hitung vonis gerbang"}
      </button>
    </div>
  );
}
