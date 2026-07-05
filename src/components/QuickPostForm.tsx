"use client";

// Form 60 detik: urutan field mengikuti tampilan IG Insights,
// blok angka bisa dinavigasi Tab, format & pilar tombol (bukan dropdown),
// "simpan & input lagi" sebagai aksi default.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createIgPost } from "@/actions/igPost";
import {
  IG_FORMAT,
  IG_FORMAT_LABEL,
  PILAR,
  PILAR_LABEL,
  type IgFormat,
  type Pilar,
} from "@/lib/domain/enums";

const NUMERIC_FIELDS: Array<{ key: string; label: string }> = [
  { key: "reach", label: "Reach" },
  { key: "reachNonFollower", label: "Reach non-follower" },
  { key: "plays", label: "Plays (Reels)" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Komentar" },
  { key: "saves", label: "Saves" },
  { key: "shares", label: "Shares" },
  { key: "profileVisits", label: "Kunjungan profil" },
  { key: "follows", label: "Follows" },
  { key: "dmClicks", label: "Klik DM" },
  { key: "waClicks", label: "Klik WA" },
  { key: "leadsManual", label: "Lead (manual)" },
  { key: "qualifiedLeadsManual", label: "Lead berkualitas (manual)" },
];

const emptyNumbers = Object.fromEntries(NUMERIC_FIELDS.map((f) => [f.key, ""]));

export interface ExperimentOption {
  id: string;
  title: string;
}

export function QuickPostForm({ experiments = [] }: { experiments?: ExperimentOption[] }) {
  const router = useRouter();
  const [postedAt, setPostedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState<IgFormat>("REELS");
  const [pillar, setPillar] = useState<Pilar>("PORTFOLIO_LAIN");
  const [hook, setHook] = useState("");
  const [cta, setCta] = useState("");
  const [experimentId, setExperimentId] = useState("");
  const [numbers, setNumbers] = useState<Record<string, string>>(emptyNumbers);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(andNew: boolean) {
    setError(null);
    setMessage(null);
    if (!hook.trim()) {
      setError("Hook wajib diisi — ini kunci analisis konten.");
      return;
    }
    startTransition(async () => {
      try {
        await createIgPost({
          postedAt: new Date(postedAt),
          format,
          pillar,
          hook: hook.trim(),
          cta: cta || undefined,
          experimentId: experimentId || undefined,
          ...(numbers as Record<string, string>),
        });
        if (andNew) {
          setHook("");
          setCta("");
          setNumbers(emptyNumbers);
          setMessage("Tersimpan. Lanjut post berikutnya — tanggal, format, dan pilar dipertahankan.");
        } else {
          router.push("/instagram");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan.");
      }
    });
  }

  const btn = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-xs font-semibold ${
      active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
    }`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Tanggal tayang</label>
            <input
              type="date"
              value={postedAt}
              onChange={(e) => setPostedAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Format</label>
            <div className="flex flex-wrap gap-1.5">
              {IG_FORMAT.map((f) => (
                <button key={f} type="button" onClick={() => setFormat(f)} className={btn(format === f)}>
                  {IG_FORMAT_LABEL[f]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-gray-500">Pilar konten</label>
          <div className="flex flex-wrap gap-1.5">
            {PILAR.map((p) => (
              <button key={p} type="button" onClick={() => setPillar(p)} className={btn(pillar === p)}>
                {PILAR_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            Hook (kalimat/visual pembuka) — wajib
          </label>
          <input
            type="text"
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            placeholder='contoh: "Renovasi molor 6 bulan? Ini 3 penyebabnya"'
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        {experiments.length > 0 && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Tautkan ke eksperimen (opsional) — supaya hasilnya bisa dievaluasi terhadap kartunya
            </label>
            <select
              value={experimentId}
              onChange={(e) => setExperimentId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="">— tanpa eksperimen —</option>
              {experiments.map((x) => (
                <option key={x.id} value={x.id}>{x.title}</option>
              ))}
            </select>
          </div>
        )}
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-gray-500">CTA (opsional)</label>
          <input
            type="text"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder='contoh: "DM SURVEI" / "klik link WA di bio"'
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs text-gray-500">
          Angka dari IG Insights — kosongkan yang tidak ada; diagnosa akan bilang “data belum cukup”
          alih-alih menebak. Tab untuk pindah cepat.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {NUMERIC_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-0.5 block text-[11px] font-semibold text-gray-500">{f.label}</label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={numbers[f.key]}
                onChange={(e) => setNumbers((n) => ({ ...n, [f.key]: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => save(true)}
          disabled={pending}
          className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Menyimpan…" : "Simpan & input post berikutnya"}
        </button>
        <button
          onClick={() => save(false)}
          disabled={pending}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          Simpan & selesai
        </button>
      </div>
    </div>
  );
}
