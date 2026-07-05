import { LeadForm } from "@/components/LeadForm";
import { PageHeader } from "@/components/ui";

export default function LeadBaruPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Catat lead baru"
        subtitle="Nilai lima sinyal dari isi chat nyata — bukan perasaan. Skor ≥ 60 dan ≥ 3 jawaban kualifikasi = lead berkualitas."
      />
      <LeadForm />
    </div>
  );
}
