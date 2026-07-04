const TZ = "Asia/Jakarta";

export function formatTanggal(d: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

export function formatTanggalJam(d: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

/** Nilai proyek dalam juta rupiah → "Rp 350 jt" / "Rp 1,2 M" */
export function formatJuta(juta: number): string {
  if (juta >= 1000) {
    const m = juta / 1000;
    return `Rp ${m.toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  }
  return `Rp ${juta.toLocaleString("id-ID")} jt`;
}

/** Spend iklan dalam ribu rupiah → "Rp 250 rb" / "Rp 1,5 jt" */
export function formatRibu(ribu: number): string {
  if (ribu >= 1000) {
    const jt = ribu / 1000;
    return `Rp ${jt.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }
  return `Rp ${ribu.toLocaleString("id-ID")} rb`;
}

export function formatPct(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toLocaleString("id-ID", { maximumFractionDigits: digits })}%`;
}

export function formatAngka(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("id-ID");
}
