import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { CONFIG } from "@/lib/domain/config";
import { formatTanggal } from "@/lib/format";
import { comparePredictedActual } from "@/lib/engine/fitScore";

export const dynamic = "force-dynamic";

export default async function SkorPage() {
  const scores = await db.fitScore.findMany({
    orderBy: { scoredAt: "desc" },
    include: { igPost: { include: { leads: true } }, contentIdea: true },
  });

  const predActual = comparePredictedActual(
    scores
      .filter((s) => s.igPost)
      .map((s) => ({
        postId: s.igPostId!,
        composite: s.compositeScore,
        actualSignal: s.igPost!.signalScore ?? (s.igPost!.reach ? 0 : null),
      })),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Skor Kelayakan Konten"
        subtitle="Rubrik 11 dimensi untuk menskor post dan ide konten. Skor adalah hipotesis sinyal yang bisa diuji — sistem membandingkan prediksi dengan hasil nyata untuk menguji rubriknya sendiri."
        action={
          <Link
            href="/skor/baru"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
          >
            + Skor post / ide
          </Link>
        }
      />

      <Card title="Prediksi vs aktual — menguji rubrik" className="mb-6">
        {predActual.insufficient ? (
          <p className="text-sm text-gray-500">
            Data belum cukup — butuh minimal {CONFIG.predVsActualMinPosts} post yang diskor DAN sudah
            tayang dengan metrik terisi. Sistem tidak menilai rubriknya sendiri dari data tipis.
          </p>
        ) : (
          <div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3">Post</th>
                  <th className="py-2 pr-3 text-right">Peringkat prediksi</th>
                  <th className="py-2 pr-3 text-right">Peringkat aktual</th>
                  <th className="py-2 text-right">Selisih</th>
                </tr>
              </thead>
              <tbody>
                {predActual.rows.map((r) => {
                  const score = scores.find((s) => s.igPostId === r.postId);
                  return (
                    <tr key={r.postId} className="border-b border-gray-100">
                      <td className="max-w-80 truncate py-2 pr-3">{score?.igPost?.hook ?? r.postId}</td>
                      <td className="py-2 pr-3 text-right">#{r.predictedRank}</td>
                      <td className="py-2 pr-3 text-right">#{r.actualRank}</td>
                      <td className={`py-2 text-right font-semibold ${Math.abs(r.delta) >= 3 ? "text-red-600" : "text-gray-600"}`}>
                        {r.delta > 0 ? `+${r.delta}` : r.delta}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-400">
              Selisih besar (±3 atau lebih) berarti rubrik meleset di post itu — pelajari kenapa, lalu
              sesuaikan cara menilai.
            </p>
          </div>
        )}
      </Card>

      <Card title="Riwayat skor">
        {scores.length === 0 ? (
          <EmptyState>Belum ada yang diskor. Mulai dari tombol “Skor post / ide”.</EmptyState>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                <th className="py-2 pr-3">Tanggal</th>
                <th className="py-2 pr-3">Subjek</th>
                <th className="py-2 pr-3">Jenis</th>
                <th className="py-2 pr-3 text-right">Skor</th>
                <th className="py-2 text-right">Keyakinan</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 whitespace-nowrap text-gray-500">{formatTanggal(s.scoredAt)}</td>
                  <td className="max-w-80 truncate py-2 pr-3">
                    {s.igPost?.hook ?? s.contentIdea?.title ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-xs text-gray-500">{s.igPost ? "Post tayang" : "Ide"}</td>
                  <td className="py-2 pr-3 text-right text-lg font-black">{s.compositeScore}</td>
                  <td className="py-2 text-right text-xs text-gray-500">{s.confidenceLabel.toLowerCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
