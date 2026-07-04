import { CampaignCreateForm } from "@/components/CampaignForms";
import { PageHeader } from "@/components/ui";

export default function KampanyeBaruPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Tambah kampanye"
        subtitle="Fase 1: input manual. Salin nama & angka dari Ads Manager, isi corong dari log WhatsApp Anda."
      />
      <CampaignCreateForm />
    </div>
  );
}
