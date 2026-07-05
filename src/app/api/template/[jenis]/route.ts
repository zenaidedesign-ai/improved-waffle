import { NextResponse } from "next/server";
import { CSV_DEF, toCsv, type CsvType } from "@/lib/csv";

export async function GET(_req: Request, ctx: { params: Promise<{ jenis: string }> }) {
  const { jenis } = await ctx.params;
  const type = jenis.toUpperCase().replaceAll("-", "_") as CsvType;
  const def = CSV_DEF[type];
  if (!def) return new NextResponse("Jenis template tidak dikenal", { status: 404 });
  const csv = toCsv(def.headers, [def.example]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="template-${jenis}.csv"`,
    },
  });
}
