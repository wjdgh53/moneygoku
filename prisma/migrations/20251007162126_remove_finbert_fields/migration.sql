/*
  Warnings:

  - You are about to drop the `report_indicators` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `currentPrice` on the `positions` table. All the data in the column will be lost.
  - You are about to drop the column `entryPrice` on the `positions` table. All the data in the column will be lost.
  - Added the required column `avgEntryPrice` to the `positions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `botId` to the `positions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCost` to the `positions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `apiCalls` to the `reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conditions` to the `reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `executionTime` to the `reports` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "report_indicators";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_positions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "avgEntryPrice" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "marketValue" REAL NOT NULL DEFAULT 0.0,
    "unrealizedPL" REAL NOT NULL DEFAULT 0.0,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "positions_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_positions" ("createdAt", "id", "quantity", "symbol", "updatedAt") SELECT "createdAt", "id", "quantity", "symbol", "updatedAt" FROM "positions";
DROP TABLE "positions";
ALTER TABLE "new_positions" RENAME TO "positions";
CREATE UNIQUE INDEX "positions_botId_symbol_key" ON "positions"("botId", "symbol");
CREATE TABLE "new_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "currentPrice" REAL NOT NULL,
    "executionTime" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetPrice" REAL,
    "stopLossPrice" REAL,
    "takeProfitPercent" REAL,
    "stopLossPercent" REAL,
    "newsArticles" TEXT,
    "newsSummary" TEXT,
    "newsSentiment" REAL,
    "sentimentLabel" TEXT,
    "aiAction" TEXT,
    "aiReason" TEXT,
    "aiLimitPrice" REAL,
    "aiQuantity" INTEGER,
    "decision" TEXT NOT NULL,
    "decisionReason" TEXT NOT NULL,
    "tradeExecuted" BOOLEAN NOT NULL DEFAULT false,
    "tradeSuccess" BOOLEAN,
    "tradeOrderId" TEXT,
    "tradeMessage" TEXT,
    "tradeError" TEXT,
    "strategyParams" TEXT NOT NULL,
    "apiCalls" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reports_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_reports" ("botId", "createdAt", "currentPrice", "decision", "decisionReason", "id", "strategyParams", "symbol", "timestamp") SELECT "botId", "createdAt", "currentPrice", "decision", "decisionReason", "id", "strategyParams", "symbol", "timestamp" FROM "reports";
DROP TABLE "reports";
ALTER TABLE "new_reports" RENAME TO "reports";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
