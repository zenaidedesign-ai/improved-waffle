import { addObjection, addPainPoint, deleteObjection, deletePainPoint } from "@/actions/library";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const [pains, objections] = await Promise.all([
    db.painPoint.findMany({ orderBy: { createdAt: "desc" } }),
    db.objection.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  async function addPain(formData: FormData) {
    "use server";
    await addPainPoint({
      text: formData.get("text") || "",
      audience: (formData.get("audience") as string) || undefined,
      source: (formData.get("source") as string) || undefined,
    });
  }
  async function addObj(formData: FormData) {
    "use server";
    await addObjection({ text: formData.get("text") || "", answer: formData.get("answer") || "" });
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Perpustakaan Pain Point & Keberatan"
        subtitle="Bahan mentah hook dan konten konversi — diisi dari bahasa KLIEN NYATA (chat, survei, komentar), bukan karangan. Setiap entri di sini adalah calon hook."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Pain Points (${pains.length})`}>
          <form action={addPain} className="mb-4 space-y-2">
            <textarea name="text" required rows={2} placeholder='Tulis persis seperti klien mengatakannya — contoh: "takut budget bengkak di tengah jalan"' className={input} />
            <div className="grid grid-cols-2 gap-2">
              <input name="audience" placeholder="Siapa (opsional)" className={input} />
              <input name="source" placeholder="Sumber: chat/survei/komentar" className={input} />
            </div>
            <button className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700">+ Tambah</button>
          </form>
          {pains.length === 0 ? (
            <EmptyState>Kosong. Buka 10 chat WhatsApp terakhir — pain point klien ada di sana.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {pains.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 p-2 text-sm">
                  <div>
                    <p className="text-gray-800">“{p.text}”</p>
                    <p className="text-[11px] text-gray-400">{[p.audience, p.source].filter(Boolean).join(" · ")}</p>
                  </div>
                  <form action={deletePainPoint.bind(null, p.id)}>
                    <button className="text-xs text-gray-300 hover:text-red-500">✕</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Keberatan & Jawaban (${objections.length})`}>
          <form action={addObj} className="mb-4 space-y-2">
            <textarea name="text" required rows={2} placeholder='Keberatan — contoh: "mahal banget dibanding tukang langsung"' className={input} />
            <textarea name="answer" required rows={2} placeholder="Jawaban terbaik versi Zenaide — dipakai di konten & chat WA" className={input} />
            <button className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700">+ Tambah</button>
          </form>
          {objections.length === 0 ? (
            <EmptyState>Kosong. Keberatan yang dijawab tuntas = konten objection-handling + skrip WA.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {objections.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 p-2 text-sm">
                  <div>
                    <p className="font-semibold text-gray-800">“{o.text}”</p>
                    <p className="mt-0.5 text-xs text-gray-600">→ {o.answer}</p>
                  </div>
                  <form action={deleteObjection.bind(null, o.id)}>
                    <button className="text-xs text-gray-300 hover:text-red-500">✕</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
