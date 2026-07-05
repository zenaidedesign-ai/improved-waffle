-- AlterTable
ALTER TABLE "CampaignMetricDaily" ADD COLUMN "importBatchId" TEXT;

-- AlterTable
ALTER TABLE "IgPost" ADD COLUMN "importBatchId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "importBatchId" TEXT;

-- CreateTable
CREATE TABLE "Learning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "insight" TEXT NOT NULL,
    "supportingData" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "fileName" TEXT,
    "rowCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
