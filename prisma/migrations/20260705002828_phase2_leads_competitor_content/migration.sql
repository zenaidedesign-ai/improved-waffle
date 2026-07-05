-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "notes" TEXT;
ALTER TABLE "Lead" ADD COLUMN "proposalSentAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "surveyAt" DATETIME;

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "igUrl" TEXT,
    "threadsUrl" TEXT,
    "tiktokUrl" TEXT,
    "websiteUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "CompetitorAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorId" TEXT NOT NULL,
    "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "positioning" TEXT NOT NULL,
    "offer" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "visualStyle" TEXT NOT NULL,
    "contentPattern" TEXT NOT NULL,
    "postingFrequency" TEXT NOT NULL,
    "hookPattern" TEXT NOT NULL,
    "marketGap" TEXT NOT NULL,
    "adaptationIdeas" TEXT NOT NULL,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CompetitorAnalysis_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PainPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "audience" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Objection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);

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
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Campaign" ("createdAt", "id", "isExample", "manualChats", "manualPipelineJuta", "manualQualifiedLeads", "manualSurveys", "name", "notes", "objective", "status", "targetCpqlRibu") SELECT "createdAt", "id", "isExample", "manualChats", "manualPipelineJuta", "manualQualifiedLeads", "manualSurveys", "name", "notes", "objective", "status", "targetCpqlRibu" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE UNIQUE INDEX "Campaign_name_key" ON "Campaign"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
