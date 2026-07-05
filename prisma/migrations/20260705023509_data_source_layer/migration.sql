-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'META',
    "objective" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "targetCpqlRibu" INTEGER,
    "manualChats" INTEGER NOT NULL DEFAULT 0,
    "manualQualifiedLeads" INTEGER NOT NULL DEFAULT 0,
    "manualSurveys" INTEGER NOT NULL DEFAULT 0,
    "manualPipelineJuta" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Campaign" ("channel", "createdAt", "id", "isExample", "manualChats", "manualPipelineJuta", "manualQualifiedLeads", "manualSurveys", "name", "notes", "objective", "status", "targetCpqlRibu") SELECT "channel", "createdAt", "id", "isExample", "manualChats", "manualPipelineJuta", "manualQualifiedLeads", "manualSurveys", "name", "notes", "objective", "status", "targetCpqlRibu" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE UNIQUE INDEX "Campaign_name_key" ON "Campaign"("name");
CREATE TABLE "new_CampaignMetricDaily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "adSetId" TEXT,
    "date" DATETIME NOT NULL,
    "spendRibu" INTEGER NOT NULL,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "resultsPlatform" INTEGER,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importBatchId" TEXT,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CampaignMetricDaily_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignMetricDaily_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "AdSet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CampaignMetricDaily" ("adSetId", "campaignId", "clicks", "date", "id", "importBatchId", "impressions", "isExample", "resultsPlatform", "spendRibu") SELECT "adSetId", "campaignId", "clicks", "date", "id", "importBatchId", "impressions", "isExample", "resultsPlatform", "spendRibu" FROM "CampaignMetricDaily";
DROP TABLE "CampaignMetricDaily";
ALTER TABLE "new_CampaignMetricDaily" RENAME TO "CampaignMetricDaily";
CREATE UNIQUE INDEX "CampaignMetricDaily_campaignId_adSetId_date_key" ON "CampaignMetricDaily"("campaignId", "adSetId", "date");
CREATE TABLE "new_IgAccountSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStart" DATETIME NOT NULL,
    "followerCount" INTEGER,
    "reachTotal" INTEGER,
    "reachNonFollowerPct" REAL,
    "profileVisits" INTEGER,
    "recommendationStatus" TEXT NOT NULL,
    "notes" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_IgAccountSnapshot" ("followerCount", "id", "isExample", "notes", "profileVisits", "reachNonFollowerPct", "reachTotal", "recommendationStatus", "weekStart") SELECT "followerCount", "id", "isExample", "notes", "profileVisits", "reachNonFollowerPct", "reachTotal", "recommendationStatus", "weekStart" FROM "IgAccountSnapshot";
DROP TABLE "IgAccountSnapshot";
ALTER TABLE "new_IgAccountSnapshot" RENAME TO "IgAccountSnapshot";
CREATE UNIQUE INDEX "IgAccountSnapshot_weekStart_key" ON "IgAccountSnapshot"("weekStart");
CREATE TABLE "new_IgPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postedAt" DATETIME NOT NULL,
    "format" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "caption" TEXT,
    "cta" TEXT,
    "reach" INTEGER,
    "reachNonFollower" INTEGER,
    "plays" INTEGER,
    "watchTimeSec" INTEGER,
    "retentionPct" REAL,
    "likes" INTEGER,
    "comments" INTEGER,
    "saves" INTEGER,
    "shares" INTEGER,
    "profileVisits" INTEGER,
    "follows" INTEGER,
    "dmClicks" INTEGER,
    "waClicks" INTEGER,
    "leadsManual" INTEGER,
    "qualifiedLeadsManual" INTEGER,
    "signalScore" REAL,
    "isOrganicWinner" BOOLEAN NOT NULL DEFAULT false,
    "adCandidateScore" REAL,
    "experimentId" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importBatchId" TEXT,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "IgPost_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IgPost" ("adCandidateScore", "caption", "comments", "cta", "dmClicks", "experimentId", "follows", "format", "hook", "id", "importBatchId", "isExample", "isOrganicWinner", "leadsManual", "likes", "pillar", "plays", "postedAt", "profileVisits", "qualifiedLeadsManual", "reach", "reachNonFollower", "retentionPct", "saves", "shares", "signalScore", "waClicks", "watchTimeSec") SELECT "adCandidateScore", "caption", "comments", "cta", "dmClicks", "experimentId", "follows", "format", "hook", "id", "importBatchId", "isExample", "isOrganicWinner", "leadsManual", "likes", "pillar", "plays", "postedAt", "profileVisits", "qualifiedLeadsManual", "reach", "reachNonFollower", "retentionPct", "saves", "shares", "signalScore", "waClicks", "watchTimeSec" FROM "IgPost";
DROP TABLE "IgPost";
ALTER TABLE "new_IgPost" RENAME TO "IgPost";
CREATE TABLE "new_ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'CSV',
    "fileName" TEXT,
    "rowCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ImportBatch" ("createdAt", "fileName", "id", "rowCount", "type") SELECT "createdAt", "fileName", "id", "rowCount", "type" FROM "ImportBatch";
DROP TABLE "ImportBatch";
ALTER TABLE "new_ImportBatch" RENAME TO "ImportBatch";
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "campaignId" TEXT,
    "sourceCampaignName" TEXT,
    "igPostId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CHAT_BARU',
    "signalBudget" INTEGER NOT NULL DEFAULT 0,
    "signalProjectType" INTEGER NOT NULL DEFAULT 0,
    "signalLocation" INTEGER NOT NULL DEFAULT 0,
    "signalUrgency" INTEGER NOT NULL DEFAULT 0,
    "signalSeriousness" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "qualAnswersCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedValueJuta" INTEGER NOT NULL DEFAULT 0,
    "lastContactAt" DATETIME,
    "surveyAt" DATETIME,
    "proposalSentAt" DATETIME,
    "sourceDataType" TEXT NOT NULL DEFAULT 'MANUAL',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importBatchId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_igPostId_fkey" FOREIGN KEY ("igPostId") REFERENCES "IgPost" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("campaignId", "createdAt", "estimatedValueJuta", "id", "igPostId", "importBatchId", "isExample", "lastContactAt", "name", "notes", "proposalSentAt", "qualAnswersCount", "qualityScore", "signalBudget", "signalLocation", "signalProjectType", "signalSeriousness", "signalUrgency", "sourceCampaignName", "sourceType", "status", "surveyAt") SELECT "campaignId", "createdAt", "estimatedValueJuta", "id", "igPostId", "importBatchId", "isExample", "lastContactAt", "name", "notes", "proposalSentAt", "qualAnswersCount", "qualityScore", "signalBudget", "signalLocation", "signalProjectType", "signalSeriousness", "signalUrgency", "sourceCampaignName", "sourceType", "status", "surveyAt" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
