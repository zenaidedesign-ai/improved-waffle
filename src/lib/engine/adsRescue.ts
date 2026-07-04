// Meta Ads Rescue — rantai biaya, diagnosa berlapis, dan mesin vonis.
// Kebenaran diambil dari data lead nyata (baris Lead atau isian manual),
// BUKAN dari angka "hasil" Ads Manager (resultsPlatform hanya pembanding).

import { CONFIG } from "../domain/config";
import type { LapisanMasalah, StatusLampu } from "../domain/enums";
import { gateLock } from "./gates";
import type { CostChain, VerdictProposal } from "./types";

export interface CampaignFunnelInput {
  spendRibu: number;
  impressions: number | null;
  clicks: number | null;
  resultsPlatform: number | null;
  chats: number; // max(baris Lead, manual)
  qualifiedLeads: number;
  surveys: number;
  pipelineValueJuta: number;
}

function div(a: number, b: number): number | null {
  return b > 0 ? Math.round((a / b) * 10) / 10 : null;
}

export function computeCostChain(f: CampaignFunnelInput): CostChain {
  const ctrPct =
    f.clicks != null && f.impressions != null && f.impressions > 0
      ? Math.round((f.clicks / f.impressions) * 1000) / 10
      : null;
  return {
    spendRibu: f.spendRibu,
    impressions: f.impressions,
    clicks: f.clicks,
    ctrPct,
    chats: f.chats,
    costPerChatRibu: div(f.spendRibu, f.chats),
    qualifiedLeads: f.qualifiedLeads,
    cpqlRibu: div(f.spendRibu, f.qualifiedLeads),
    qualRatePct: f.chats > 0 ? Math.round((f.qualifiedLeads / f.chats) * 100) : null,
    surveys: f.surveys,
    costPerSurveyRibu: div(f.spendRibu, f.surveys),
    pipelineValueJuta: f.pipelineValueJuta,
    resultsPlatform: f.resultsPlatform,
  };
}

export function dataSufficientForVerdict(chain: CostChain, targetCpqlRibu: number): boolean {
  return (
    chain.spendRibu >= CONFIG.adsMinSpendMultiple * targetCpqlRibu ||
    chain.chats >= CONFIG.adsMinChats
  );
}

export interface LayerDiagnosis {
  layer: LapisanMasalah;
  explanation: string;
}

/**
 * Pohon keputusan berlapis, urut dari fondasi: lapisan pertama yang gagal
 * adalah masalahnya. "Iterate" selalu spesifik, bukan "coba-coba lagi".
 */
export function diagnoseLayer(
  chain: CostChain,
  gate0: StatusLampu | null,
  gate1: StatusLampu | null,
): LayerDiagnosis {
  if (gate0 === null || gate0 === "MERAH")
    return { layer: "AKUN", explanation: "Fondasi akun bermasalah atau belum diaudit — perbaiki dulu sebelum menilai lapisan lain." };
  if (gate1 === null || gate1 === "MERAH")
    return { layer: "TRACKING", explanation: "Tracking belum bisa dipercaya — angka di bawahnya adalah tebakan." };

  // Delivery: uang keluar tapi tayangan nyaris nol.
  if (chain.spendRibu > 0 && (chain.impressions ?? 0) < 100 && chain.impressions != null)
    return { layer: "DELIVERY", explanation: "Spend berjalan tapi tayangan nyaris nol — indikasi masalah penayangan/pembatasan." };

  // Kreatif: CTR rendah → orang tidak berhenti di iklan.
  if (chain.ctrPct != null && chain.ctrPct < CONFIG.adsLowCtrPct)
    return { layer: "KREATIF", explanation: `CTR ${chain.ctrPct}% di bawah ${CONFIG.adsLowCtrPct}% — hook/kreatif tidak menghentikan scroll.` };

  // Jebakan chat murah: banyak chat, kualifikasi rendah → penawaran/audiens salah.
  if (
    chain.chats >= CONFIG.adsCheapChatMinChats &&
    chain.qualRatePct != null &&
    chain.qualRatePct < CONFIG.adsCheapChatQualRatePct
  )
    return {
      layer: "PENAWARAN_AUDIENS",
      explanation: `JEBAKAN CHAT MURAH: ${chain.chats} chat tapi hanya ${chain.qualRatePct}% berkualitas (ambang ${CONFIG.adsCheapChatQualRatePct}%). Penawaran menarik orang yang salah, atau audiens terlalu lebar.`,
    };

  // CTA/friksi: klik sehat tapi chat sedikit.
  if (chain.ctrPct != null && chain.ctrPct >= CONFIG.adsLowCtrPct && chain.chats < 3 && (chain.clicks ?? 0) >= 30)
    return { layer: "CTA_FRIKSI", explanation: "Klik sehat tapi nyaris tak ada yang mulai chat — CTA lemah atau langkah menuju WA berbelit." };

  // WA flow: chat ada, tidak ada yang mencapai kualifikasi & tidak kena jebakan chat murah.
  if (chain.chats >= 3 && chain.qualifiedLeads === 0)
    return { layer: "WA_FLOW", explanation: "Chat masuk tapi tidak ada yang mencapai status berkualitas — periksa skrip pembuka dan alur kualifikasi WA." };

  // Follow-up: lead berkualitas ada tapi tidak bergerak ke survei.
  if (chain.qualifiedLeads >= 2 && chain.surveys === 0)
    return { layer: "FOLLOW_UP", explanation: "Lead berkualitas ada tapi belum ada yang jadi survei — masalah kecepatan/disiplin follow-up." };

  return { layer: "TIDAK_ADA", explanation: "Tidak ada lapisan masalah dominan yang terdeteksi." };
}

/** Vonis kampanye. Wajib melewati gateLock; data tipis ⇒ TAHAN. */
export function decideCampaign(
  chain: CostChain,
  gate0: StatusLampu | null,
  gate1: StatusLampu | null,
  targetCpqlRibu: number = CONFIG.adsTargetCpqlRibu,
): VerdictProposal {
  const lock = gateLock(gate0, gate1);
  if (lock.locked) return lock.lockVerdict!;

  if (!dataSufficientForVerdict(chain, targetCpqlRibu)) {
    return {
      decision: "TAHAN_DATA_BELUM_CUKUP",
      ruleFired: "ADS_DATA_TIPIS",
      trigger: { spendRibu: chain.spendRibu, chats: chain.chats, minSpendRibu: CONFIG.adsMinSpendMultiple * targetCpqlRibu, minChats: CONFIG.adsMinChats },
      confidence: "TINGGI",
      explanation: `Belum ada vonis: spend Rp ${chain.spendRibu} rb / ${chain.chats} chat masih di bawah ambang data (Rp ${CONFIG.adsMinSpendMultiple * targetCpqlRibu} rb atau ${CONFIG.adsMinChats} chat). Sistem tidak menebak di data tipis.`,
    };
  }

  const diag = diagnoseLayer(chain, gate0, gate1);

  // KILL: spend ≥ 3× target CPQL dan nol lead berkualitas.
  if (chain.spendRibu >= CONFIG.adsMinSpendMultiple * targetCpqlRibu && chain.qualifiedLeads === 0) {
    return {
      decision: "KILL_KAMPANYE",
      ruleFired: "ADS_KILL_ZERO_QUALIFIED",
      trigger: { spendRibu: chain.spendRibu, qualifiedLeads: 0, targetCpqlRibu },
      confidence: "TINGGI",
      explanation: `Spend Rp ${chain.spendRibu} rb (≥ 3× target CPQL) tanpa satu pun lead berkualitas. Matikan; masalah di lapisan: ${diag.explanation}`,
    };
  }

  // SCALE: CPQL ≤ target, ≥ 3 lead berkualitas, ada gerak ke survei.
  if (
    chain.cpqlRibu != null &&
    chain.cpqlRibu <= targetCpqlRibu &&
    chain.qualifiedLeads >= 3 &&
    chain.surveys >= 1
  ) {
    return {
      decision: "SCALE_KAMPANYE",
      ruleFired: "ADS_SCALE_CPQL_TARGET",
      trigger: { cpqlRibu: chain.cpqlRibu, targetCpqlRibu, qualifiedLeads: chain.qualifiedLeads, surveys: chain.surveys },
      confidence: chain.qualifiedLeads >= 5 ? "TINGGI" : "SEDANG",
      explanation: `CPQL Rp ${chain.cpqlRibu} rb ≤ target Rp ${targetCpqlRibu} rb dengan ${chain.qualifiedLeads} lead berkualitas dan ${chain.surveys} survei. Naikkan budget bertahap +${CONFIG.adsScaleStepPct}% — jangan digandakan.`,
    };
  }

  // ITERATE spesifik berdasar lapisan masalah.
  if (diag.layer === "KREATIF") {
    return {
      decision: "PERBAIKI_KREATIF",
      ruleFired: "ADS_ITERATE_KREATIF",
      trigger: { ctrPct: chain.ctrPct },
      confidence: "SEDANG",
      explanation: diag.explanation,
    };
  }
  if (diag.layer === "PENAWARAN_AUDIENS") {
    return {
      decision: "GANTI_PENAWARAN",
      ruleFired: "ADS_CHEAP_CHAT_TRAP",
      trigger: { chats: chain.chats, qualRatePct: chain.qualRatePct },
      confidence: "TINGGI",
      explanation: diag.explanation,
    };
  }
  if (diag.layer === "CTA_FRIKSI") {
    return {
      decision: "GANTI_CTA",
      ruleFired: "ADS_ITERATE_CTA",
      trigger: { ctrPct: chain.ctrPct, chats: chain.chats, clicks: chain.clicks },
      confidence: "SEDANG",
      explanation: diag.explanation,
    };
  }
  if (diag.layer === "WA_FLOW" || diag.layer === "FOLLOW_UP") {
    return {
      decision: "ITERATE_KAMPANYE",
      ruleFired: diag.layer === "WA_FLOW" ? "ADS_ITERATE_WA_FLOW" : "ADS_ITERATE_FOLLOW_UP",
      trigger: { chats: chain.chats, qualifiedLeads: chain.qualifiedLeads, surveys: chain.surveys },
      confidence: "SEDANG",
      explanation: diag.explanation + " Kampanye tidak dimatikan — masalahnya di alur setelah iklan.",
    };
  }

  // HOLD: CPQL 1–2× target — beri satu siklus lagi.
  if (chain.cpqlRibu != null && chain.cpqlRibu <= 2 * targetCpqlRibu) {
    return {
      decision: "HOLD_KAMPANYE",
      ruleFired: "ADS_HOLD_CPQL_NEAR",
      trigger: { cpqlRibu: chain.cpqlRibu, targetCpqlRibu },
      confidence: "SEDANG",
      explanation: `CPQL Rp ${chain.cpqlRibu} rb masih 1–2× target. Tahan satu siklus evaluasi lagi sebelum keputusan besar.`,
    };
  }

  // Sisa: mahal tapi tidak nol — iterate umum dengan lapisan tercatat.
  return {
    decision: "ITERATE_KAMPANYE",
    ruleFired: "ADS_ITERATE_CPQL_MAHAL",
    trigger: { cpqlRibu: chain.cpqlRibu, targetCpqlRibu, layer: diag.layer },
    confidence: "SEDANG",
    explanation: `CPQL Rp ${chain.cpqlRibu ?? "—"} rb > 2× target. Perbaiki lapisan: ${diag.explanation}`,
  };
}
