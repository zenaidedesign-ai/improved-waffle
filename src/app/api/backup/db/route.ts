// Unduh cadangan file database SQLite — snapshot KONSISTEN via VACUUM INTO
// (aman walau ada tulisan berjalan; tidak menyalin file mentah yang bisa setengah-tertulis).
// Ini cadangan LOKAL: file hasil unduhan berisi SEMUA data bisnis — simpan di tempat
// tepercaya, jangan dibagikan (lihat docs/OPERATIONS-SAFETY.md).

import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { apiSessionValid } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await apiSessionValid())) {
    return NextResponse.json({ error: "Perlu login." }, { status: 401 });
  }
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const tmp = path.join(process.cwd(), "prisma", `backup-tmp-${now.getTime()}.db`);
  try {
    await db.$executeRawUnsafe(`VACUUM INTO '${tmp.replaceAll("'", "''")}'`);
    const buf = await fs.readFile(tmp);
    await db.setting.upsert({
      where: { key: "backup.lastExportAt" },
      update: { value: now.toISOString() },
      create: {
        key: "backup.lastExportAt",
        value: now.toISOString(),
        label: "Cadangan terakhir",
        defaultValue: "",
        rationale: "Stempel waktu cadangan (CSV atau file DB) — dipakai pengingat cadangan mingguan.",
        groupKey: "backup",
      },
    });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="zenaide-backup-${stamp}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await fs.rm(tmp, { force: true });
  }
}
