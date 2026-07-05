/*
  Warnings:

  - You are about to drop the column `adCandidateScore` on the `IgPost` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "experimentId" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importBatchId" TEXT,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "IgPost_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IgPost" ("caption", "comments", "cta", "dmClicks", "experimentId", "follows", "format", "hook", "id", "importBatchId", "isExample", "isOrganicWinner", "leadsManual", "likes", "pillar", "plays", "postedAt", "profileVisits", "qualifiedLeadsManual", "reach", "reachNonFollower", "retentionPct", "saves", "shares", "signalScore", "sourceType", "updatedAt", "waClicks", "watchTimeSec") SELECT "caption", "comments", "cta", "dmClicks", "experimentId", "follows", "format", "hook", "id", "importBatchId", "isExample", "isOrganicWinner", "leadsManual", "likes", "pillar", "plays", "postedAt", "profileVisits", "qualifiedLeadsManual", "reach", "reachNonFollower", "retentionPct", "saves", "shares", "signalScore", "sourceType", "updatedAt", "waClicks", "watchTimeSec" FROM "IgPost";
DROP TABLE "IgPost";
ALTER TABLE "new_IgPost" RENAME TO "IgPost";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
