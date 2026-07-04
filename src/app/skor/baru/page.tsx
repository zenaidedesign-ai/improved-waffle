import { FitScoreForm } from "@/components/FitScoreForm";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SkorBaruPage() {
  const posts = await db.igPost.findMany({ orderBy: { postedAt: "desc" }, take: 50 });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Skor post / ide konten"
        subtitle="Nilai 0–5 per dimensi dengan jangkar deskriptif. Komposit dihitung transparan dari bobot default (bisa disetel di fase berikutnya)."
      />
      <FitScoreForm
        posts={posts.map((p) => ({
          id: p.id,
          label: `${formatTanggal(p.postedAt)} — ${p.hook.slice(0, 70)}`,
        }))}
      />
    </div>
  );
}
