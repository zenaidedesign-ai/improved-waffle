"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function startPilot(): Promise<void> {
  await db.setting.upsert({
    where: { key: "pilot.startedAt" },
    update: {}, // sudah mulai — tidak di-reset diam-diam
    create: {
      key: "pilot.startedAt",
      value: new Date().toISOString(),
      label: "Pilot data nyata dimulai",
      defaultValue: "",
      rationale: "Penanda hari-1 pilot 14 hari; kemajuan dihitung dari tanggal ini (WIB).",
      groupKey: "pilot",
    },
  });
  revalidatePath("/pilot");
}
