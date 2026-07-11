import { NextResponse } from "next/server";
import { apiSessionValid } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { CSV_DEF, toCsv } from "@/lib/csv";

export async function GET(_req: Request, ctx: { params: Promise<{ jenis: string }> }) {
  if (!(await apiSessionValid())) {
    return NextResponse.json({ error: "Perlu login." }, { status: 401 });
  }
  const { jenis } = await ctx.params;
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

  let csv: string;
  if (jenis === "lead") {
    const rows = await db.lead.findMany({ orderBy: { createdAt: "desc" } });
    csv = toCsv(CSV_DEF.LEAD.headers, rows.map((l) => [
      l.name, l.sourceType, l.status, l.signalBudget, l.signalProjectType, l.signalLocation,
      l.signalUrgency, l.signalSeriousness, l.qualAnswersCount, l.estimatedValueJuta, iso(l.createdAt),
    ]));
  } else if (jenis === "ig-post") {
    const rows = await db.igPost.findMany({ orderBy: { postedAt: "desc" } });
    csv = toCsv(CSV_DEF.IG_POST.headers, rows.map((p) => [
      iso(p.postedAt), p.format, p.pillar, p.hook, p.cta, p.reach, p.reachNonFollower, p.plays,
      p.likes, p.comments, p.saves, p.shares, p.profileVisits, p.follows, p.dmClicks, p.waClicks,
      p.leadsManual, p.qualifiedLeadsManual,
    ]));
  } else if (jenis === "ads-metric") {
    const rows = await db.campaignMetricDaily.findMany({ include: { campaign: true }, orderBy: { date: "desc" } });
    csv = toCsv(CSV_DEF.ADS_METRIC.headers, rows.map((m) => [
      m.campaign.name, iso(m.date), m.spendRibu, m.impressions, m.clicks, m.resultsPlatform,
    ]));
  } else {
    return new NextResponse("Jenis ekspor tidak dikenal", { status: 404 });
  }

  // Ekspor apa pun dihitung sebagai cadangan — stempel waktunya.
  await db.setting.upsert({
    where: { key: "backup.lastExportAt" },
    update: { value: new Date().toISOString() },
    create: {
      key: "backup.lastExportAt",
      value: new Date().toISOString(),
      label: "Cadangan CSV terakhir",
      defaultValue: "",
      rationale: "DB = satu file SQLite; ekspor CSV mingguan adalah cadangan minimum sampai ada backup sungguhan.",
      groupKey: "data",
    },
  });
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zenaide-${jenis}.csv"`,
    },
  });
}
