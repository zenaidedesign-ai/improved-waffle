// Data contoh — semua baris isExample:true dan berawalan [CONTOH].
// Sengaja dibuat "sakit" supaya diagnosa terlihat bekerja:
// - audit akun punya satu item blocking MERAH (gerbang terkunci, bisa didemonstrasikan)
// - konten berat portofolio (analisis campuran menyala)
// - satu kampanye kena jebakan chat murah
// Dibuat relatif terhadap "hari ini" saat dimuat.

import { weekStartOf } from "../engine/warRoom";

const DAY = 24 * 3600 * 1000;

export function buildSeed(now: Date) {
  const d = (daysAgo: number, hour = 10) => {
    const x = new Date(now.getTime() - daysAgo * DAY);
    x.setHours(hour, 0, 0, 0);
    return x;
  };
  const thisWeek = weekStartOf(now);
  const weeksAgo = (n: number) => new Date(thisWeek.getTime() - n * 7 * DAY);

  const metaAuditAnswers = [
    { itemKey: "A1", status: "HIJAU", isBlocking: true, answerText: "Aktif" },
    { itemKey: "A2", status: "HIJAU", isBlocking: true, answerText: "BM Zenaide" },
    {
      itemKey: "A3",
      status: "MERAH",
      isBlocking: true,
      answerText: "[CONTOH] Page lama dibuat dari akun FB yang pernah dinonaktifkan; masih tercantum sebagai pemilik.",
    },
    { itemKey: "A4", status: "KUNING", isBlocking: true, answerText: "Ada 1 peringatan lama" },
    { itemKey: "A5", status: "HIJAU", isBlocking: true, answerText: null },
    { itemKey: "A6", status: "HIJAU", isBlocking: true, answerText: null },
    { itemKey: "A7", status: "KUNING", isBlocking: false, answerText: "Pixel dibuat agency lama" },
    { itemKey: "A8", status: "KUNING", isBlocking: false, answerText: "Tidak pakai landing page" },
    { itemKey: "A9", status: "HIJAU", isBlocking: false, answerText: null },
    { itemKey: "A10", status: "MERAH", isBlocking: false, answerText: "Hanya 1 admin" },
    { itemKey: "A11", status: "HIJAU", isBlocking: true, answerText: null },
    { itemKey: "A12", status: "BELUM_DICEK", isBlocking: true, answerText: null },
    { itemKey: "A13", status: "KUNING", isBlocking: false, answerText: null },
  ] as const;

  const rekomendasiAnswers = [
    { itemKey: "R1", status: "HIJAU", isBlocking: true, answerText: "Kosong" },
    { itemKey: "R2", status: "HIJAU", isBlocking: true, answerText: null },
    { itemKey: "R3", status: "HIJAU", isBlocking: false, answerText: null },
    { itemKey: "R4", status: "KUNING", isBlocking: false, answerText: "3 reels lama ada watermark" },
    { itemKey: "R5", status: "HIJAU", isBlocking: false, answerText: null },
    { itemKey: "R6", status: "HIJAU", isBlocking: false, answerText: null },
  ] as const;

  const trackingAnswers = [
    { itemKey: "T1", status: "KUNING", isBlocking: true, answerText: "Kadang ditanya sumber, tidak selalu" },
    { itemKey: "T2", status: "HIJAU", isBlocking: true, answerText: "Dicatat di spreadsheet" },
    { itemKey: "T3", status: "HIJAU", isBlocking: true, answerText: "Pakai definisi default sistem" },
    { itemKey: "T4", status: "KUNING", isBlocking: false, answerText: "Belum pernah dicocokkan" },
    { itemKey: "T5", status: "HIJAU", isBlocking: false, answerText: "Tidak pakai landing page" },
  ] as const;

  // 12 post, 6 minggu — 8 dari 12 (67%) portofolio ⇒ terlalu berat portofolio.
  const posts = [
    { postedAt: d(40), format: "CAROUSEL", pillar: "PORTFOLIO_LAIN", hook: "[CONTOH] Hasil akhir apartemen Pakuwon 2BR", reach: 2100, reachNonFollower: 260, likes: 95, comments: 4, saves: 12, shares: 3, profileVisits: 18, follows: 2, waClicks: 0, leadsManual: 0, qualifiedLeadsManual: 0 },
    { postedAt: d(36), format: "FOTO", pillar: "PORTFOLIO_LAIN", hook: "[CONTOH] Detail kitchen set walnut", reach: 1500, reachNonFollower: 140, likes: 70, comments: 2, saves: 8, shares: 1, profileVisits: 9, follows: 1, waClicks: 0, leadsManual: 0, qualifiedLeadsManual: 0 },
    { postedAt: d(33), format: "REELS", pillar: "BEFORE_AFTER", hook: "[CONTOH] Ruko kosong jadi kantor estetik 3 minggu", reach: 8200, reachNonFollower: 5600, plays: 9100, likes: 410, comments: 22, saves: 130, shares: 85, profileVisits: 160, follows: 25, waClicks: 12, leadsManual: 3, qualifiedLeadsManual: 1 },
    { postedAt: d(30), format: "CAROUSEL", pillar: "PORTFOLIO_LAIN", hook: "[CONTOH] Master bedroom japandi", reach: 1900, reachNonFollower: 210, likes: 88, comments: 3, saves: 15, shares: 2, profileVisits: 12, follows: 1, waClicks: 1, leadsManual: 0, qualifiedLeadsManual: 0 },
    { postedAt: d(27), format: "REELS", pillar: "PORTFOLIO_LAIN", hook: "[CONTOH] Room tour hasil serah terima", reach: 3400, reachNonFollower: 1500, plays: 3900, likes: 150, comments: 8, saves: 30, shares: 12, profileVisits: 40, follows: 6, waClicks: 2, leadsManual: 1, qualifiedLeadsManual: 0 },
    { postedAt: d(24), format: "CAROUSEL", pillar: "BUDGET_EDUKASI", hook: "[CONTOH] Interior 2BR mulai dari berapa? Rincian jujur", reach: 6800, reachNonFollower: 4200, likes: 320, comments: 35, saves: 260, shares: 95, profileVisits: 140, follows: 30, waClicks: 18, leadsManual: 4, qualifiedLeadsManual: 2 },
    { postedAt: d(21), format: "FOTO", pillar: "PORTFOLIO_LAIN", hook: "[CONTOH] Living room natural light", reach: 1400, reachNonFollower: 120, likes: 65, comments: 1, saves: 6, shares: 1, profileVisits: 7, follows: 0, waClicks: 0, leadsManual: 0, qualifiedLeadsManual: 0 },
    { postedAt: d(17), format: "REELS", pillar: "BEFORE_AFTER", hook: "[CONTOH] Dapur sempit 2x2 jadi lega — ini triknya", reach: 5100, reachNonFollower: 3100, plays: 5800, likes: 240, comments: 15, saves: 95, shares: 40, profileVisits: 85, follows: 12, waClicks: 6, leadsManual: 2, qualifiedLeadsManual: 1 },
    { postedAt: d(13), format: "CAROUSEL", pillar: "PORTFOLIO_LAIN", hook: "[CONTOH] Kids room custom", reach: 1600, reachNonFollower: 170, likes: 74, comments: 2, saves: 9, shares: 2, profileVisits: 10, follows: 1, waClicks: 0, leadsManual: 0, qualifiedLeadsManual: 0 },
    { postedAt: d(10), format: "REELS", pillar: "PORTFOLIO_LAIN", hook: "[CONTOH] Timelapse pemasangan wall panel", reach: 2800, reachNonFollower: 1200, plays: 3100, likes: 130, comments: 5, saves: 22, shares: 9, profileVisits: 25, follows: 3, waClicks: 1, leadsManual: 0, qualifiedLeadsManual: 0 },
    { postedAt: d(6), format: "REELS", pillar: "PAIN_BASED", hook: "[CONTOH] Renovasi molor 6 bulan? Ini 3 penyebabnya", reach: 4700, reachNonFollower: 3300, plays: 5200, likes: 210, comments: 28, saves: 110, shares: 55, profileVisits: 95, follows: 15, waClicks: 9, leadsManual: 2, qualifiedLeadsManual: 1 },
    { postedAt: d(3), format: "FOTO", pillar: "PORTFOLIO_LAIN", hook: "[CONTOH] Detail lighting koridor", reach: 1200, reachNonFollower: 100, likes: 58, comments: 1, saves: 5, shares: 0, profileVisits: 6, follows: 0, waClicks: 0, leadsManual: 0, qualifiedLeadsManual: 0 },
  ];

  const snapshots = [
    { weekStart: weeksAgo(4), followerCount: 12400, reachTotal: 9800, reachNonFollowerPct: 18, profileVisits: 240, recommendationStatus: "LAYAK" },
    { weekStart: weeksAgo(3), followerCount: 12450, reachTotal: 11200, reachNonFollowerPct: 24, profileVisits: 310, recommendationStatus: "LAYAK" },
    { weekStart: weeksAgo(2), followerCount: 12480, reachTotal: 10400, reachNonFollowerPct: 22, profileVisits: 280, recommendationStatus: "LAYAK" },
    { weekStart: weeksAgo(1), followerCount: 12530, reachTotal: 12900, reachNonFollowerPct: 29, profileVisits: 350, recommendationStatus: "LAYAK" },
  ];

  // Kampanye 1: jebakan chat murah. Kampanye 2: sehat, kandidat scale.
  const campaigns = [
    {
      name: "[CONTOH] Promo Kitchen Set — Broad",
      objective: "CHAT_WA",
      status: "AKTIF",
      manualChats: 22,
      manualQualifiedLeads: 2,
      manualSurveys: 0,
      manualPipelineJuta: 60,
      notes: "Chat ramai tapi kebanyakan tanya harga termurah lalu hilang.",
      metrics: [
        { date: d(12), spendRibu: 350, impressions: 21000, clicks: 380, resultsPlatform: 9 },
        { date: d(9), spendRibu: 400, impressions: 24500, clicks: 410, resultsPlatform: 11 },
        { date: d(5), spendRibu: 450, impressions: 26800, clicks: 460, resultsPlatform: 12 },
      ],
    },
    {
      name: "[CONTOH] Interior 2BR Pakuwon — Lookalike",
      objective: "CHAT_WA",
      status: "AKTIF",
      manualChats: 11,
      manualQualifiedLeads: 4,
      manualSurveys: 2,
      manualPipelineJuta: 520,
      notes: null,
      metrics: [
        { date: d(11), spendRibu: 300, impressions: 9800, clicks: 190, resultsPlatform: 5 },
        { date: d(7), spendRibu: 350, impressions: 11400, clicks: 220, resultsPlatform: 6 },
        { date: d(4), spendRibu: 380, impressions: 12100, clicks: 240, resultsPlatform: 7 },
      ],
    },
  ];

  // Lead contoh minggu ini & minggu lalu — supaya War Room punya pembanding.
  const leads = [
    { name: "[CONTOH] Bu Sari — 2BR Pakuwon", sourceType: "ADS", status: "SURVEI_TERJADWAL", signalBudget: 18, signalProjectType: 16, signalLocation: 20, signalUrgency: 14, signalSeriousness: 16, qualAnswersCount: 5, estimatedValueJuta: 280, createdAt: d(2) },
    { name: "[CONTOH] Pak Hendra — ruko kantor", sourceType: "IG_ORGANIK", status: "BERKUALITAS", signalBudget: 14, signalProjectType: 18, signalLocation: 16, signalUrgency: 12, signalSeriousness: 14, qualAnswersCount: 4, estimatedValueJuta: 350, createdAt: d(3) },
    { name: "[CONTOH] Mbak Dina — tanya harga", sourceType: "ADS", status: "GHOSTING", signalBudget: 4, signalProjectType: 6, signalLocation: 12, signalUrgency: 2, signalSeriousness: 2, qualAnswersCount: 1, estimatedValueJuta: 0, createdAt: d(4) },
    { name: "[CONTOH] Pak Budi — kitchen set", sourceType: "ADS", status: "MERESPONS", signalBudget: 8, signalProjectType: 8, signalLocation: 14, signalUrgency: 6, signalSeriousness: 8, qualAnswersCount: 2, estimatedValueJuta: 45, createdAt: d(5) },
    { name: "[CONTOH] Bu Lina — rumah full interior", sourceType: "IG_ORGANIK", status: "PROPOSAL_TERKIRIM", signalBudget: 20, signalProjectType: 20, signalLocation: 18, signalUrgency: 16, signalSeriousness: 18, qualAnswersCount: 6, estimatedValueJuta: 650, createdAt: d(9) },
    { name: "[CONTOH] Pak Agus — apartemen studio", sourceType: "ADS", status: "SURVEI_SELESAI", signalBudget: 12, signalProjectType: 12, signalLocation: 20, signalUrgency: 14, signalSeriousness: 12, qualAnswersCount: 4, estimatedValueJuta: 120, createdAt: d(10) },
    { name: "[CONTOH] Mas Rio — tanya-tanya", sourceType: "LAINNYA", status: "CHAT_BARU", signalBudget: 2, signalProjectType: 4, signalLocation: 8, signalUrgency: 2, signalSeriousness: 4, qualAnswersCount: 0, estimatedValueJuta: 0, createdAt: d(11) },
  ];

  return {
    metaAuditAnswers,
    rekomendasiAnswers,
    trackingAnswers,
    posts,
    snapshots,
    campaigns,
    leads,
    auditDates: { meta: d(8), rekomendasi: d(8, 11), tracking: d(8, 12) },
  };
}
