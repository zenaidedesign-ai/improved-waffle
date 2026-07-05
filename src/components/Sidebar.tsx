"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "🎛️" },
  { href: "/laporan", label: "Laporan Revenue", icon: "📑" },
  { group: "Instagram & Meta Recovery" },
  { href: "/audit/meta-account", label: "Audit Akun Meta", icon: "🩺" },
  { href: "/audit/rekomendasi", label: "Audit Rekomendasi", icon: "📡" },
  { href: "/audit/tracking", label: "Audit Tracking", icon: "🎯" },
  { href: "/instagram", label: "Diagnosa Instagram", icon: "📈" },
  { group: "Revenue" },
  { href: "/leads", label: "Lead Intelligence", icon: "🤝" },
  { href: "/kampanye", label: "Ads Intelligence", icon: "🚑" },
  { href: "/war-room", label: "War Room Mingguan", icon: "🧭" },
  { group: "Konten" },
  { href: "/skor", label: "Algorithm Fit Score", icon: "🧮" },
  { href: "/eksperimen", label: "Eksperimen 30 Hari", icon: "🧪" },
  { href: "/library", label: "Pain & Keberatan", icon: "📚" },
  { group: "Pasar" },
  { href: "/kompetitor", label: "Competitor Lab", icon: "🔭" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-4">
        <div className="text-sm font-black tracking-tight text-gray-900">ZENAIDE</div>
        <div className="text-xs text-gray-500">Revenue Engine</div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV.map((item, i) =>
          "group" in item ? (
            <div key={i} className="mt-3 mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {item.group}
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-0.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                  ? "bg-gray-900 font-semibold text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ),
        )}
      </nav>
      <div className="border-t border-gray-200 p-3 text-[10px] leading-relaxed text-gray-400">
        Fase 1 — input manual & data contoh. Tanpa API eksternal. Metrik utama: lead berkualitas,
        survei, proposal, nilai pipeline.
      </div>
    </aside>
  );
}
