import { notFound } from "next/navigation";
import { AuditWizard } from "@/components/AuditWizard";
import { PageHeader } from "@/components/ui";
import { AUDIT_INTRO, SLUG_TO_TYPE } from "@/lib/auditSlug";
import { AUDIT_ITEMS } from "@/lib/domain/auditItems";
import { AUDIT_TYPE_LABEL } from "@/lib/domain/enums";

export default async function JalankanAuditPage({ params }: { params: Promise<{ type: string }> }) {
  const { type: slug } = await params;
  const type = SLUG_TO_TYPE[slug];
  if (!type) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`${AUDIT_TYPE_LABEL[type]} — jalankan`} subtitle={AUDIT_INTRO[type]} />
      <AuditWizard type={type} items={AUDIT_ITEMS[type]} />
    </div>
  );
}
