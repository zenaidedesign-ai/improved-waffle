import { createExperiment } from "@/actions/experiment";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { PILAR, PILAR_LABEL, type Pilar } from "@/lib/domain/enums";

export const dynamic = "force-dynamic";

const HYPOTHESIS_FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: "whyNeeded", label: "1 · Kenapa konten/eksperimen ini dibutuhkan?", placeholder: "contoh: 67% konten kita portofolio; non-follower tidak punya alasan peduli" },
  { key: "signalTargeted", label: "2 · Sinyal apa yang mau diperbaiki?", placeholder: "contoh: share rate & reach non-follower" },
  { key: "expectedAudienceReaction", label: "3 · Reaksi audiens yang diharapkan?", placeholder: "contoh: dikirim ke pasangan yang sedang renovasi" },
  { key: "expectedBusinessOutcome", label: "4 · Hasil bisnis yang diharapkan?", placeholder: "contoh: chat masuk bertanya estimasi budget" },
  { key: "successMetric", label: "5 · Metrik sukses yang membuktikan?", placeholder: "contoh: ≥ 40 share & ≥ 1 chat per post, dari 3 post uji dalam 14 hari" },
  { key: "decisionRuleAfterTest", label: "6 · Aturan keputusan setelah uji?", placeholder: "contoh: lolos → jadikan pilar rutin + kandidat iklan; gagal → ganti angle hook, bukan ganti format" },
];

export default async function EksperimenBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ postId?: string }>;
}) {
  const { postId } = await searchParams;
  const sourcePost = postId ? await db.igPost.findUnique({ where: { id: postId } }) : null;

  async function submit(formData: FormData) {
    "use server";
    await createExperiment({
      title: formData.get("title") || "",
      pillar: formData.get("pillar") || "PAIN_BASED",
      channel: formData.get("channel") || "ORGANIK",
      sourcePostId: formData.get("sourcePostId") || "",
      ...Object.fromEntries(HYPOTHESIS_FIELDS.map((f) => [f.key, formData.get(f.key) || ""])),
    });
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Kartu hipotesis baru"
        subtitle="Enam kolom wajib. Ini pagar anti-'content calendar generik' — kalau tidak bisa mengisi keenamnya, idenya belum siap diuji."
      />
      <Card>
        <form action={submit} className="space-y-3">
          <div>
            <label className="mb-0.5 block text-xs font-semibold text-gray-600">Judul *</label>
            <input
              name="title"
              required
              defaultValue={sourcePost ? `Iklan dari pemenang organik: ${sourcePost.hook.slice(0, 60)}` : ""}
              className={input}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-0.5 block text-xs font-semibold text-gray-600">Pilar *</label>
              <select name="pillar" defaultValue={sourcePost?.pillar ?? "PAIN_BASED"} className={input}>
                {PILAR.map((p) => (
                  <option key={p} value={p}>{PILAR_LABEL[p as Pilar]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-semibold text-gray-600">Kanal *</label>
              <select name="channel" defaultValue={sourcePost ? "IKLAN" : "ORGANIK"} className={input}>
                <option value="ORGANIK">Organik</option>
                <option value="IKLAN">Iklan (dari pemenang organik)</option>
              </select>
            </div>
          </div>
          {sourcePost && <input type="hidden" name="sourcePostId" value={sourcePost.id} />}
          {HYPOTHESIS_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-0.5 block text-xs font-semibold text-gray-600">{f.label} *</label>
              <textarea name={f.key} required rows={2} placeholder={f.placeholder} className={input} />
            </div>
          ))}
          <button className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-700">
            Simpan kartu hipotesis
          </button>
        </form>
      </Card>
    </div>
  );
}
