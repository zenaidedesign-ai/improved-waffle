"use client";

import { useState, useTransition } from "react";
import {
  addCampaignMetric,
  createCampaign,
  updateCampaignFunnel,
} from "@/actions/campaign";
import {
  CAMPAIGN_OBJECTIVE,
  CAMPAIGN_OBJECTIVE_LABEL,
  CAMPAIGN_STATUS,
} from "@/lib/domain/enums";

const input = "w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm";
const label = "mb-0.5 block text-xs font-semibold text-gray-500";
const primaryBtn =
  "rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50";

export function CampaignCreateForm() {
  const [values, setValues] = useState({
    name: "",
    objective: "CHAT_WA",
    targetCpqlRibu: "",
    manualChats: "0",
    manualQualifiedLeads: "0",
    manualSurveys: "0",
    manualPipelineJuta: "0",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Nama kampanye (sama persis dengan di Ads Manager)</label>
            <input className={input} value={values.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className={label}>Tujuan</label>
            <select className={input} value={values.objective} onChange={(e) => set("objective", e.target.value)}>
              {CAMPAIGN_OBJECTIVE.map((o) => (
                <option key={o} value={o}>
                  {CAMPAIGN_OBJECTIVE_LABEL[o]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Target CPQL (ribu Rp) — kosong = default Rp 300 rb</label>
            <input
              type="number"
              min={0}
              className={input}
              value={values.targetCpqlRibu}
              onChange={(e) => set("targetCpqlRibu", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs text-gray-500">
          Corong manual (Fase 1): hitung dari log WhatsApp Anda. Angka “hasil” Ads Manager TIDAK
          dipakai untuk vonis — hanya ditampilkan sebagai pembanding kejujuran.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["manualChats", "Chat masuk"],
              ["manualQualifiedLeads", "Lead berkualitas"],
              ["manualSurveys", "Survei"],
              ["manualPipelineJuta", "Nilai pipeline (jt)"],
            ] as const
          ).map(([k, l]) => (
            <div key={k}>
              <label className={label}>{l}</label>
              <input type="number" min={0} className={input} value={values[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        disabled={pending}
        className={primaryBtn + " w-full"}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await createCampaign(values);
            } catch (e) {
              if (e && typeof e === "object" && "digest" in e) throw e; // redirect()
              setError(e instanceof Error ? e.message : "Gagal menyimpan.");
            }
          });
        }}
      >
        {pending ? "Menyimpan…" : "Simpan kampanye"}
      </button>
    </div>
  );
}

export function FunnelUpdateForm({
  campaignId,
  initial,
}: {
  campaignId: string;
  initial: {
    manualChats: number;
    manualQualifiedLeads: number;
    manualSurveys: number;
    manualPipelineJuta: number;
    status: string;
    notes: string;
  };
}) {
  const [values, setValues] = useState({
    manualChats: String(initial.manualChats),
    manualQualifiedLeads: String(initial.manualQualifiedLeads),
    manualSurveys: String(initial.manualSurveys),
    manualPipelineJuta: String(initial.manualPipelineJuta),
    status: initial.status,
    notes: initial.notes,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = (k: string, v: string) => {
    setSaved(false);
    setValues((s) => ({ ...s, [k]: v }));
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            ["manualChats", "Chat masuk"],
            ["manualQualifiedLeads", "Lead berkualitas"],
            ["manualSurveys", "Survei"],
            ["manualPipelineJuta", "Pipeline (jt)"],
          ] as const
        ).map(([k, l]) => (
          <div key={k}>
            <label className={label}>{l}</label>
            <input type="number" min={0} className={input} value={values[k]} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
        <div>
          <label className={label}>Status</label>
          <select className={input} value={values.status} onChange={(e) => set("status", e.target.value)}>
            {CAMPAIGN_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          disabled={pending}
          className={primaryBtn}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await updateCampaignFunnel(campaignId, values);
                setSaved(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Gagal menyimpan.");
              }
            });
          }}
        >
          {pending ? "Menyimpan…" : "Perbarui corong"}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-700">Tersimpan ✓</span>}
      </div>
    </div>
  );
}

export function MetricAddForm({ campaignId }: { campaignId: string }) {
  const [values, setValues] = useState({
    date: new Date().toISOString().slice(0, 10),
    spendRibu: "",
    impressions: "",
    clicks: "",
    resultsPlatform: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div>
          <label className={label}>Tanggal</label>
          <input type="date" className={input} value={values.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        {(
          [
            ["spendRibu", "Spend (ribu Rp)"],
            ["impressions", "Impresi"],
            ["clicks", "Klik"],
            ["resultsPlatform", "“Hasil” versi Ads Manager"],
          ] as const
        ).map(([k, l]) => (
          <div key={k}>
            <label className={label}>{l}</label>
            <input type="number" min={0} className={input} value={values[k]} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <button
        disabled={pending || !values.spendRibu}
        className={primaryBtn + " mt-3"}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await addCampaignMetric({ campaignId, ...values, date: new Date(values.date) });
              setValues((v) => ({ ...v, spendRibu: "", impressions: "", clicks: "", resultsPlatform: "" }));
            } catch (e) {
              setError(e instanceof Error ? e.message : "Gagal menyimpan.");
            }
          });
        }}
      >
        {pending ? "Menyimpan…" : "Tambah data harian"}
      </button>
    </div>
  );
}
