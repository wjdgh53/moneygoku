-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "strategyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STOPPED',
    "mode" TEXT NOT NULL DEFAULT 'PAPER',
    "orderType" TEXT NOT NULL DEFAULT 'MARKET',
    "fundAllocation" REAL NOT NULL DEFAULT 1000.0,
    "totalReturns" REAL NOT NULL DEFAULT 0.0,
    "realizedCash" REAL NOT NULL DEFAULT 0.0,
    "winRate" REAL NOT NULL DEFAULT 0.0,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "lastExecutedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bots_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_bots" ("createdAt", "fundAllocation", "id", "lastExecutedAt", "mode", "name", "orderType", "status", "strategyId", "symbol", "totalReturns", "totalTrades", "updatedAt", "winRate") SELECT "createdAt", "fundAllocation", "id", "lastExecutedAt", "mode", "name", "orderType", "status", "strategyId", "symbol", "totalReturns", "totalTrades", "updatedAt", "winRate" FROM "bots";
DROP TABLE "bots";
ALTER TABLE "new_bots" RENAME TO "bots";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
