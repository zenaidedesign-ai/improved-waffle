"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLead, updateLead } from "@/actions/lead";
import { CONFIG } from "@/lib/domain/config";
import { LEAD_SOURCE, LEAD_STATUS, type LeadSource, type LeadStatus } from "@/lib/domain/enums";
import { computeQualityScore, isQualified } from "@/lib/engine/leadTriage";

const SIGNALS: Array<{ key: string; label: string; hint: string }> = [
  { key: "signalBudget", label: "Sinyal budget", hint: "menyebut angka / rentang = tinggi; 'yang termurah berapa' = rendah" },
  { key: "signalProjectType", label: "Jenis proyek", hint: "rumah/kantor penuh = tinggi; 1 furnitur = rendah" },
  { key: "signalLocation", label: "Lokasi", hint: "Surabaya & sekitar = tinggi; luar jangkauan = rendah" },
  { key: "signalUrgency", label: "Urgensi", hint: "serah terima dekat = tinggi; 'masih rencana' = rendah" },
  { key: "signalSeriousness", label: "Keseriusan", hint: "menjawab pertanyaan kualifikasi = tinggi; satu kata = rendah" },
];

export interface LeadFormInitial {
  id?: string;
  name: string;
  leadSource: LeadSource;
  status: LeadStatus;
  signalBudget: number;
  signalProjectType: number;
  signalLocation: number;
  signalUrgency: number;
  signalSeriousness: number;
  qualAnswersCount: number;
  estimatedValueJuta: number;
  surveyAt: string;
  proposalSentAt: string;
  notes: string;
}

const EMPTY: LeadFormInitial = {
  name: "",
  leadSource: "ADS",
  status: "CHAT_BARU",
  signalBudget: 0,
  signalProjectType: 0,
  signalLocation: 0,
  signalUrgency: 0,
  signalSeriousness: 0,
  qualAnswersCount: 0,
  estimatedValueJuta: 0,
  surveyAt: "",
  proposalSentAt: "",
  notes: "",
};

export function LeadForm({ initial }: { initial?: LeadFormInitial }) {
  const router = useRouter();
  const [v, setV] = useState<LeadFormInitial>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof LeadFormInitial, val: string | number) => setV((s) => ({ ...s, [k]: val }));

  const score = useMemo(() => computeQualityScore(v), [v]);
  const qualified = isQualified(score, v.qualAnswersCount);

  const input = "w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm";
  const label = "mb-0.5 block text-xs font-semibold text-gray-500";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Nama / nomor WA</label>
            <input className={input} value={v.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className={label}>Sumber</label>
            <select className={input} value={v.leadSource} onChange={(e) => set("leadSource", e.target.value)}>
              {LEAD_SOURCE.map((s) => (
                <option key={s} value={s}>{s === "ADS" ? "Iklan" : s === "IG_ORGANIK" ? "IG organik" : s === "REFERRAL" ? "Referral" : "Lainnya"}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={input} value={v.status} onChange={(e) => set("status", e.target.value)}>
              {LEAD_STATUS.map((s) => (
                <option key={s} value={s}>{s.toLowerCase().replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Estimasi nilai proyek (juta Rp)</label>
            <input type="number" min={0} className={input} value={v.estimatedValueJuta} onChange={(e) => set("estimatedValueJuta", Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 rounded-xl border-2 border-gray-900 bg-white p-3 shadow">
        <div className="flex items-baseline justify-between">
          <span>
            <span className="text-2xl font-black">{score}</span>
            <span className="text-sm text-gray-500"> / 100</span>
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${qualified ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
            {qualified ? "LEAD BERKUALITAS" : `belum berkualitas (butuh skor ≥ ${CONFIG.leadQualifiedMinScore} & ≥ ${CONFIG.leadQualifiedMinAnswers} jawaban)`}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs text-gray-500">Lima sinyal kualitas — nilai 0–20 per sinyal, dari isi chat nyata.</p>
        <div className="space-y-3">
          {SIGNALS.map((s) => (
            <div key={s.key}>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-800">{s.label}</label>
                <span className="rounded bg-gray-900 px-2 py-0.5 text-xs font-bold text-white">
                  {v[s.key as keyof LeadFormInitial] as number}
                </span>
              </div>
              <input
                type="range" min={0} max={20} step={1}
                value={v[s.key as keyof LeadFormInitial] as number}
                onChange={(e) => set(s.key as keyof LeadFormInitial, Number(e.target.value))}
                className="w-full"
              />
              <p className="text-[11px] text-gray-400">{s.hint}</p>
            </div>
          ))}
          <div>
            <label className={label}>Berapa pertanyaan kualifikasi yang dijawab?</label>
            <input type="number" min={0} max={20} className={input} value={v.qualAnswersCount} onChange={(e) => set("qualAnswersCount", Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Jadwal survei (kosongkan jika belum)</label>
            <input type="datetime-local" className={input} value={v.surveyAt} onChange={(e) => set("surveyAt", e.target.value)} />
          </div>
          <div>
            <label className={label}>Tanggal proposal dikirim</label>
            <input type="date" className={input} value={v.proposalSentAt} onChange={(e) => set("proposalSentAt", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Catatan</label>
            <textarea rows={2} className={input} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const payload = {
                ...v,
                surveyAt: v.surveyAt ? new Date(v.surveyAt) : "",
                proposalSentAt: v.proposalSentAt ? new Date(v.proposalSentAt) : "",
              };
              if (initial?.id) {
                await updateLead(initial.id, payload);
                router.push("/leads");
              } else {
                await createLead(payload);
              }
            } catch (e) {
              if (e && typeof e === "object" && "digest" in e) throw e;
              setError(e instanceof Error ? e.message : "Gagal menyimpan.");
            }
          });
        }}
        className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Menyimpan…" : initial?.id ? "Simpan perubahan" : "Simpan lead"}
      </button>
    </div>
  );
}
