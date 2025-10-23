-- CreateEnum
CREATE TYPE "public"."BotStatus" AS ENUM ('ACTIVE', 'PAUSED', 'STOPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."TradingMode" AS ENUM ('PAPER');

-- CreateEnum
CREATE TYPE "public"."TradeSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "public"."TradeStatus" AS ENUM ('EXECUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."TimeHorizon" AS ENUM ('SHORT_TERM', 'SWING', 'LONG_TERM');

-- CreateEnum
CREATE TYPE "public"."RiskAppetite" AS ENUM ('DEFENSIVE', 'BALANCED', 'AGGRESSIVE');

-- CreateTable
CREATE TABLE "public"."strategies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "timeHorizon" "public"."TimeHorizon" NOT NULL DEFAULT 'SWING',
    "riskAppetite" "public"."RiskAppetite" NOT NULL DEFAULT 'BALANCED',
    "entryConditions" JSONB NOT NULL,
    "exitConditions" JSONB NOT NULL,
    "stopLoss" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "takeProfit" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bots" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "status" "public"."BotStatus" NOT NULL DEFAULT 'STOPPED',
    "mode" "public"."TradingMode" NOT NULL DEFAULT 'PAPER',
    "orderType" TEXT NOT NULL DEFAULT 'MARKET',
    "fundAllocation" DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
    "totalReturns" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "realizedCash" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "lastExecutedAt" TIMESTAMP(3),
    "analystRating" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trades" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "public"."TradeSide" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "public"."TradeStatus" NOT NULL DEFAULT 'EXECUTED',
    "reason" TEXT,
    "alpacaOrderId" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."portfolios" (
    "id" TEXT NOT NULL,
    "totalCash" DOUBLE PRECISION NOT NULL DEFAULT 10000.0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 10000.0,
    "totalReturns" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalReturnsPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."positions" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "avgEntryPrice" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "marketValue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "unrealizedPL" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."market_data" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ALPHA_VANTAGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."watchlist" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bot_recommendation_reports" (
    "id" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "analysisNotes" TEXT,
    "totalOpportunities" INTEGER NOT NULL,
    "filteredOTCCount" INTEGER NOT NULL DEFAULT 0,
    "highConfidenceCount" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_recommendation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reports" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "executionTime" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetPrice" DOUBLE PRECISION,
    "stopLossPrice" DOUBLE PRECISION,
    "takeProfitPercent" DOUBLE PRECISION,
    "stopLossPercent" DOUBLE PRECISION,
    "newsArticles" TEXT,
    "newsSummary" TEXT,
    "newsSentiment" DOUBLE PRECISION,
    "sentimentLabel" TEXT,
    "fmpParsedData" TEXT,
    "technicalScore" DOUBLE PRECISION,
    "baseScore" DOUBLE PRECISION,
    "gptAdjustment" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "objectiveReasoning" TEXT,
    "aiReasoning" TEXT,
    "aiAction" TEXT,
    "aiReason" TEXT,
    "aiLimitPrice" DOUBLE PRECISION,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bots_strategyId_idx" ON "public"."bots"("strategyId");

-- CreateIndex
CREATE INDEX "bots_symbol_idx" ON "public"."bots"("symbol");

-- CreateIndex
CREATE INDEX "bots_status_idx" ON "public"."bots"("status");

-- CreateIndex
CREATE INDEX "trades_botId_idx" ON "public"."trades"("botId");

-- CreateIndex
CREATE INDEX "trades_symbol_idx" ON "public"."trades"("symbol");

-- CreateIndex
CREATE INDEX "trades_executedAt_idx" ON "public"."trades"("executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "positions_botId_symbol_key" ON "public"."positions"("botId", "symbol");

-- CreateIndex
CREATE INDEX "market_data_symbol_idx" ON "public"."market_data"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "market_data_symbol_timestamp_key" ON "public"."market_data"("symbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_symbol_key" ON "public"."watchlist"("symbol");

-- CreateIndex
CREATE INDEX "bot_recommendation_reports_timestamp_idx" ON "public"."bot_recommendation_reports"("timestamp");

-- CreateIndex
CREATE INDEX "reports_botId_idx" ON "public"."reports"("botId");

-- CreateIndex
CREATE INDEX "reports_timestamp_idx" ON "public"."reports"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."bots" ADD CONSTRAINT "bots_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "public"."strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trades" ADD CONSTRAINT "trades_botId_fkey" FOREIGN KEY ("botId") REFERENCES "public"."bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."positions" ADD CONSTRAINT "positions_botId_fkey" FOREIGN KEY ("botId") REFERENCES "public"."bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_botId_fkey" FOREIGN KEY ("botId") REFERENCES "public"."bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
