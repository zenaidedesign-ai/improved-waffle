// Komponen UI kecil bersama — server-safe (tanpa state).

import type { ReactNode } from "react";
import type { Keputusan, Keyakinan, StatusAuditItem } from "@/lib/domain/enums";
import { KEPUTUSAN_LABEL, STATUS_LABEL } from "@/lib/domain/enums";
import type { VerdictProposal } from "@/lib/engine/types";

const STATUS_STYLE: Record<StatusAuditItem, string> = {
  MERAH: "bg-red-100 text-red-800 border-red-300",
  KUNING: "bg-amber-100 text-amber-800 border-amber-300",
  HIJAU: "bg-emerald-100 text-emerald-800 border-emerald-300",
  BELUM_DICEK: "bg-gray-100 text-gray-600 border-gray-300",
};

export function StatusChip({ status, label }: { status: StatusAuditItem | null; label?: string }) {
  const s: StatusAuditItem = status ?? "BELUM_DICEK";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[s]}`}>
      {label ?? (status === null ? "Belum diaudit" : STATUS_LABEL[s])}
    </span>
  );
}

const DECISION_STYLE: Partial<Record<Keputusan, string>> = {
  KILL_KAMPANYE: "bg-red-100 text-red-800 border-red-300",
  PERBAIKI_AKUN_DULU: "bg-red-100 text-red-800 border-red-300",
  PERBAIKI_TRACKING_DULU: "bg-red-100 text-red-800 border-red-300",
  SCALE_KAMPANYE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  JADIKAN_IKLAN: "bg-emerald-100 text-emerald-800 border-emerald-300",
  LANJUT: "bg-emerald-100 text-emerald-800 border-emerald-300",
  TAHAN_DATA_BELUM_CUKUP: "bg-gray-100 text-gray-700 border-gray-300",
};

export function DecisionChip({ decision }: { decision: Keputusan }) {
  const style = DECISION_STYLE[decision] ?? "bg-amber-100 text-amber-800 border-amber-300";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {KEPUTUSAN_LABEL[decision]}
    </span>
  );
}

export function ConfidenceTag({ level }: { level: Keyakinan }) {
  const label = { RENDAH: "keyakinan rendah", SEDANG: "keyakinan sedang", TINGGI: "keyakinan tinggi" }[level];
  return <span className="text-xs text-gray-500">({label})</span>;
}

export function VerdictCard({ verdict }: { verdict: VerdictProposal }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <DecisionChip decision={verdict.decision} />
        <ConfidenceTag level={verdict.confidence} />
        <span className="text-xs text-gray-400">aturan: {verdict.ruleFired}</span>
      </div>
      <p className="mt-2 text-sm text-gray-700">{verdict.explanation}</p>
    </div>
  );
}

export function GateLockBanner({ verdict }: { verdict: VerdictProposal }) {
  return (
    <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔒</span>
        <span className="font-bold text-red-800">{KEPUTUSAN_LABEL[verdict.decision]}</span>
      </div>
      <p className="mt-1 text-sm text-red-700">{verdict.explanation}</p>
      <p className="mt-1 text-xs text-red-500">
        Data tetap terlihat di bawah — tapi sistem menolak memberi vonis di atas fondasi yang belum terbukti.
      </p>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      {title && <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h2>}
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}
