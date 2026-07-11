// Pilot Data Nyata 14 Hari — layar status + checklist harian/mingguan.
// Semua kemajuan dihitung HANYA dari data nyata (data contoh tidak dihitung).

import Link from "next/link";
import { startPilot } from "@/actions/pilot";
import { Card, PageHeader, SensitiveDataNotice } from "@/components/ui";
import { formatTanggal } from "@/lib/format";
import { getPhaseBGate } from "@/lib/pilotGate";

export const dynamic = "force-dynamic";

export default async function PilotPage() {
  // SATU sumber hitungan: getPhaseBGate. Halaman ini hanya menampilkan.
  const { gate, day, progress, counts, startedAt } = await getPhaseBGate(new Date());
  const { exampleLeads } = counts;

  const day1Items: Array<{ label: string; done: boolean; href: string }> = [
    { label: "Jalankan ketiga audit (Akun Meta, Rekomendasi, Tracking) dengan jawaban NYATA", done: counts.auditTypesRun >= 3, href: "/audit/meta-account" },
    { label: "Input lead 7 hari terakhir dari WhatsApp (semua chat masuk = satu baris)", done: counts.realLeads >= 1, href: "/leads/baru" },
    { label: "Impor satu CSV Ads Manager nyata (kalau iklan berjalan)", done: counts.adsCsvBatches >= 1, href: "/impor" },
    { label: "Input 5 post Instagram terakhir + angka dari IG Insights", done: counts.realPosts >= 5, href: "/instagram/post/baru" },
    { label: "Buka Laporan Revenue pertama (War Room) & baca vonisnya", done: counts.realWarRooms >= 1, href: "/laporan" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Pilot Data Nyata — 14 Hari"
        subtitle="Tujuan pilot: membuktikan sistem dengan data Zenaide sungguhan, lalu menyetel ambang di hari ke-14. Data contoh TIDAK dihitung sebagai kemajuan. Runbook lengkap: docs/PILOT-RUNBOOK.md"
      />

      <SensitiveDataNotice />

      {gate.locked && (
        <div className="mb-6 rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <div className="text-sm font-black text-red-800">🔒 PILOT LEARNING MODE — sistem dikunci dari pembangunan lanjutan</div>
          <p className="mt-1 text-sm text-red-700">{gate.lockMessage}</p>
          <p className="mt-1 text-xs text-red-500">
            Yang boleh selama pilot: input data nyata, catat learning [PILOT] (dengan falsifier), catat bukti
            di ledger Knowledge. Yang TIDAK boleh: menaikkan belief ke Terbukti tanpa bukti berulang,
            mengubah threshold di config, membangun Fase B / modul baru / API.
          </p>
        </div>
      )}

      {exampleLeads > 0 && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Data contoh masih terpasang. Boleh dibiarkan untuk belajar, tapi disarankan{" "}
          <Link href="/" className="underline font-semibold">hapus data contoh</Link> sebelum pilot
          supaya layar hanya berisi kenyataan.
        </div>
      )}

      <Card className="mb-6 border-2 border-gray-900">
        {!day.started ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-700">
              Pilot belum dimulai. Menekan tombol ini hanya menandai hari-1 — tidak mengubah data apa pun.
            </p>
            <form action={startPilot}>
              <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700">
                🚀 Mulai pilot hari ini
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <span className="text-3xl font-black">Hari ke-{day.day}</span>
              <span className="text-sm text-gray-500"> / 14 · mulai {formatTanggal(startedAt!)}</span>
            </div>
            <span className="text-sm font-semibold text-gray-600">
              {day.phase === "HARI_1" && "Fokus hari ini: checklist Hari 1 di bawah."}
              {day.phase === "HARIAN" && "Fokus: rutinitas harian (±10 menit) + mingguan tiap Senin."}
              {day.phase === "HARI_14" && "HARI TUNING — kerjakan bagian Hari 14 di bawah."}
              {day.phase === "SELESAI" && "Pilot selesai — kerjakan Hari 14 kalau belum, lalu putuskan GO."}
            </span>
          </div>
        )}
      </Card>

      <Card title={`Kriteria sukses pilot (${progress.metCount}/${progress.totalAuto} terukur terpenuhi)`} className="mb-6">
        <ul className="space-y-1.5 text-sm">
          {progress.criteria.map((c) => (
            <li key={c.key} className="flex items-start gap-2">
              <span className={c.met ? "text-emerald-600" : "text-gray-300"}>{c.met ? "✅" : "⬜"}</span>
              <span>
                {c.label}{" "}
                <b>
                  {c.manual ? "(dinilai Noor di hari 14)" : `${c.actual}/${c.target}`}
                </b>
                {c.note && <span className="block text-xs text-gray-400">{c.note}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-gray-400">
          Dua kriteria terakhir sengaja tidak bisa dicentang sistem — kejujuran penilaian ada di Noor.
        </p>
      </Card>

      <Card
        title={`Gerbang Fase B (${gate.autoMet}/${gate.totalAuto} syarat terukur + hari ${gate.daysDone ? "✅" : "⬜"})`}
        className="mb-6 border-2 border-red-200"
      >
        <p className="mb-2 text-xs text-gray-500">
          Fase B = skoring & lifecycle belief otomatis. Gerbang ini yang menahannya: semua syarat di bawah
          harus terpenuhi DAN pilot berjalan penuh 14 hari. Tidak ada jalan pintas — sistem yang belum
          melihat data nyata tidak berhak menilai belief secara otomatis.
        </p>
        <ul className="space-y-1.5 text-sm">
          {gate.conditions.map((c) => (
            <li key={c.key} className="flex items-start gap-2">
              <span className={c.met ? "text-emerald-600" : "text-gray-300"}>{c.met ? "✅" : "⬜"}</span>
              <span>
                {c.label}{" "}
                <b>{c.manual ? "(dinilai Noor di hari 14)" : `${c.actual}/${c.target}`}</b>
                {c.note && <span className="block text-xs text-gray-400">{c.note}</span>}
              </span>
            </li>
          ))}
        </ul>
        {!gate.locked && (
          <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">
            Semua syarat terukur terpenuhi & 14 hari selesai. Sisa keputusan ada di Noor: kalau syarat
            manual juga beres, minta Fase B secara eksplisit.
          </p>
        )}
      </Card>

      <Card title="Hari 1 — fondasi (60–90 menit)" className="mb-6">
        <ul className="space-y-1.5 text-sm">
          {day1Items.map((it) => (
            <li key={it.label} className="flex items-start gap-2">
              <span className={it.done ? "text-emerald-600" : "text-gray-300"}>{it.done ? "✅" : "⬜"}</span>
              <Link href={it.href} className="underline-offset-2 hover:underline">{it.label}</Link>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="Rutinitas HARIAN (hari 2–13, ±10 menit)">
          <ol className="list-inside list-decimal space-y-1.5 text-sm text-gray-700">
            <li><Link className="underline" href="/leads/baru">Catat SEMUA chat WA baru sebagai lead</Link> — sumber + 5 sinyal + estimasi nilai.</li>
            <li><Link className="underline" href="/leads">Buka antrian follow-up</Link> — kerjakan yang 👑/urgen, klik “✓ Sudah di-follow-up”.</li>
            <li>Update status lead yang bergerak (survei/proposal/closing) di halaman leadnya.</li>
            <li><Link className="underline" href="/instagram/post/baru">Catat post yang tayang hari ini</Link>; lengkapi angka post lama di usia 24 jam / 48 jam / 7 hari (edit dari log konten).</li>
            <li>Kalau iklan jalan: <Link className="underline" href="/kampanye">tambah spend harian</Link> + update corong manual dari log WA.</li>
            <li>Lirik <Link className="underline" href="/">Top 5 Prioritas</Link> — kerjakan #1.</li>
          </ol>
        </Card>
        <Card title="Rutinitas MINGGUAN (tiap Senin, ±30 menit)">
          <ol className="list-inside list-decimal space-y-1.5 text-sm text-gray-700">
            <li><Link className="underline" href="/instagram">Isi snapshot IG mingguan</Link> (reach, % non-follower, status rekomendasi).</li>
            <li><Link className="underline" href="/impor">Impor CSV Ads Manager minggu lalu</Link> (atau input manual kalau ekspor tidak tersedia).</li>
            <li><Link className="underline" href="/kompetitor">Perbarui 1 battle card kompetitor</Link> dari pengamatan publik.</li>
            <li><Link className="underline" href="/laporan">Baca Revenue War Room</Link>, lalu <Link className="underline" href="/war-room">komit ≤ 5 keputusan</Link>.</li>
            <li>
              Catat ketidaksetujuan/konfirmasi di{" "}
              <Link className="underline" href="/knowledge">Pustaka Pelajaran</Link> — centang
              <b> “Catatan pilot”</b> di form (prefix <code>[PILOT]</code> terpasang otomatis).
            </li>
            <li><Link className="underline" href="/impor">Ekspor CSV cadangan</Link>.</li>
          </ol>
        </Card>
      </div>

      <Card title="Hari 14 — tuning ambang (60 menit, bersama sistem)">
        <ol className="list-inside list-decimal space-y-1.5 text-sm text-gray-700">
          <li>Buka <Link className="underline" href="/leads">semua lead</Link>: hitung berapa label triase yang Noor setujui vs tidak → tulis persentase di learning <code>[PILOT]</code> terakhir. Target ≥ 80%.</li>
          <li>Untuk tiap label yang salah: catat SINYAL mana yang menyesatkan (budget? urgensi? ambang skor 60?).</li>
          <li>Buka <Link className="underline" href="/kampanye">vonis kampanye</Link>: adakah vonis yang tidak bisa dijelaskan ke orang lain dalam 1 kalimat? Catat.</li>
          <li>Buka <Link className="underline" href="/instagram">Diagnosa</Link> + <Link className="underline" href="/instagram/coach">Pelatih</Link>: pola konten mana yang cocok/tidak cocok dengan kenyataan?</li>
          <li>Cek kriteria manual: adakah lead serius yang TERLUPAKAN? Apakah lead sampah tersaring?</li>
          <li>
            Usulkan ambang baru (target CPQL, skor lead ≥ 60, rasio kualifikasi 30%, p80 pemenang) —
            semua ambang aktif tercantum di <code>src/lib/domain/config.ts</code> dengan alasannya.
            Serahkan daftar perubahan yang diinginkan, dan ambang akan disetel dalam satu perubahan
            ber-review, bukan diedit diam-diam.
          </li>
        </ol>
      </Card>
    </div>
  );
}
