-- Rename kolom: Lead.sourceType -> Lead.leadSource.
-- Alasan (audit kematangan): "sourceType" di Lead berarti SUMBER LEAD (ADS/IG_ORGANIK/...),
-- sedangkan "sourceType" di IgPost/CampaignMetricDaily/IgAccountSnapshot berarti SUMBER DATA
-- (MANUAL/CSV/...). Satu nama dua makna = jebakan. RENAME COLUMN mempertahankan semua data.
ALTER TABLE "Lead" RENAME COLUMN "sourceType" TO "leadSource";
