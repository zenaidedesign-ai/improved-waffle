"use client";

import { useState, useTransition } from "react";
import { upsertSnapshot } from "@/actions/igPost";
import { weekStartOf } from "@/lib/engine/warRoom";

export function SnapshotForm() {
  const [open, setOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(() =>
    weekStartOf(new Date()).toISOString().slice(0, 10),
  );
  const [values, setValues] = useState({
    followerCount: "",
    reachTotal: "",
    reachNonFollowerPct: "",
    profileVisits: "",
    recommendationStatus: "BELUM_DICEK",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
      >
        + Tambah snapshot minggu ini
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-gray-500">
          Minggu mulai (Senin)
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm font-normal"
          />
        </label>
        {(
          [
            ["followerCount", "Followers"],
            ["reachTotal", "Reach total"],
            ["reachNonFollowerPct", "% reach non-follower"],
            ["profileVisits", "Kunjungan profil"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-xs font-semibold text-gray-500">
            {label}
            <input
              type="number"
              min={0}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm font-normal"
            />
          </label>
        ))}
        <label className="text-xs font-semibold text-gray-500">
          Status rekomendasi (dari IG → Status Akun)
          <select
            value={values.recommendationStatus}
            onChange={(e) => setValues((v) => ({ ...v, recommendationStatus: e.target.value }))}
            className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm font-normal"
          >
            <option value="LAYAK">Layak direkomendasikan</option>
            <option value="ADA_KONTEN_DITANDAI">Ada konten ditandai</option>
            <option value="PELANGGARAN">Ada pelanggaran</option>
            <option value="BELUM_DICEK">Belum dicek</option>
          </select>
        </label>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await upsertSnapshot({
                  weekStart: weekStartOf(new Date(weekStart)),
                  ...values,
                });
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Gagal menyimpan.");
              }
            });
          }}
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Menyimpan…" : "Simpan snapshot"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
