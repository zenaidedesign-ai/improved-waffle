import Link from "next/link";
import { createCompetitor } from "@/actions/competitor";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function KompetitorPage() {
  const competitors = await db.competitor.findMany({
    orderBy: { createdAt: "desc" },
    include: { analyses: { orderBy: { analyzedAt: "desc" }, take: 1 } },
  });

  async function create(formData: FormData) {
    "use server";
    await createCompetitor({
      name: formData.get("name") || "",
      igUrl: formData.get("igUrl") || "",
      threadsUrl: formData.get("threadsUrl") || "",
      tiktokUrl: formData.get("tiktokUrl") || "",
      websiteUrl: formData.get("websiteUrl") || "",
      notes: (formData.get("notes") as string) || undefined,
    });
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Competitor Intelligence Lab"
        subtitle="100% input manual dari pengamatan Anda atas profil PUBLIK — tanpa scraping. Aturan mainnya: decode pola, adaptasi ke positioning Zenaide, JANGAN meniru konten."
      />

      <Card title="Tambah kompetitor" className="mb-6">
        <form action={create} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-0.5 block text-xs font-semibold text-gray-500">Nama kompetitor *</label>
            <input name="name" required className={input} />
          </div>
          <input name="igUrl" placeholder="URL Instagram" className={input} />
          <input name="threadsUrl" placeholder="URL Threads" className={input} />
          <input name="tiktokUrl" placeholder="URL TikTok" className={input} />
          <input name="websiteUrl" placeholder="URL Website" className={input} />
          <div className="sm:col-span-2">
            <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700">
              Simpan & mulai decode
            </button>
          </div>
        </form>
      </Card>

      <Card title="Daftar kompetitor">
        {competitors.length === 0 ? (
          <EmptyState>Belum ada kompetitor tercatat. Mulai dari 3–5 pemain interior Surabaya yang paling sering muncul.</EmptyState>
        ) : (
          <ul className="divide-y divide-gray-100">
            {competitors.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <Link href={`/kompetitor/${c.id}`} className="font-semibold underline-offset-2 hover:underline">
                    {c.name}
                  </Link>
                  <span className="ml-2 text-xs text-gray-400">
                    {[c.igUrl && "IG", c.threadsUrl && "Threads", c.tiktokUrl && "TikTok", c.websiteUrl && "Web"]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {c.analyses[0]
                    ? `Battle card terakhir: ${formatTanggal(c.analyses[0].analyzedAt)}`
                    : "Belum ada battle card"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
