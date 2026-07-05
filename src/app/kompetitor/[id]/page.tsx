import { notFound } from "next/navigation";
import { addCompetitorAnalysis } from "@/actions/competitor";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Array<{ key: string; label: string; hint: string }> = [
  { key: "positioning", label: "Positioning", hint: "Mereka menjual diri sebagai apa? Premium? Murah? Cepat?" },
  { key: "offer", label: "Penawaran", hint: "Apa yang ditawarkan di bio/pinned/iklan? Promo? Free konsultasi?" },
  { key: "cta", label: "CTA", hint: "Ajakan aksi utama mereka — DM? WA? Link? Form?" },
  { key: "visualStyle", label: "Gaya visual", hint: "Tone foto/video, grading, tipografi, gaya thumbnail" },
  { key: "contentPattern", label: "Pola konten", hint: "Jenis konten yang diulang-ulang — apa yang sering muncul?" },
  { key: "postingFrequency", label: "Frekuensi posting", hint: "Berapa post/minggu? Format apa yang paling sering?" },
  { key: "hookPattern", label: "Pola hook", hint: "Kalimat pembuka yang mereka pakai berulang" },
  { key: "marketGap", label: "Celah pasar", hint: "Apa yang TIDAK mereka kerjakan / audiens yang mereka abaikan?" },
  { key: "adaptationIdeas", label: "Adaptasi untuk Zenaide (WAJIB — decode, bukan copy)", hint: "Pola apa yang layak diadaptasi ke positioning premium Zenaide, dengan angle berbeda?" },
];

export default async function KompetitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitor = await db.competitor.findUnique({
    where: { id },
    include: { analyses: { orderBy: { analyzedAt: "desc" } } },
  });
  if (!competitor) notFound();
  const latest = competitor.analyses[0];

  async function submit(formData: FormData) {
    "use server";
    await addCompetitorAnalysis({
      competitorId: id,
      ...Object.fromEntries(FIELDS.map((f) => [f.key, formData.get(f.key) || ""])),
    });
  }

  const links = [
    ["Instagram", competitor.igUrl],
    ["Threads", competitor.threadsUrl],
    ["TikTok", competitor.tiktokUrl],
    ["Website", competitor.websiteUrl],
  ].filter(([, u]) => u) as Array<[string, string]>;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Battle Card — ${competitor.name}`}
        subtitle="Diisi dari pengamatan manual atas profil publik. Buka tautan di tab lain, amati 20–30 post terakhir, lalu isi."
        action={
          <span className="flex gap-2">
            {links.map(([label, url]) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                {label} ↗
              </a>
            ))}
          </span>
        }
      />

      {latest ? (
        <Card title={`Battle card aktif · ${formatTanggal(latest.analyzedAt)}`} className="mb-6">
          <dl className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.key === "adaptationIdeas" ? "sm:col-span-2 rounded-lg border-2 border-gray-900 bg-gray-50 p-3" : ""}>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{f.label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">
                  {(latest as unknown as Record<string, string>)[f.key]}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : (
        <Card className="mb-6">
          <p className="text-sm text-gray-500">Belum ada battle card — isi formulir di bawah setelah mengamati profil publik mereka.</p>
        </Card>
      )}

      <Card title={latest ? "Perbarui battle card (versi baru)" : "Isi battle card pertama"}>
        <form action={submit} className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-0.5 block text-xs font-semibold text-gray-600">{f.label} *</label>
              <p className="mb-1 text-[11px] text-gray-400">{f.hint}</p>
              <textarea name={f.key} required rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
          ))}
          <button className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-700">
            Simpan battle card
          </button>
        </form>
      </Card>

      {competitor.analyses.length > 1 && (
        <p className="mt-3 text-xs text-gray-400">
          {competitor.analyses.length - 1} versi battle card lama tersimpan sebagai riwayat.
        </p>
      )}
    </div>
  );
}
