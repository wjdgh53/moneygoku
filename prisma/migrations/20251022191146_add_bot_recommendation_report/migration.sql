-- CreateTable
CREATE TABLE "bot_recommendation_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recommendations" TEXT NOT NULL,
    "analysisNotes" TEXT,
    "totalOpportunities" INTEGER NOT NULL,
    "filteredOTCCount" INTEGER NOT NULL DEFAULT 0,
    "highConfidenceCount" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "bot_recommendation_reports_timestamp_idx" ON "bot_recommendation_reports"("timestamp");

-- CreateIndex
CREATE INDEX "bots_strategyId_idx" ON "bots"("strategyId");

-- CreateIndex
CREATE INDEX "bots_symbol_idx" ON "bots"("symbol");

-- CreateIndex
CREATE INDEX "bots_status_idx" ON "bots"("status");

-- CreateIndex
CREATE INDEX "reports_botId_idx" ON "reports"("botId");

-- CreateIndex
CREATE INDEX "reports_timestamp_idx" ON "reports"("timestamp");

-- CreateIndex
CREATE INDEX "trades_botId_idx" ON "trades"("botId");

-- CreateIndex
CREATE INDEX "trades_symbol_idx" ON "trades"("symbol");

-- CreateIndex
CREATE INDEX "trades_executedAt_idx" ON "trades"("executedAt");
