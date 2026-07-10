import { addEvidence, deleteLearning, saveLearning, setFalsifier, setLearningStrength } from "@/actions/knowledge";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getDashboardData } from "@/lib/dashboard";
import { isLeadQualified, mapPostToInput } from "@/lib/data";
import { db } from "@/lib/db";
import { formatTanggal } from "@/lib/format";
import { getPhaseBGate } from "@/lib/pilotGate";
import { compareByDimension } from "@/lib/engine/igDiagnosis";
import {
  buildProvenance,
  CAPTURE_GAPS,
  EVIDENCE_TYPE_LABEL,
  falsifierTemplate,
  MATURITY_LABEL,
  type EvidenceType,
} from "@/lib/engine/belief";
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
  const [learnings, posts, leads, d, { gate }] = await Promise.all([
    db.learning.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        evidence: { orderBy: { createdAt: "desc" } },
        revisions: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.igPost.findMany({ include: { leads: true } }),
    db.lead.findMany(),
    getDashboardData(),
    getPhaseBGate(),
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
      falsifier: formData.get("falsifier"),
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
      falsifier: formData.get("falsifier"),
    });
  }
  async function addEvidenceForm(formData: FormData) {
    "use server";
    await addEvidence({
      learningId: formData.get("learningId"),
      polarity: formData.get("polarity"),
      sourceKind: formData.get("sourceKind"),
      note: formData.get("note"),
    });
  }
  async function setFalsifierForm(formData: FormData) {
    "use server";
    await setFalsifier(String(formData.get("learningId")), String(formData.get("falsifier")));
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
        subtitle="Learning yang bisa dipakai ulang — setiap insight wajib bawa data pendukung, sumber, tingkat kekuatan, dan FALSIFIER (syarat gugurnya sendiri). Satu kejadian BUKAN kebenaran: saran otomatis maksimal 'Berkembang'; 'Terbukti' hanya lewat keputusan owner atas pola yang berulang, dan hanya untuk data internal."
      />

      {gate.locked && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          🔒 <b>Pilot Learning Mode.</b> {gate.lockMessage} Selama pilot: catat learning [PILOT] dan bukti
          di ledger sebanyak-banyaknya — tapi kenaikan ke <b>Terbukti</b> menunggu pola berulang dari data
          nyata. Status gerbang lengkap ada di layar <a href="/pilot" className="font-semibold underline">Pilot 14 Hari</a>.
        </div>
      )}

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
                <p className="mt-0.5 text-xs text-gray-500">Gugur jika: {s.falsifier}</p>
                <form action={saveSuggestion} className="mt-2">
                  {Object.entries({
                    category: s.category,
                    insight: s.insight,
                    supportingData: s.supportingData,
                    sourceType: s.sourceType,
                    confidence: s.confidence,
                    strength: s.strength,
                    recommendedAction: s.recommendedAction,
                    falsifier: s.falsifier,
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
              {grouped[strength].map((l) => {
                const prov = buildProvenance({
                  strength: l.strength,
                  derivedFromPublic: l.derivedFromPublic,
                  falsifier: l.falsifier,
                  evidence: l.evidence,
                  revisions: l.revisions,
                });
                return (
                  <li key={l.id} className="rounded-lg border border-gray-100 bg-white p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">
                          {l.insight}
                          {prov.projection.openContradiction && (
                            <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                              ⚠ kontradiksi terbuka
                            </span>
                          )}
                          {l.derivedFromPublic && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              akar publik
                            </span>
                          )}
                        </div>
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

                    <details className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                      <summary className="cursor-pointer text-xs font-semibold text-gray-600">
                        Kenapa percaya ini? — {MATURITY_LABEL[prov.projection.maturity]} ·{" "}
                        {prov.projection.supportingCount} bukti mendukung · {prov.projection.opposingCount} menentang
                      </summary>
                      <div className="mt-2 space-y-2 text-xs">
                        {l.falsifier ? (
                          <p className="text-gray-700">
                            <b>Gugur jika:</b> {l.falsifier}
                          </p>
                        ) : (
                          <form action={setFalsifierForm} className="space-y-1">
                            <input type="hidden" name="learningId" value={l.id} />
                            <textarea
                              name="falsifier" required rows={2}
                              placeholder={falsifierTemplate(l.category)}
                              className={input}
                            />
                            <button className="rounded border border-gray-400 px-2 py-0.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-100">
                              Simpan falsifier (learning lama belum punya)
                            </button>
                          </form>
                        )}

                        {prov.honestyNotes.length > 0 && (
                          <ul className="space-y-0.5 text-amber-700">
                            {prov.honestyNotes.map((n) => (
                              <li key={n}>⚠ {n}</li>
                            ))}
                          </ul>
                        )}

                        {l.evidence.length > 0 && (
                          <div>
                            <div className="font-semibold text-gray-600">Ledger bukti ({l.evidence.length})</div>
                            <ul className="mt-1 space-y-1">
                              {l.evidence.map((e) => (
                                <li key={e.id} className="rounded border border-gray-200 bg-white p-1.5">
                                  <span
                                    className={`mr-1.5 rounded px-1 py-0.5 text-[10px] font-bold ${
                                      e.polarity === "MENDUKUNG"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {e.polarity === "MENDUKUNG" ? "+ mendukung" : "− menentang"}
                                  </span>
                                  {e.note}
                                  <span className="block text-[10px] text-gray-400">
                                    {EVIDENCE_TYPE_LABEL[e.evidenceType as EvidenceType]} · sumber{" "}
                                    {SOURCE_LABEL[e.sourceKind as LearningSource]} · andal ~{e.reliabilityPct}% ·{" "}
                                    {formatTanggal(e.createdAt)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {l.revisions.length > 0 && (
                          <div>
                            <div className="font-semibold text-gray-600">Riwayat revisi ({l.revisions.length})</div>
                            <ul className="mt-1 space-y-0.5 text-gray-500">
                              {l.revisions.map((r) => (
                                <li key={r.id}>
                                  {formatTanggal(r.createdAt)}: {r.fromState ? `${r.fromState} → ` : "lahir sebagai "}
                                  <b>{r.toState}</b> · {r.trigger} ({r.actor === "OWNER" ? "owner" : "sistem"})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <form action={addEvidenceForm} className="space-y-1 rounded border border-gray-200 bg-white p-2">
                          <div className="font-semibold text-gray-600">+ Catat bukti baru (tidak mengubah status otomatis)</div>
                          <input type="hidden" name="learningId" value={l.id} />
                          <div className="grid grid-cols-2 gap-1.5">
                            <select name="polarity" className={input}>
                              <option value="MENDUKUNG">Mendukung</option>
                              <option value="MENENTANG">Menentang</option>
                            </select>
                            <select name="sourceKind" defaultValue={l.sourceType} className={input}>
                              {LEARNING_SOURCE.map((s) => (
                                <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            name="note" required rows={2}
                            placeholder="Bukti spesifik — angka/kejadian, bukan opini. Contoh: 'Post carousel BEFORE_AFTER 12 Jul: 2 lead berkualitas.'"
                            className={input}
                          />
                          <button className="rounded bg-gray-900 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-gray-700">
                            Catat bukti
                          </button>
                        </form>
                      </div>
                    </details>

                    <div className="mt-2 flex gap-1.5">
                      {(["TERBUKTI", "BERKEMBANG", "LEMAH"] as const)
                        .filter(
                          (s) =>
                            s !== l.strength &&
                            !(s === "TERBUKTI" && (l.sourceType !== "DATA_INTERNAL" || l.derivedFromPublic)),
                        )
                        .map((s) => (
                          <form key={s} action={setLearningStrength.bind(null, l.id, s)}>
                            <button className="rounded border border-gray-300 px-2 py-0.5 text-[10px] font-semibold text-gray-500 hover:bg-gray-100">
                              → {s.toLowerCase()}
                            </button>
                          </form>
                        ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ))}

      <Card title="Titik Buta (Capture-Gap Register)" className="mb-6">
        <p className="mb-2 text-xs text-gray-500">
          Sumber yang sistem TAHU penting tapi BELUM ditangkap. Selama kosong, kesimpulan apa pun yang
          bergantung padanya jujurnya asumsi — daftar ini ada supaya titik buta terlihat, bukan disembunyikan.
        </p>
        <ul className="space-y-1.5 text-sm">
          {CAPTURE_GAPS.map((g) => (
            <li key={g.key} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
              <b>{g.label}</b>
              <span className="block text-xs text-gray-500">{g.why}</span>
            </li>
          ))}
        </ul>
      </Card>

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
          <textarea name="falsifier" required rows={2} placeholder="Falsifier — WAJIB. Bukti apa yang akan memaksa learning ini dibuang? Contoh: 'Jika 5 lead Citraland berikutnya minta per-ruangan, buang.'" className={input} />
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
