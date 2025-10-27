import { prisma } from '@/lib/prisma';
import { TestReport } from './botTestService';

class ReportStorageService {
  /**
   * 테스트 리포트를 DB에 저장
   */
  async saveReport(report: TestReport, botId: string): Promise<string> {
    try {
      console.log(`💾 Saving report for bot ${botId}...`);
      console.log(`🔍 report.newsAnalysis:`, report.newsAnalysis ? {
        articles: report.newsAnalysis.articles?.length || 0,
        summary: report.newsAnalysis.summary?.substring(0, 50) || 'no summary',
        sentiment: report.newsAnalysis.sentiment
      } : 'undefined');
      console.log(`🔍 report.parsedFmpData:`, report.parsedFmpData ? 'present' : 'undefined');

      const savedReport = await prisma.report.create({
        data: {
          botId,
          symbol: report.symbol,
          currentPrice: report.currentPrice || 0,
          executionTime: report.executionTime,
          timestamp: new Date(report.timestamp),

          // 목표가 정보
          targetPrice: report.targetPrice,
          stopLossPrice: report.stopLossPrice,
          takeProfitPercent: report.takeProfitPercent,
          stopLossPercent: report.stopLossPercent,

          // 뉴스 분석
          newsArticles: report.newsAnalysis?.articles
            ? JSON.stringify(report.newsAnalysis.articles)
            : null,
          newsSummary: report.newsAnalysis?.summary || null,
          newsSentiment: report.newsAnalysis?.sentiment || null,
          sentimentLabel: report.newsAnalysis?.sentimentLabel || null,

          // 🆕 FMP 파싱 데이터
          fmpParsedData: report.parsedFmpData
            ? JSON.stringify(report.parsedFmpData)
            : null,

          // 🆕 백테스팅용 점수 상세 데이터
          technicalScore: report.aiDecision?.objectiveScore?.technical ?? null,
          baseScore: report.aiDecision?.objectiveScore?.baseScore ?? null,
          gptAdjustment: report.aiDecision?.gptAdjustment ?? null,
          finalScore: report.aiDecision?.finalScore ?? null,
          objectiveReasoning: report.aiDecision?.objectiveReasoning || null,
          aiReasoning: report.aiDecision?.aiReasoning || null,

          // AI 결정
          aiAction: report.aiDecision?.action || null,
          aiReason: report.aiDecision?.reason || null,
          aiLimitPrice: report.aiDecision?.limitPrice || null,
          aiQuantity: report.aiDecision?.quantity || null,

          // 최종 결정
          decision: report.finalDecision,
          decisionReason: report.reason,

          // 거래 실행 결과
          tradeExecuted: report.tradeExecuted || false,
          tradeSuccess: report.tradeResult?.success || null,
          tradeOrderId: report.tradeResult?.orderId || null,
          tradeMessage: report.tradeResult?.message || null,
          tradeError: report.tradeResult?.error || null,

          // 전략 파라미터 (빈 객체로 저장)
          strategyParams: JSON.stringify({}),

          // API 호출 내역
          apiCalls: JSON.stringify(report.apiCalls),

          // 조건 평가 결과
          conditions: JSON.stringify(report.conditions),

          // 오류
          error: report.error || null
        }
      });

      console.log(`✅ Report saved with ID: ${savedReport.id}`);
      return savedReport.id;

    } catch (error) {
      console.error('❌ Failed to save report:', error);
      throw error;
    }
  }

  /**
   * 봇별 리포트 목록 조회 (최신순)
   */
  async getReportsByBotId(botId: string, limit: number = 20): Promise<any[]> {
    try {
      const reports = await prisma.report.findMany({
        where: { botId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          symbol: true,
          currentPrice: true,
          timestamp: true,
          decision: true,
          newsSentiment: true,
          sentimentLabel: true,
          aiAction: true,
          aiLimitPrice: true,
          aiQuantity: true,
          tradeExecuted: true,
          tradeSuccess: true,
          createdAt: true
        }
      });

      return reports;
    } catch (error) {
      console.error('❌ Failed to get reports:', error);
      throw error;
    }
  }

  /**
   * 리포트 상세 조회 (TestReport 형식으로 변환)
   */
  async getReportById(reportId: string): Promise<TestReport | null> {
    try {
      const report = await prisma.report.findUnique({
        where: { id: reportId }
      });

      if (!report) {
        return null;
      }

      // DB 데이터를 TestReport 형식으로 변환
      const testReport: TestReport = {
        symbol: report.symbol,
        timestamp: report.timestamp.toISOString(),
        executionTime: report.executionTime,
        currentPrice: report.currentPrice,

        targetPrice: report.targetPrice || undefined,
        stopLossPrice: report.stopLossPrice || undefined,
        takeProfitPercent: report.takeProfitPercent || undefined,
        stopLossPercent: report.stopLossPercent || undefined,

        apiCalls: JSON.parse(report.apiCalls),
        conditions: JSON.parse(report.conditions),

        finalDecision: report.decision as 'BUY' | 'SELL' | 'HOLD',
        reason: report.decisionReason,

        tradeExecuted: report.tradeExecuted,
        tradeResult: report.tradeExecuted
          ? {
              success: report.tradeSuccess || false,
              orderId: report.tradeOrderId || undefined,
              message: report.tradeMessage || '',
              error: report.tradeError || undefined
            }
          : undefined,

        newsAnalysis: report.newsArticles
          ? {
              articles: JSON.parse(report.newsArticles),
              summary: report.newsSummary || '',
              sentiment: report.newsSentiment || 0,
              sentimentLabel: (report.sentimentLabel as any) || 'Neutral'
            }
          : undefined,

        parsedFmpData: report.fmpParsedData
          ? JSON.parse(report.fmpParsedData)
          : undefined,

        aiDecision: report.aiAction
          ? {
              shouldTrade: report.aiAction === 'BUY' || report.aiAction === 'SELL',
              action: report.aiAction as 'BUY' | 'SELL' | 'HOLD',
              actionType: report.aiAction === 'HOLD' ? 'HOLD' : (report.aiAction === 'BUY' ? 'NEW_POSITION' : 'FULL_EXIT'),
              objectiveScore: {
                sentiment: report.newsSentiment || 0,
                technical: report.technicalScore || 0,
                baseScore: report.baseScore || 0
              },
              gptAdjustment: report.gptAdjustment || 0,
              finalScore: report.finalScore || 0,
              objectiveReasoning: report.objectiveReasoning || '',
              aiReasoning: report.aiReasoning || '',
              reason: report.aiReason || '',
              limitPrice: report.aiLimitPrice || undefined,
              quantity: report.aiQuantity || undefined
            }
          : undefined,

        error: report.error || undefined
      };

      return testReport;

    } catch (error) {
      console.error('❌ Failed to get report by ID:', error);
      throw error;
    }
  }

  /**
   * 리포트 삭제
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      await prisma.report.delete({
        where: { id: reportId }
      });
      console.log(`🗑️ Report ${reportId} deleted`);
    } catch (error) {
      console.error('❌ Failed to delete report:', error);
      throw error;
    }
  }

  /**
   * 봇의 모든 리포트 삭제
   */
  async deleteReportsByBotId(botId: string): Promise<void> {
    try {
      await prisma.report.deleteMany({
        where: { botId }
      });
      console.log(`🗑️ All reports for bot ${botId} deleted`);
    } catch (error) {
      console.error('❌ Failed to delete reports:', error);
      throw error;
    }
  }
}

export const reportStorageService = new ReportStorageService();
