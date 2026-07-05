import { deleteLearning, saveLearning, setLearningStrength } from "@/actions/knowledge";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getDashboardData } from "@/lib/dashboard";
import { isLeadQualified, mapPostToInput } from "@/lib/data";
import { db } from "@/lib/db";
import { formatTanggal } from "@/lib/format";
import { compareByDimension } from "@/lib/engine/igDiagnosis";
import {
  LEARNING_SOURCE,
  SOURCE_LABEL,
  STRENGTH_LABEL,
  suggestLearnings,
  type LearningSource,
  type LearningStrength,
} from "@/lib/engine/knowledge";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const [learnings, posts, leads, d] = await Promise.all([
    db.learning.findMany({ orderBy: { updatedAt: "desc" } }),
    db.igPost.findMany({ include: { leads: true } }),
    db.lead.findMany(),
    getDashboardData(),
  ]);

  const pillarStats = compareByDimension(posts.map(mapPostToInput), "pillar").map((r) => ({
    pillar: r.key,
    n: r.n,
    qualifiedLeads: r.totalQualifiedLeads,
    medianSaves: r.medianSaves,
  }));
  const channelStats = ["ADS", "IG_ORGANIK", "REFERRAL", "LAINNYA"].map((src) => ({
    channel: src,
    leads: leads.filter((l) => l.sourceType === src).length,
    qualified: leads.filter((l) => l.sourceType === src && isLeadQualified(l)).length,
  }));
  const suggestions = suggestLearnings({
    pillarStats,
    channelStats,
    campaignRows: d.allCampaigns.map((c) => ({
      name: c.name,
      decision: c.verdict.decision,
      cpqlRibu: c.cpqlRibu,
      qualifiedLeads: c.qualifiedLeads,
      qualRatePct: null,
    })),
  });
  // Jangan sarankan yang sudah disimpan (cocokkan insight persis).
  const savedInsights = new Set(learnings.map((l) => l.insight));
  const freshSuggestions = suggestions.filter((s) => !savedInsights.has(s.insight));

  async function saveSuggestion(formData: FormData) {
    "use server";
    await saveLearning({
      category: formData.get("category"),
      insight: formData.get("insight"),
      supportingData: formData.get("supportingData"),
      sourceType: formData.get("sourceType"),
      confidence: formData.get("confidence"),
      strength: formData.get("strength"),
      recommendedAction: formData.get("recommendedAction"),
    });
  }
  async function saveManual(formData: FormData) {
    "use server";
    await saveLearning({
      category: formData.get("category"),
      insight: formData.get("insight"),
      supportingData: formData.get("supportingData"),
      sourceType: formData.get("sourceType"),
      confidence: "RENDAH",
      strength: "LEMAH", // entri manual selalu mulai LEMAH — naik kelas lewat bukti
      recommendedAction: formData.get("recommendedAction"),
    });
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm";
  const grouped: Record<LearningStrength, typeof learnings> = {
    TERBUKTI: learnings.filter((l) => l.strength === "TERBUKTI"),
    BERKEMBANG: learnings.filter((l) => l.strength === "BERKEMBANG"),
    LEMAH: learnings.filter((l) => l.strength === "LEMAH"),
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Marketing Knowledge Engine"
        subtitle="Learning yang bisa dipakai ulang — setiap insight wajib bawa data pendukung, sumber, dan tingkat kekuatan. Satu kejadian BUKAN kebenaran: saran otomatis maksimal 'Berkembang'; 'Terbukti' hanya lewat keputusan owner atas pola yang berulang, dan hanya untuk data internal."
      />

      <Card title={`Saran dari data (${freshSuggestions.length})`} className="mb-6">
        {freshSuggestions.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada saran baru — sistem hanya menyarankan saat datanya cukup.</p>
        ) : (
          <ul className="space-y-3">
            {freshSuggestions.map((s, i) => (
              <li key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <div className="font-semibold">{s.insight}</div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {s.supportingData} · kekuatan awal: <b>{STRENGTH_LABEL[s.strength]}</b>
                </p>
                <p className="mt-0.5 text-xs text-gray-600">→ {s.recommendedAction}</p>
                <form action={saveSuggestion} className="mt-2">
                  {Object.entries({
                    category: s.category,
                    insight: s.insight,
                    supportingData: s.supportingData,
                    sourceType: s.sourceType,
                    confidence: s.confidence,
                    strength: s.strength,
                    recommendedAction: s.recommendedAction,
                  }).map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))}
                  <button className="rounded-lg bg-gray-900 px-3 py-1 text-xs font-bold text-white hover:bg-gray-700">
                    Simpan sebagai learning
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {(["TERBUKTI", "BERKEMBANG", "LEMAH"] as const).map((strength) => (
        <Card key={strength} title={`${STRENGTH_LABEL[strength]} (${grouped[strength].length})`} className="mb-4">
          {grouped[strength].length === 0 ? (
            <p className="text-sm text-gray-400">—</p>
          ) : (
            <ul className="space-y-2">
              {grouped[strength].map((l) => (
                <li key={l.id} className="rounded-lg border border-gray-100 bg-white p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{l.insight}</div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Data: {l.supportingData} · Sumber: {SOURCE_LABEL[l.sourceType as LearningSource]} ·
                        keyakinan {l.confidence.toLowerCase()} · diperbarui {formatTanggal(l.updatedAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600">→ {l.recommendedAction}</p>
                    </div>
                    <form action={deleteLearning.bind(null, l.id)}>
                      <button className="text-xs text-gray-300 hover:text-red-500">✕</button>
                    </form>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {(["TERBUKTI", "BERKEMBANG", "LEMAH"] as const)
                      .filter((s) => s !== l.strength && !(s === "TERBUKTI" && l.sourceType !== "DATA_INTERNAL"))
                      .map((s) => (
                        <form key={s} action={setLearningStrength.bind(null, l.id, s)}>
                          <button className="rounded border border-gray-300 px-2 py-0.5 text-[10px] font-semibold text-gray-500 hover:bg-gray-100">
                            → {s.toLowerCase()}
                          </button>
                        </form>
                      ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      <Card title="Tambah learning manual">
        <form action={saveManual} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select name="category" className={input}>
              {["KONTEN", "PENAWARAN", "AREA", "PROYEK", "KEBERATAN", "KANAL", "KAMPANYE", "LEAD_SIGNAL"].map((c) => (
                <option key={c} value={c}>{c.toLowerCase().replaceAll("_", " ")}</option>
              ))}
            </select>
            <select name="sourceType" className={input}>
              {LEARNING_SOURCE.map((s) => (
                <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <textarea name="insight" required rows={2} placeholder="Insight — contoh: 'Area Citraland lebih responsif ke penawaran full-house daripada per-ruangan'" className={input} />
          <textarea name="supportingData" required rows={2} placeholder="Data pendukung — WAJIB. Tanpa data, ini opini, dan akan tersimpan sebagai LEMAH." className={input} />
          <textarea name="recommendedAction" required rows={2} placeholder="Aksi yang disarankan" className={input} />
          <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700">
            Simpan (mulai sebagai LEMAH)
          </button>
        </form>
        {learnings.length === 0 && (
          <div className="mt-3">
            <EmptyState>Mesin pengetahuan kosong. Learning pertama yang paling berharga: definisi lead berkualitas versi Anda sendiri.</EmptyState>
          </div>
        )}
      </Card>
    </div>
  );
}
