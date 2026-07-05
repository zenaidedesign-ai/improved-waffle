"use client";

// Input berbantuan screenshot: gambar tampil di samping form, owner
// mentranskrip angkanya. Data tersimpan dengan sumber SCREENSHOT
// (keandalan 60–85%, wajib verifikasi sebelum keputusan budget).
// JUJUR: tidak ada OCR otomatis di fase ini — gambar hanya alat bantu baca,
// tidak diunggah ke mana pun (tetap di browser).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCampaignMetric } from "@/actions/campaign";
import { upsertSnapshot } from "@/actions/igPost";
import { weekStartOf } from "@/lib/engine/warRoom";

const input = "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm";
const label = "mb-0.5 block text-[11px] font-semibold text-gray-500";

export function ScreenshotEntry({ campaigns }: { campaigns: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [target, setTarget] = useState<"SNAPSHOT" | "ADS">("SNAPSHOT");
  const [snap, setSnap] = useState({ weekStart: weekStartOf(new Date()).toISOString().slice(0, 10), followerCount: "", reachTotal: "", reachNonFollowerPct: "", profileVisits: "" });
  const [ads, setAds] = useState({ campaignId: campaigns[0]?.id ?? "", date: new Date().toISOString().slice(0, 10), spendRibu: "", impressions: "", clicks: "", resultsPlatform: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Unggah screenshot IG Insights / Ads Manager sebagai <b>alat bantu baca</b> — gambar tetap di
        browser Anda, tidak disimpan. Angka yang Anda transkrip tercatat sebagai{" "}
        <b>sumber SCREENSHOT (keandalan 60–85%)</b> dan sistem akan menagih verifikasi sebelum
        keputusan budget. Ekstraksi otomatis (OCR) belum diaktifkan — sistem tidak berpura-pura bisa.
      </p>

      <label className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 hover:bg-gray-50">
        {imgUrl ? "Ganti screenshot" : "Pilih screenshot (PNG/JPG)"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setImgUrl(URL.createObjectURL(f));
          }}
        />
      </label>

      {imgUrl && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt="Screenshot untuk ditranskrip" className="max-h-96 w-full rounded-lg border border-gray-200 object-contain" />
          <div>
            <div className="mb-2 flex gap-2">
              {(["SNAPSHOT", "ADS"] as const).map((t) => (
                <button key={t} onClick={() => setTarget(t)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${target === t ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-600"}`}>
                  {t === "SNAPSHOT" ? "Snapshot IG mingguan" : "Metrik iklan harian"}
                </button>
              ))}
            </div>

            {target === "SNAPSHOT" ? (
              <div className="grid grid-cols-2 gap-2">
                <div><label className={label}>Minggu mulai</label><input type="date" className={input} value={snap.weekStart} onChange={(e) => setSnap((s) => ({ ...s, weekStart: e.target.value }))} /></div>
                {([["followerCount", "Followers"], ["reachTotal", "Reach"], ["reachNonFollowerPct", "% non-follower"], ["profileVisits", "Kunjungan profil"]] as const).map(([k, l]) => (
                  <div key={k}><label className={label}>{l}</label><input type="number" min={0} className={input} value={snap[k]} onChange={(e) => setSnap((s) => ({ ...s, [k]: e.target.value }))} /></div>
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada kampanye — buat dulu di Ads Intelligence.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2"><label className={label}>Kampanye</label>
                  <select className={input} value={ads.campaignId} onChange={(e) => setAds((s) => ({ ...s, campaignId: e.target.value }))}>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><label className={label}>Tanggal</label><input type="date" className={input} value={ads.date} onChange={(e) => setAds((s) => ({ ...s, date: e.target.value }))} /></div>
                {([["spendRibu", "Spend (ribu)"], ["impressions", "Impresi"], ["clicks", "Klik"], ["resultsPlatform", "“Hasil” platform"]] as const).map(([k, l]) => (
                  <div key={k}><label className={label}>{l}</label><input type="number" min={0} className={input} value={ads[k]} onChange={(e) => setAds((s) => ({ ...s, [k]: e.target.value }))} /></div>
                ))}
              </div>
            )}

            {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
            {msg && <p className="mt-2 text-sm font-semibold text-emerald-700">{msg}</p>}
            <button
              disabled={pending || (target === "ADS" && !ads.campaignId) || (target === "ADS" && !ads.spendRibu)}
              onClick={() => {
                setError(null); setMsg(null);
                startTransition(async () => {
                  try {
                    if (target === "SNAPSHOT") {
                      await upsertSnapshot({
                        weekStart: weekStartOf(new Date(snap.weekStart)),
                        followerCount: snap.followerCount, reachTotal: snap.reachTotal,
                        reachNonFollowerPct: snap.reachNonFollowerPct, profileVisits: snap.profileVisits,
                        recommendationStatus: "BELUM_DICEK", dataSource: "SCREENSHOT",
                      });
                    } else {
                      await addCampaignMetric({ ...ads, date: new Date(ads.date), dataSource: "SCREENSHOT" });
                    }
                    setMsg("Tersimpan sebagai sumber SCREENSHOT — verifikasi sebelum keputusan budget.");
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Gagal menyimpan.");
                  }
                });
              }}
              className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {pending ? "Menyimpan…" : "Simpan transkrip (sumber: SCREENSHOT)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
