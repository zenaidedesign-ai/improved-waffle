// Layar login — satu-satunya halaman di luar pagar middleware.
// Mode tanpa login (env belum di-set) dikatakan terang-terangan, bukan disembunyikan.

import { login } from "@/actions/auth";
import { authConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-black tracking-tight">ZENAIDE</div>
        <div className="mb-4 text-xs text-gray-500">Revenue Engine — akses owner</div>

        {!authConfigured() ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <b>Login belum dikonfigurasi.</b> Aplikasi saat ini berjalan TANPA gerbang password —
            siapa pun yang membukanya punya akses penuh. Set password owner dulu:
            <code className="mt-1 block rounded bg-red-100 px-1.5 py-1 text-xs">
              node scripts/set-owner-password.mjs &quot;PasswordAnda&quot;
            </code>
            lalu salin dua baris hasilnya ke file <code>.env.local</code> dan restart aplikasi.
            Panduan: <code>docs/AUTH-READINESS.md</code>. Selama belum di-set: deployment HOLD.
          </div>
        ) : (
          <>
            {error === "salah" && (
              <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
                Password salah. 5 kali salah berturut akan menjeda login 15 menit.
              </p>
            )}
            {error === "terkunci" && (
              <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
                Terlalu banyak percobaan salah — coba lagi setelah 15 menit.
              </p>
            )}
            <form action={login} className="space-y-3">
              {next && <input type="hidden" name="next" value={next} />}
              <input
                type="password"
                name="password"
                required
                autoFocus
                placeholder="Password owner"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700">
                Masuk
              </button>
            </form>
            <p className="mt-3 text-xs text-gray-400">
              Sesi berlaku 7 hari di browser ini. Keluar lewat tombol “Keluar” di menu samping.
              Jangan login di perangkat yang bukan milik Anda.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
