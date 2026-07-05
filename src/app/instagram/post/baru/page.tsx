import { QuickPostForm } from "@/components/QuickPostForm";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PostBaruPage() {
  const experiments = await db.experiment.findMany({
    where: { status: { in: ["DRAFT", "RUNNING"] } },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Catat post Instagram"
        subtitle="Target: 60 detik per post. Hanya hook, format, pilar, dan tanggal yang wajib — angka yang kosong membuat diagnosa bilang 'data belum cukup', bukan menebak."
      />
      <QuickPostForm experiments={experiments} />
    </div>
  );
}
