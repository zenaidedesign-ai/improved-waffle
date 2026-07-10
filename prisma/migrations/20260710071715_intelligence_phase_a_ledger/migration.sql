-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learningId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "polarity" TEXT NOT NULL,
    "evidenceRole" TEXT NOT NULL DEFAULT 'OUTCOME',
    "contributesToScore" BOOLEAN NOT NULL DEFAULT true,
    "derivedFromPublic" BOOLEAN NOT NULL DEFAULT false,
    "sourceKind" TEXT NOT NULL,
    "reliabilityPct" INTEGER NOT NULL,
    "payloadType" TEXT,
    "payloadId" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "EvidenceItem_learningId_fkey" FOREIGN KEY ("learningId") REFERENCES "Learning" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BeliefRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learningId" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BeliefRevision_learningId_fkey" FOREIGN KEY ("learningId") REFERENCES "Learning" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Learning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "insight" TEXT NOT NULL,
    "supportingData" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "falsifier" TEXT,
    "derivedFromPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isExample" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Learning" ("category", "confidence", "createdAt", "id", "insight", "isExample", "recommendedAction", "sourceType", "strength", "supportingData", "updatedAt") SELECT "category", "confidence", "createdAt", "id", "insight", "isExample", "recommendedAction", "sourceType", "strength", "supportingData", "updatedAt" FROM "Learning";
DROP TABLE "Learning";
ALTER TABLE "new_Learning" RENAME TO "Learning";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
