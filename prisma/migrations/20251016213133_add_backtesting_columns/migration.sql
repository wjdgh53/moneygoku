-- AlterTable
ALTER TABLE "reports" ADD COLUMN "aiReasoning" TEXT;
ALTER TABLE "reports" ADD COLUMN "baseScore" REAL;
ALTER TABLE "reports" ADD COLUMN "finalScore" REAL;
ALTER TABLE "reports" ADD COLUMN "gptAdjustment" REAL;
ALTER TABLE "reports" ADD COLUMN "objectiveReasoning" TEXT;
ALTER TABLE "reports" ADD COLUMN "technicalScore" REAL;
