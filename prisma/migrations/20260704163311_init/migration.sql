-- CreateTable
CREATE TABLE "AuditRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "runDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verdict" TEXT NOT NULL,
    "notes" TEXT,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "AuditAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditRunId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isBlocking" BOOLEAN NOT NULL,
    "answerText" TEXT,
    "note" TEXT,
    CONSTRAINT "AuditAnswer_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "AuditRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IgPost" (
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
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "IgPost_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IgAccountSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStart" DATETIME NOT NULL,
    "followerCount" INTEGER,
    "reachTotal" INTEGER,
    "reachNonFollowerPct" REAL,
    "profileVisits" INTEGER,
    "recommendationStatus" TEXT NOT NULL,
    "notes" TEXT,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ContentIdea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "hook" TEXT,
    "plannedCta" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IDE',
    "igPostId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "FitScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "igPostId" TEXT,
    "contentIdeaId" TEXT,
    "hook3s" INTEGER NOT NULL,
    "visualStopScroll" INTEGER NOT NULL,
    "painPointClarity" INTEGER NOT NULL,
    "originality" INTEGER NOT NULL,
    "savePotential" INTEGER NOT NULL,
    "sharePotential" INTEGER NOT NULL,
    "profileVisitPotential" INTEGER NOT NULL,
    "waLeadPotential" INTEGER NOT NULL,
    "brandFit" INTEGER NOT NULL,
    "recommendationSafety" INTEGER NOT NULL,
    "businessValue" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "weightsJson" TEXT NOT NULL,
    "compositeScore" REAL NOT NULL,
    "confidenceLabel" TEXT NOT NULL,
    "scoredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "FitScore_igPostId_fkey" FOREIGN KEY ("igPostId") REFERENCES "IgPost" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FitScore_contentIdeaId_fkey" FOREIGN KEY ("contentIdeaId") REFERENCES "ContentIdea" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'ORGANIK',
    "sourcePostId" TEXT,
    "whyNeeded" TEXT NOT NULL,
    "signalTargeted" TEXT NOT NULL,
    "expectedAudienceReaction" TEXT NOT NULL,
    "expectedBusinessOutcome" TEXT NOT NULL,
    "successMetric" TEXT NOT NULL,
    "decisionRuleAfterTest" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "cycleStart" DATETIME,
    "cycleEnd" DATETIME,
    "resultNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "targetCpqlRibu" INTEGER,
    "manualChats" INTEGER NOT NULL DEFAULT 0,
    "manualQualifiedLeads" INTEGER NOT NULL DEFAULT 0,
    "manualSurveys" INTEGER NOT NULL DEFAULT 0,
    "manualPipelineJuta" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "AdSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "audienceDesc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    CONSTRAINT "AdSet_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignMetricDaily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "adSetId" TEXT,
    "date" DATETIME NOT NULL,
    "spendRibu" INTEGER NOT NULL,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "resultsPlatform" INTEGER,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CampaignMetricDaily_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignMetricDaily_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "AdSet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_igPostId_fkey" FOREIGN KEY ("igPostId") REFERENCES "IgPost" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "eventAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WarRoomSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStart" DATETIME NOT NULL,
    "metricsJson" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "WarRoomDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TERBUKA',
    CONSTRAINT "WarRoomDecision_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WarRoomSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Verdict" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "auditRunId" TEXT,
    "igPostId" TEXT,
    "experimentId" TEXT,
    "campaignId" TEXT,
    "decision" TEXT NOT NULL,
    "ruleFired" TEXT NOT NULL,
    "triggerJson" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "lockedByGate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Verdict_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "AuditRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Verdict_igPostId_fkey" FOREIGN KEY ("igPostId") REFERENCES "IgPost" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Verdict_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Verdict_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "defaultValue" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditAnswer_auditRunId_itemKey_key" ON "AuditAnswer"("auditRunId", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "IgAccountSnapshot_weekStart_key" ON "IgAccountSnapshot"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_name_key" ON "Campaign"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AdSet_campaignId_name_key" ON "AdSet"("campaignId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMetricDaily_campaignId_adSetId_date_key" ON "CampaignMetricDaily"("campaignId", "adSetId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WarRoomSession_weekStart_key" ON "WarRoomSession"("weekStart");
