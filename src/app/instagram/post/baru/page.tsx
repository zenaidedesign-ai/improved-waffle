import { QuickPostForm } from "@/components/QuickPostForm";
import { PageHeader } from "@/components/ui";

export default function PostBaruPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Catat post Instagram"
        subtitle="Target: 60 detik per post. Hanya hook, format, pilar, dan tanggal yang wajib — angka yang kosong membuat diagnosa bilang 'data belum cukup', bukan menebak."
      />
      <QuickPostForm />
    </div>
  );
}
