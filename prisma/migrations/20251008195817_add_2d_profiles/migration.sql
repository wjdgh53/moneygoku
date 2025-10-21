-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_strategies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "timeHorizon" TEXT NOT NULL DEFAULT 'SWING',
    "riskAppetite" TEXT NOT NULL DEFAULT 'BALANCED',
    "entryConditions" JSONB NOT NULL,
    "exitConditions" JSONB NOT NULL,
    "stopLoss" REAL NOT NULL DEFAULT 5.0,
    "takeProfit" REAL NOT NULL DEFAULT 10.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_strategies" ("createdAt", "description", "entryConditions", "exitConditions", "id", "name", "stopLoss", "takeProfit", "updatedAt") SELECT "createdAt", "description", "entryConditions", "exitConditions", "id", "name", "stopLoss", "takeProfit", "updatedAt" FROM "strategies";
DROP TABLE "strategies";
ALTER TABLE "new_strategies" RENAME TO "strategies";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
