"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFitScore } from "@/actions/fitScore";
import { DEFAULT_FIT_WEIGHTS, type FitWeights } from "@/lib/domain/config";
import { FIT_DIMENSIONS } from "@/lib/domain/fitAnchors";
import { computeComposite, confidenceLabel } from "@/lib/engine/fitScore";

export interface PostOption {
  id: string;
  label: string;
}

export function FitScoreForm({ posts }: { posts: PostOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"POST" | "IDE">(posts.length > 0 ? "POST" : "IDE");
  const [igPostId, setIgPostId] = useState(posts[0]?.id ?? "");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ratings, setRatings] = useState<Record<keyof FitWeights, number>>(
    Object.fromEntries(FIT_DIMENSIONS.map((d) => [d.key, 3])) as Record<keyof FitWeights, number>,
  );
  const [confidence, setConfidence] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const result = useMemo(() => computeComposite(ratings, DEFAULT_FIT_WEIGHTS), [ratings]);
  const confLabel = confidenceLabel(confidence);

  function submit() {
    setError(null);
    if (mode === "IDE" && !ideaTitle.trim()) {
      setError("Judul ide wajib diisi.");
      return;
    }
    if (mode === "POST" && !igPostId) {
      setError("Pilih post yang mau diskor.");
      return;
    }
    startTransition(async () => {
      try {
        await saveFitScore({
          igPostId: mode === "POST" ? igPostId : undefined,
          ideaTitle: mode === "IDE" ? ideaTitle.trim() : undefined,
          confidence,
          ratings,
        });
        router.push("/skor");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("POST")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${mode === "POST" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-600"}`}
          >
            Post yang sudah tayang
          </button>
          <button
            type="button"
            onClick={() => setMode("IDE")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${mode === "IDE" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-600"}`}
          >
            Ide konten baru
          </button>
        </div>
        {mode === "POST" ? (
          posts.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada post tercatat — pakai mode ide, atau catat post dulu.</p>
          ) : (
            <select
              value={igPostId}
              onChange={(e) => setIgPostId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          )
        ) : (
          <input
            type="text"
            value={ideaTitle}
            onChange={(e) => setIdeaTitle(e.target.value)}
            placeholder='Judul ide — contoh: "Reels: 3 kesalahan budget interior 2BR"'
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
        )}
      </div>

      <div className="sticky top-0 z-10 rounded-xl border-2 border-gray-900 bg-white p-4 shadow">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-black">{result.composite}</span>
            <span className="text-sm text-gray-500"> / 100</span>
          </div>
          <span className="text-xs text-gray-500">
            keyakinan penilaian: <b>{confLabel.toLowerCase()}</b>
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Ini hipotesis sinyal yang bisa diuji lewat prediksi-vs-aktual — bukan kepastian algoritma.
        </p>
      </div>

      {FIT_DIMENSIONS.map((d) => (
        <div key={d.key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-800">{d.label}</label>
            <span className="rounded bg-gray-900 px-2 py-0.5 text-sm font-bold text-white">
              {ratings[d.key]}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={ratings[d.key]}
            onChange={(e) => setRatings((r) => ({ ...r, [d.key]: Number(e.target.value) }))}
            className="mt-2 w-full"
          />
          <div className="mt-1 flex justify-between text-[11px] text-gray-400">
            <span className="max-w-[45%]">0 — {d.anchor0}</span>
            <span className="max-w-[45%] text-right">5 — {d.anchor5}</span>
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-800">
            Seberapa yakin Anda dengan penilaian di atas?
          </label>
          <span className="text-sm font-bold">{confidence}/5</span>
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
          className="mt-2 w-full"
        />
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Menyimpan…" : "Simpan skor"}
      </button>
    </div>
  );
}
