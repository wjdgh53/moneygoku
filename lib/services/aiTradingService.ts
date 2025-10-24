import { NewsAnalysis } from './newsAnalysisService';
import { alpacaTradingService } from './alpacaTradingService';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AnalystRating } from './fmpAnalystService';
import { FMPNewsData } from '@/lib/types/fmpNews';
import { parseFMPDataForGPT, ParsedFMPData } from '@/lib/utils/fmpDataParser';
import { env } from '@/lib/config/env';

export interface CurrentPosition {
  quantity: number;
  entryPrice: number;
  currentValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
}

export interface FundStatus {
  allocatedFund: number;        // 할당 자금
  stockValue: number;           // 보유 주식 가치
  availableCash: number;        // 사용 가능 현금
  totalValue: number;           // 총 자산
  totalReturns: number;         // 총 수익 ($)
  totalReturnsPercent: number;  // 총 수익률 (%)
}

export type ActionType =
  | 'NEW_POSITION'      // 신규 매수
  | 'ADD_TO_POSITION'   // 추가 매수
  | 'PARTIAL_EXIT'      // 일부 매도
  | 'FULL_EXIT'         // 전량 매도
  | 'HOLD';             // 관망

export interface AITradeDecision {
  shouldTrade: boolean;
  action: 'BUY' | 'SELL' | 'HOLD';
  actionType: ActionType;  // 🆕 세부 액션 타입

  // 객관적 점수 정보
  objectiveScore: {
    sentiment: number;  // Alpha Vantage 감성 점수
    technical: number;
    baseScore: number;
  };

  // GPT 조정
  gptAdjustment: number;
  finalScore: number;

  // 이유 (두 섹션)
  objectiveReasoning: string;  // 계산 과정
  aiReasoning: string;          // GPT 판단
  reason?: string;              // UI 호환성 (aiReasoning alias)

  // 거래 정보
  limitPrice?: number;
  quantity?: number;

  // 매도 타입 (일부/전량) - deprecated, use actionType instead
  sellType?: 'FULL' | 'PARTIAL';
}

class AITradingService {
  private chatModel: ChatOpenAI;

  constructor() {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    const model = env.OPENAI_MODEL;

    this.chatModel = new ChatOpenAI({
      apiKey,
      model,
      temperature: 0.5,
      maxTokens: 500,
    });
  }

  /**
   * AI 기반 거래 결정 (객관적 점수 + GPT 조정)
   *
   * @param technicalSignal - 기술적 분석 결과 (true = 조건 충족)
   * @param newsAnalysis - 뉴스 감성 분석 결과
   * @param currentPrice - 현재 시장 가격
   * @param fundAllocation - 할당 자금
   * @returns 거래 결정 (매수/매도/홀드 + 리미트 가격)
   */
  async makeTradeDecision(
    technicalSignal: boolean,
    newsAnalysis: NewsAnalysis,
    currentPrice: number,
    fundAllocation: number
  ): Promise<AITradeDecision> {

    console.log('\n🤖 AI 거래 결정 시작...');

    // === 1단계: 객관적 점수 계산 ===
    const sentimentScore = newsAnalysis.sentiment || 0;  // Alpha Vantage 감성 점수
    const technicalScore = technicalSignal ? 0.5 : -0.5;

    // 가중 평균: 감성 70% + 기술적 30%
    const baseScore = sentimentScore * 0.7 + technicalScore * 0.3;

    const objectiveReasoning = [
      `📊 객관적 분석:`,
      `  • 뉴스 감성: ${sentimentScore.toFixed(2)} (${newsAnalysis.sentimentLabel}, 가중치 70%)`,
      `  • 기술적 조건: ${technicalScore.toFixed(2)} (${technicalSignal ? '충족' : '불충족'}, 가중치 30%)`,
      `  • 기초 점수: ${baseScore.toFixed(2)}`
    ].join('\n');

    console.log(objectiveReasoning);

    // === 2단계: GPT 종합 판단 요청 (뉘앙스 캐치 강화) ===
    const prompt = `전문 투자 분석가로서 다음 지표를 평가하세요.

## 지표:
- 기초 점수: ${baseScore.toFixed(2)} (뉴스 감성 ${sentimentScore.toFixed(2)} + 기술적 ${technicalScore.toFixed(2)})
- 뉴스: ${newsAnalysis.summary.slice(0, 400)}

## 임무:
뉴스의 뉘앙스, 숨겨진 리스크, 시장 반응 가능성 등을 종합적으로 판단하여
기초 점수를 ±0.5 범위 내에서 조정하세요.
단순 긍정/부정이 아닌, 실제 주가 영향도를 고려하세요.

## 응답 형식 (JSON):
{
  "adjustment": -0.10,
  "reasoning": "조정 이유 (100자 이내)"
}`;

    try {
      const response = await this.chatModel.invoke([
        new SystemMessage('You are a professional investment analyst. Always respond with valid JSON only.'),
        new HumanMessage(prompt)
      ], {
        response_format: { type: "json_object" }
      });

      const responseText = response.content as string || '{}';
      console.log('🤖 GPT raw response:', responseText);

      const gptResponse = JSON.parse(responseText);
      let gptAdjustment = gptResponse.adjustment || 0;
      let aiReasoning = gptResponse.reasoning || '조정 없음';

      // === 3단계: 안전장치 (±0.5 제한) ===
      if (Math.abs(gptAdjustment) > 0.5) {
        console.warn(`⚠️ GPT 조정이 ±0.5 초과 (${gptAdjustment.toFixed(2)}), 제한 적용`);
        gptAdjustment = Math.sign(gptAdjustment) * 0.5;
        aiReasoning += ` (조정값이 제한됨: ±0.5)`;
      }

      const finalScore = Math.max(-1.0, Math.min(1.0, baseScore + gptAdjustment));

      console.log(`🎯 GPT 조정: ${gptAdjustment >= 0 ? '+' : ''}${gptAdjustment.toFixed(2)}`);
      console.log(`📈 최종 점수: ${finalScore.toFixed(2)}`);
      console.log(`💭 GPT 판단: ${aiReasoning}`);

      // === 4단계: 최종 매매 결정 (보수적 매수 전략) ===
      let action: 'BUY' | 'SELL' | 'HOLD';
      let shouldTrade = false;

      if (finalScore < -0.2) {
        action = 'SELL';
        shouldTrade = true;
      } else if (finalScore < 0.35) {  // 0.15 → 0.35 (더 신중한 매수)
        action = 'HOLD';
        shouldTrade = false;
      } else {
        action = 'BUY';
        shouldTrade = true;
      }

      console.log(`🎯 최종 결정: ${action}`);

      // === 5단계: 매수시 수량/리미트 가격 계산 ===
      let limitPrice: number | undefined;
      let quantity: number | undefined;

      if (action === 'BUY') {
        // 리미트 가격: finalScore 기반
        const limitPriceOffset = this.calculateLimitPriceOffset(finalScore);
        limitPrice = parseFloat((currentPrice * (1 + limitPriceOffset)).toFixed(2));

        // ✅ Kelly Criterion 기반 수량 계산
        quantity = this.calculateOptimalPosition(finalScore, fundAllocation, limitPrice);

        const investmentAmount = quantity * limitPrice;
        const investmentRatio = fundAllocation > 0 ? (investmentAmount / fundAllocation) * 100 : 0;

        console.log(`💰 투자 전략:`);
        console.log(`   할당 자금: $${fundAllocation.toFixed(2)}`);
        console.log(`   최종 점수: ${finalScore.toFixed(2)}`);
        console.log(`   매수 수량: ${quantity}주`);
        console.log(`   투자 금액: $${investmentAmount.toFixed(2)} (${investmentRatio.toFixed(1)}%)`);
        console.log(`   리미트 가격: $${limitPrice.toFixed(2)} (${(limitPriceOffset * 100).toFixed(2)}%)`);

        if (quantity === 0) {
          shouldTrade = false;
          action = 'HOLD';
          aiReasoning += `\n자금 부족 또는 수량 0으로 매수 불가`;
        }
      }

      // Map simple action to detailed actionType
      let actionType: ActionType;
      if (action === 'BUY') {
        actionType = 'NEW_POSITION'; // No position info, assume new position
      } else if (action === 'SELL') {
        actionType = 'FULL_EXIT'; // No position info, assume full exit
      } else {
        actionType = 'HOLD';
      }

      return {
        shouldTrade,
        action,
        actionType,
        objectiveScore: {
          sentiment: sentimentScore,
          technical: technicalScore,
          baseScore
        },
        gptAdjustment,
        finalScore,
        objectiveReasoning,
        aiReasoning,
        reason: aiReasoning, // Alias for DB compatibility
        limitPrice,
        quantity
      };

    } catch (error: any) {
      console.error('❌ GPT 분석 실패:', error);

      // GPT 실패시 객관적 점수만으로 판단 (HOLD 범위 축소)
      let action: 'BUY' | 'SELL' | 'HOLD';
      let shouldTrade = false;

      if (baseScore < -0.2) {
        action = 'SELL';
        shouldTrade = true;
      } else if (baseScore < 0.15) {
        action = 'HOLD';
        shouldTrade = false;
      } else {
        action = 'BUY';
        shouldTrade = true;
      }

      // Map simple action to detailed actionType
      let actionType: ActionType;
      if (action === 'BUY') {
        actionType = 'NEW_POSITION';
      } else if (action === 'SELL') {
        actionType = 'FULL_EXIT';
      } else {
        actionType = 'HOLD';
      }

      return {
        shouldTrade,
        action,
        actionType,
        objectiveScore: {
          sentiment: sentimentScore,
          technical: technicalScore,
          baseScore
        },
        gptAdjustment: 0,
        finalScore: baseScore,
        objectiveReasoning,
        aiReasoning: `GPT 분석 실패 (${error.message}). 객관적 점수만으로 판단.`,
        limitPrice: action === 'BUY' ? currentPrice : undefined,
        quantity: action === 'BUY' ? Math.floor((fundAllocation * 0.3) / currentPrice) : undefined
      };
    }
  }

  /**
   * finalScore에 따라 투자 비율 계산 (deprecated - use calculateOptimalPosition)
   *
   * - Very Positive (0.7~1.0): 80% 투자
   * - Positive (0.5~0.7): 50% 투자
   * - Neutral-Positive (0.2~0.5): 30% 투자
   */
  private calculateInvestmentRatio(finalScore: number): number {
    if (finalScore >= 0.7) {
      return 0.80; // 80% - 강한 긍정
    } else if (finalScore >= 0.5) {
      return 0.50; // 50% - 긍정
    } else {
      return 0.30; // 30% - 약한 긍정/중립
    }
  }

  /**
   * ✨ Kelly Criterion 기반 최적 포지션 수량 계산
   *
   * @param finalScore - AI 최종 점수 (-1.0 ~ 1.0)
   * @param fundAllocation - 할당 자금
   * @param currentPrice - 현재 주가
   * @returns 최적 매수 수량
   */
  private calculateOptimalPosition(
    finalScore: number,
    fundAllocation: number,
    currentPrice: number
  ): number {
    // 1. 기본 체크
    if (finalScore < 0.35) return 0;  // BUY 임계값과 동일
    if (fundAllocation <= 0 || currentPrice <= 0) return 0;

    // 2. Kelly Criterion (1/4 Kelly for safety)
    // f* = (p*b - q) / b
    // p = win probability, b = win/loss ratio, q = 1-p
    const winProb = (finalScore + 1) / 2;  // -1~1 → 0~1 변환
    const b = 2;  // 2:1 reward/risk ratio 가정
    const q = 1 - winProb;

    let kelly = (winProb * b - q) / b;
    kelly = Math.max(0, kelly) * 0.25;  // 1/4 Kelly (보수적)

    // 3. 점수 기반 포지션 비율 결정 (단일 종목 집중 투자)
    let positionRatio: number;

    if (finalScore >= 0.7) {
      // 매우 강한 신호: Kelly 사용 (최소 70%, 최대 90%)
      positionRatio = Math.min(Math.max(kelly, 0.70), 0.90);
    } else if (finalScore >= 0.5) {
      // 강한 신호: Kelly * 0.8 (최소 50%, 최대 70%)
      positionRatio = Math.min(Math.max(kelly * 0.8, 0.50), 0.70);
    } else {
      // 보통 신호: Kelly * 0.6 (최소 30%, 최대 50%)
      positionRatio = Math.min(Math.max(kelly * 0.6, 0.30), 0.50);
    }

    // 4. 최종 수량 계산
    const investmentAmount = fundAllocation * positionRatio;
    const quantity = Math.floor(investmentAmount / currentPrice);

    console.log(`📊 Kelly Criterion 포지션 사이징:`);
    console.log(`   승률 추정: ${(winProb * 100).toFixed(1)}%`);
    console.log(`   Kelly 비율: ${(kelly * 100).toFixed(1)}%`);
    console.log(`   최종 투자 비율: ${(positionRatio * 100).toFixed(1)}%`);

    return Math.max(0, quantity);
  }

  /**
   * ✨ 목표 포지션 비율 계산 (신호 강도 기반)
   *
   * @param finalScore - AI 최종 점수 (-1.0 ~ 1.0)
   * @returns 목표 포지션 비율 (0.0 ~ 0.8)
   */
  private calculateTargetPositionRatio(finalScore: number): number {
    if (finalScore >= 0.7) {
      // 매우 강한 신호: 80% (단일 종목 집중 투자)
      return 0.80;
    } else if (finalScore >= 0.5) {
      // 강한 신호: 60%
      return 0.60;
    } else if (finalScore >= 0.35) {
      // 보통 신호: 40% (BUY 임계값과 일치)
      return 0.40;
    } else if (finalScore <= -0.35) {
      // 강한 매도 신호: 0% (전량 매도, SELL 임계값과 일치)
      return 0.0;
    } else {
      // HOLD 범위 (-0.35 ~ 0.35): 현재 포지션 유지
      return -1; // -1은 "유지" 신호
    }
  }

  /**
   * 🆕 기술적 조건 개별 평가 점수 계산
   *
   * - 각 조건당: 충족하면 +(0.5 / 조건수), 불충족하면 -(0.5 / 조건수)
   * - 예: RSI, MACD, Bollinger 3개 중 2개 충족 → +0.17 +0.17 -0.17 = +0.17
   *
   * @param conditions - 기술적 조건 평가 결과 배열
   * @returns 기술적 점수 (-0.5 ~ +0.5)
   */
  private calculateTechnicalScore(conditions?: Array<{ condition: string; actual: string; result: boolean; details?: string }>): number {
    if (!conditions || conditions.length === 0) {
      // 조건이 없으면 중립 (0점)
      return 0;
    }

    const scorePerCondition = 0.5 / conditions.length;
    let totalScore = 0;

    conditions.forEach(cond => {
      totalScore += cond.result ? scorePerCondition : -scorePerCondition;
    });

    return totalScore;
  }

  /**
   * finalScore에 따라 리미트 가격 오프셋 계산
   *
   * - 매우 긍정적 (0.7 이상): 현재가 대비 +0.3% 리미트 (빠른 체결)
   * - 긍정적 (0.3 ~ 0.7): 현재가 대비 0% 리미트 (시장가)
   * - 중립 (0.2 ~ 0.3): 현재가 대비 -0.3% 리미트 (저가 매수)
   */
  private calculateLimitPriceOffset(finalScore: number): number {
    if (finalScore >= 0.7) {
      return 0.003; // +0.3% (강한 긍정, 빠른 체결 우선)
    } else if (finalScore >= 0.3) {
      return 0; // 현재가 (시장가 수준)
    } else {
      return -0.003; // -0.3% (저가 매수 시도)
    }
  }

  /**
   * 🆕 통합 거래 판단 (매수/매도/추가매수/일부매도 모두 처리)
   *
   * @param params - 통합 판단에 필요한 모든 정보
   * @returns AI 거래 결정
   */
  async makeUnifiedDecision(params: {
    symbol: string;
    currentPrice: number;
    currentPosition: CurrentPosition | null;
    technicalSignal: boolean;  // 호환성 유지 (deprecated, use technicalConditions)
    technicalConditions?: Array<{ condition: string; actual: string; result: boolean; details?: string }>;  // 🆕 개별 조건 평가 결과
    newsAnalysis: NewsAnalysis;
    fundAllocation: number;
    stopLoss?: number;  // 예: 5 (%)
    takeProfit?: number;  // 예: 10 (%)
    analystRating?: AnalystRating | null;  // 🆕 애널리스트 레이팅
    fmpNewsData?: FMPNewsData | null;  // 🆕 FMP 뉴스 데이터
  }): Promise<AITradeDecision> {
    const {
      symbol,
      currentPrice,
      currentPosition,
      technicalSignal,
      technicalConditions,
      newsAnalysis,
      fundAllocation,
      stopLoss = 5,
      takeProfit = 10,
      analystRating,
      fmpNewsData
    } = params;

    console.log('\n🧠 통합 거래 판단 시작 (세컨드 브레인 모드)...');
    console.log(`📊 현재 포지션:`, currentPosition ? `${currentPosition.quantity}주 @ $${currentPosition.entryPrice.toFixed(2)}` : '없음');

    // === 포지션 비율 사전 계산 (감쇠 로직용) ===
    const currentPositionValue = currentPosition ? currentPosition.quantity * currentPrice : 0;
    const currentRatio = fundAllocation > 0 ? currentPositionValue / fundAllocation : 0;

    // === 1단계: 객관적 점수 계산 ===
    const sentimentScore = newsAnalysis.sentiment || 0;

    // 🆕 소셜 감성 점수 추출 (FMP 데이터)
    let socialScore = 0;
    if (fmpNewsData && fmpNewsData.socialSentiment.length > 0) {
      const latest = fmpNewsData.socialSentiment[0];
      socialScore = (latest.stocktwitsSentiment + latest.twitterSentiment) / 2;
      console.log(`📱 소셜 감성: ${socialScore.toFixed(2)} (StockTwits: ${latest.stocktwitsSentiment.toFixed(2)}, Twitter: ${latest.twitterSentiment.toFixed(2)})`);
      console.log(`   게시물: StockTwits ${latest.stocktwitsPosts}개, Twitter ${latest.twitterPosts}개`);
    } else {
      console.log(`📱 소셜 감성: 데이터 없음`);
    }

    // 🆕 기술적 조건 개별 평가 (각 조건당 점수 계산)
    const technicalScore = technicalConditions
      ? this.calculateTechnicalScore(technicalConditions)
      : (technicalSignal ? 0.5 : -0.5);  // fallback to old logic

    // 🆕 점수 계산 로직 개선 (소셜 감성 통합)
    let baseScore: number;
    let scoreExplanation: string;

    if (sentimentScore === 0 && socialScore !== 0) {
      // Alpha Vantage 없고 소셜만 있음 → 소셜을 주요 소스로
      baseScore = socialScore * 0.7 + technicalScore * 0.3;
      scoreExplanation = `소셜 ${socialScore.toFixed(2)} * 0.7 + 기술 ${technicalScore.toFixed(2)} * 0.3`;
      console.log(`📊 점수 계산 (소셜 중심): ${scoreExplanation}`);
    } else if (sentimentScore !== 0 && socialScore !== 0) {
      // 둘 다 있음 → 둘 다 활용
      baseScore = sentimentScore * 0.6 + socialScore * 0.1 + technicalScore * 0.3;
      scoreExplanation = `Alpha ${sentimentScore.toFixed(2)} * 0.6 + 소셜 ${socialScore.toFixed(2)} * 0.1 + 기술 ${technicalScore.toFixed(2)} * 0.3`;
      console.log(`📊 점수 계산 (통합): ${scoreExplanation}`);
    } else if (sentimentScore !== 0) {
      // Alpha Vantage만 있음 → 기존 로직
      baseScore = sentimentScore * 0.7 + technicalScore * 0.3;
      scoreExplanation = `Alpha ${sentimentScore.toFixed(2)} * 0.7 + 기술 ${technicalScore.toFixed(2)} * 0.3`;
      console.log(`📊 점수 계산 (Alpha 중심): ${scoreExplanation}`);
    } else {
      // 둘 다 없음 → 기술적 신호만
      baseScore = technicalScore * 1.0;
      scoreExplanation = `기술 ${technicalScore.toFixed(2)} * 1.0 (뉴스 데이터 없음)`;
      console.log(`📊 점수 계산 (기술만): ${scoreExplanation}`);
    }

    // 기술적 조건 상세 로그
    if (technicalConditions && technicalConditions.length > 0) {
      console.log(`📐 기술적 조건 평가 (개별 점수):`);
      technicalConditions.forEach(cond => {
        const scorePerCondition = (0.5 / technicalConditions.length);
        const condScore = cond.result ? scorePerCondition : -scorePerCondition;
        console.log(`  • ${cond.condition}: ${cond.result ? '✅' : '❌'} (${condScore >= 0 ? '+' : ''}${condScore.toFixed(3)})`);
      });
      console.log(`  • 총 기술적 점수: ${technicalScore.toFixed(2)}`);
    }

    const objectiveReasoning = [
      `📊 객관적 분석:`,
      `  • Alpha Vantage 감성: ${sentimentScore.toFixed(2)} (${newsAnalysis.sentimentLabel})`,
      socialScore !== 0 ? `  • 소셜 감성: ${socialScore.toFixed(2)} (StockTwits + Twitter)` : null,
      `  • 기술적 조건: ${technicalScore.toFixed(2)} (${technicalConditions ? `${technicalConditions.filter(c => c.result).length}/${technicalConditions.length} 충족` : (technicalSignal ? '충족' : '불충족')})`,
      `  • 기초 점수: ${baseScore.toFixed(2)} (${scoreExplanation})`
    ].filter(Boolean).join('\n');

    console.log(objectiveReasoning);

    // === 2단계: 포지션 & 자금 상태 분석 ===
    let positionStatus = '';
    let profitPercent = 0;

    // 자금 현황 계산
    const stockValue = currentPosition ? currentPosition.currentValue : 0;
    const availableCash = fundAllocation;
    const totalValue = stockValue + availableCash;
    const totalReturns = currentPosition ? currentPosition.unrealizedPL : 0;
    const totalReturnsPercent = fundAllocation > 0 ? (totalReturns / fundAllocation) * 100 : 0;

    const fundStatusText = `
**봇 자금 현황**:
- 할당 자금: $${fundAllocation.toFixed(2)}
- 보유 주식 가치: $${stockValue.toFixed(2)} (${currentPosition ? currentPosition.quantity : 0}주)
- 사용 가능 현금: $${availableCash.toFixed(2)}
- 총 자산: $${totalValue.toFixed(2)}
- 총 수익: ${totalReturns >= 0 ? '+' : ''}$${totalReturns.toFixed(2)} (${totalReturnsPercent >= 0 ? '+' : ''}${totalReturnsPercent.toFixed(2)}%)`;

    if (currentPosition) {
      profitPercent = ((currentPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100;
      const isStopLoss = profitPercent <= -stopLoss;
      const isTakeProfit = profitPercent >= takeProfit;

      positionStatus = `
**현재 보유 상황**:
- 보유 수량: ${currentPosition.quantity}주
- 평균 진입가: $${currentPosition.entryPrice.toFixed(2)}
- 현재가: $${currentPrice.toFixed(2)}
- 수익률: ${profitPercent > 0 ? '+' : ''}${profitPercent.toFixed(2)}% (${currentPosition.unrealizedPL > 0 ? '+' : ''}$${currentPosition.unrealizedPL.toFixed(2)})
- Stop Loss 도달: ${isStopLoss ? '⚠️ YES' : 'NO'} (기준: -${stopLoss}%)
- Take Profit 도달: ${isTakeProfit ? '✅ YES' : 'NO'} (기준: +${takeProfit}%)`;
    } else {
      positionStatus = `**현재 보유 상황**: 없음 (신규 진입 검토 중)`;
    }

    // === 3단계: 애널리스트 레이팅 정보 추가 ===
    let analystRatingText = '';
    if (analystRating && analystRating.latestChange) {
      const { latestChange, consensus, totalChanges } = analystRating;
      const daysAgo = Math.floor(
        (Date.now() - new Date(latestChange.publishedDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      analystRatingText = `

## 애널리스트 레이팅:
- 최신 변경: ${latestChange.gradingCompany}가 ${latestChange.previousGrade} → ${latestChange.newGrade}로 ${latestChange.signal} (${daysAgo}일 전)
- 합의 신호: ${consensus} (최근 30일 내 ${totalChanges}건 변경)`;

      console.log(`📊 애널리스트 레이팅:`);
      console.log(`   최신: ${latestChange.gradingCompany} - ${latestChange.previousGrade} → ${latestChange.newGrade} (${latestChange.signal})`);
      console.log(`   합의: ${consensus} (30일 내 ${totalChanges}건)`);
    } else {
      console.log(`ℹ️ 애널리스트 레이팅 데이터 없음`);
    }

    // === 3-1단계: FMP 뉴스 데이터 파싱 (SEC Filings, Insider Trading 등) ===
    let fmpDataText = '';
    if (fmpNewsData) {
      const parsedFMP = await parseFMPDataForGPT(fmpNewsData, symbol);

      fmpDataText = `

## FMP 추가 정보:
${parsedFMP.criticalEvents}

${parsedFMP.insiderSignals}

${parsedFMP.recentNews}`;

      console.log(`\n📋 FMP 데이터 파싱 완료:`);
      console.log(`   SEC Filings: ${fmpNewsData.secFilings.length}개`);
      console.log(`   Insider Trades: ${fmpNewsData.insiderTrades.length}개`);
      console.log(`   Stock News: ${fmpNewsData.stockNews.length}개`);
      console.log(`   Press Releases: ${fmpNewsData.pressReleases.length}개`);
    } else {
      console.log(`ℹ️ FMP 뉴스 데이터 없음`);
    }

    // === 4단계: GPT 종합 판단 요청 (뉘앙스 캐치 강화) ===
    const prompt = `전문 투자 분석가로서 다음 지표를 종합적으로 평가하세요.

## 종목: ${symbol}
${positionStatus}

## 기초 분석:
- 기초 점수: ${baseScore.toFixed(2)} (뉴스 감성 ${sentimentScore.toFixed(2)} [${newsAnalysis.sentimentLabel}] + 기술적 ${technicalScore.toFixed(2)})
- Alpha Vantage 뉴스 요약: ${newsAnalysis.summary.slice(0, 300)}${analystRatingText}${fmpDataText}

## 임무:
FMP 데이터(SEC 문서, 내부자 거래)를 종합하여 기초 점수를 ±0.5 범위 내에서 조정하세요.

**⚠️ 중요: 조정 방향 규칙**
- ✅ 긍정 신호 → **+ 조정** (상향)
- ❌ 부정 신호 → **- 조정** (하향)

**긍정 신호 예시 (+0.1 ~ +0.5):**
- 📰 뉴스 헤드라인: Earnings beat, margin expansion, revenue growth → +0.3 ~ +0.5
- SEC 8-K: 대규모 투자 유치, 인수 발표, 계약 체결 → +0.3 ~ +0.5
- 내부자 매수: 대규모 (>$100K), 임원/이사 매수 → +0.2 ~ +0.3
- 애널리스트 Upgrade → +0.1 ~ +0.2

**부정 신호 예시 (-0.1 ~ -0.5):**
- 📰 뉴스 헤드라인: Earnings miss, revenue decline, layoffs, downgrade → -0.3 ~ -0.5
- SEC 8-K: 소송, 조사, 리콜, 임원 퇴임 → -0.3 ~ -0.5
- 내부자 매도: 대규모, 여러 임원 매도 → -0.2 ~ -0.3
- 애널리스트 Downgrade → -0.1 ~ -0.2

${fmpDataText ? '**📋 현재 FMP 데이터**: 위 규칙을 적용하여 SEC 문서와 내부자 거래가 주가에 미칠 실제 영향도를 평가하세요.' : ''}
${currentPosition ? `현재 수익률: ${profitPercent > 0 ? '+' : ''}${profitPercent.toFixed(2)}%` : ''}

**⚠️ 포지션 리스크 관리**:
${currentPosition ? `
- 현재 포지션 비율: ${(currentRatio * 100).toFixed(1)}%
- 권장 최대 집중도: 80%
- **중요**: 이미 ${(currentRatio * 100).toFixed(1)}% 보유 중입니다.
  * 포지션 50% 이상: 추가 매수는 매우 강한 신호(+0.3 이상)만 고려하세요.
  * 포지션 65% 이상: 조정값을 보수적으로 적용하세요 (긍정 신호도 신중히).
  * 포지션 80% 이상: 추가 매수 불가, 매도만 고려하세요.
` : `
- 현재 포지션 비율: 0% (신규 진입)
- 신규 진입이므로 정상적인 기준으로 평가하세요.
`}
${sentimentScore === 0 && fmpDataText
  ? `**⚠️ CRITICAL**: Alpha Vantage가 뉴스를 찾지 못했습니다 (sentiment = 0.00).
FMP 뉴스 헤드라인이 유일한 정보원입니다!
- FMP "최근 뉴스" 헤드라인을 면밀히 분석하세요 (earnings beat, margin expansion, growth 등)
- 긍정적인 뉴스(실적 상회, 성장, 신규 계약 등) → **반드시 +0.2 ~ +0.5 적극 조정**
- 부정적인 뉴스(실적 부진, 소송, 구조조정 등) → **-0.2 ~ -0.5 조정**
- 뉴스가 중립적이거나 정보가 없을 때만 0.00 유지`
  : `**중요**: Alpha Vantage 감성 점수 ${sentimentScore.toFixed(2)}는 이미 기초 점수에 반영되어 있습니다. FMP 데이터를 추가로 고려하여 조정하세요.`}

## 응답 형식 (JSON):
{
  "adjustment": +0.30,
  "reasoning": "SEC 문서 $100M 투자 확정으로 강한 긍정 신호 (+0.30)"
}`;

    try {
      const response = await this.chatModel.invoke([
        new SystemMessage('You are a professional trader. Always respond with valid JSON only.'),
        new HumanMessage(prompt)
      ], {
        response_format: { type: "json_object" }
      });

      const responseText = response.content as string || '{}';
      console.log('🤖 GPT raw response:', responseText);

      const gptResponse = JSON.parse(responseText);
      let gptAdjustment = gptResponse.adjustment || 0;
      let aiReasoning = gptResponse.reasoning || '판단 없음';

      // === 5단계: 안전장치 (±0.5 제한) ===
      if (Math.abs(gptAdjustment) > 0.5) {
        console.warn(`⚠️ GPT 조정이 ±0.5 초과 (${gptAdjustment.toFixed(2)}), 제한 적용`);
        gptAdjustment = Math.sign(gptAdjustment) * 0.5;
        aiReasoning += ` (조정값이 제한됨: ±0.5)`;
      }

      // === 5-1단계: 포지션 비율 기반 조정값 감쇠 ===
      if (currentPosition && currentRatio > 0.5 && gptAdjustment > 0) {
        // 50% 이상 보유 중이면 긍정 조정값 감소
        const dampingFactor = Math.max(0.3, 1 - ((currentRatio - 0.5) * 1.5)); // 50%부터 감쇠 시작
        const originalAdjustment = gptAdjustment;
        gptAdjustment *= dampingFactor;

        aiReasoning += ` [포지션 ${(currentRatio * 100).toFixed(1)}%로 조정값 ${originalAdjustment.toFixed(2)} → ${gptAdjustment.toFixed(2)} 감쇠]`;
        console.log(`⚖️ 포지션 감쇠: ${originalAdjustment.toFixed(2)} → ${gptAdjustment.toFixed(2)} (비율: ${(currentRatio * 100).toFixed(1)}%)`);
      }

      // 80% 이상 보유 시 추가 매수 차단
      if (currentPosition && currentRatio >= 0.8 && gptAdjustment > 0) {
        gptAdjustment = Math.min(0, gptAdjustment); // 긍정 조정 무효화
        aiReasoning += ` [포지션 ${(currentRatio * 100).toFixed(1)}% 집중도 초과 - 추가 매수 차단]`;
        console.warn(`⚠️ 집중도 초과: 포지션 ${(currentRatio * 100).toFixed(1)}% ≥ 80%, 추가 매수 차단`);
      }

      const finalScore = Math.max(-1.0, Math.min(1.0, baseScore + gptAdjustment));

      console.log(`🎯 GPT 조정: ${gptAdjustment >= 0 ? '+' : ''}${gptAdjustment.toFixed(2)}`);
      console.log(`📈 최종 점수: ${finalScore.toFixed(2)}`);
      console.log(`💭 GPT 판단: ${aiReasoning}`);

      // === 6단계: 목표 기반 리밸런싱 결정 ===
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let quantity = 0;
      let sellType: 'FULL' | 'PARTIAL' | undefined;
      let actionType: ActionType = 'HOLD';
      let shouldTrade = false;

      // 6-1. 현재 포지션 비율은 이미 line 412-413에서 계산됨 (currentRatio, currentPositionValue)

      // 6-2. 목표 포지션 비율 계산
      const targetRatio = this.calculateTargetPositionRatio(finalScore);

      console.log(`📊 포지션 리밸런싱 분석:`);
      console.log(`   현재 포지션 비율: ${(currentRatio * 100).toFixed(1)}% (${currentPosition?.quantity || 0}주, $${currentPositionValue.toFixed(2)})`);
      console.log(`   목표 포지션 비율: ${targetRatio >= 0 ? (targetRatio * 100).toFixed(1) + '%' : '유지'}`);

      // 6-3. Stop Loss / Take Profit 체크 (우선순위)
      console.log(`\n🔍 포지션 & Stop Loss/Take Profit 체크 상세:`);
      console.log(`   현재 포지션: ${currentPosition ? currentPosition.quantity + '주 @ $' + currentPosition.entryPrice.toFixed(2) : '없음'}`);
      console.log(`   현재가: $${currentPrice.toFixed(2)}`);

      if (currentPosition) {
        console.log(`   진입가: $${currentPosition.entryPrice.toFixed(2)}`);
        console.log(`   수익률: ${profitPercent > 0 ? '+' : ''}${profitPercent.toFixed(2)}%`);
        console.log(`   미실현 손익: ${currentPosition.unrealizedPL >= 0 ? '+' : ''}$${currentPosition.unrealizedPL.toFixed(2)}`);
        console.log(`   Stop Loss 기준: -${stopLoss}%`);
        console.log(`   Take Profit 기준: +${takeProfit}%`);

        const isStopLoss = profitPercent <= -stopLoss;
        const isTakeProfit = profitPercent >= takeProfit;

        console.log(`   Stop Loss 도달 여부: ${isStopLoss ? '⚠️ YES' : '✅ NO'} (${profitPercent.toFixed(2)}% <= -${stopLoss}%)`);
        console.log(`   Take Profit 도달 여부: ${isTakeProfit ? '✅ YES' : '❌ NO'} (${profitPercent.toFixed(2)}% >= +${takeProfit}%)`);

        if (isStopLoss) {
          console.log(`\n⚠️ ===== STOP LOSS 도달 (-${stopLoss}%) ===== `);
          console.log(`   현재 수익률: ${profitPercent.toFixed(2)}%`);
          console.log(`   → 전량 매도 실행`);
          action = 'SELL';
          quantity = currentPosition.quantity;
          sellType = 'FULL';
          actionType = 'FULL_EXIT';
          shouldTrade = true;
          aiReasoning = `Stop Loss 도달 (${profitPercent.toFixed(2)}%). ${aiReasoning}`;
        } else if (isTakeProfit) {
          console.log(`\n✅ ===== TAKE PROFIT 도달 (+${takeProfit}%) =====`);
          console.log(`   현재 수익률: ${profitPercent.toFixed(2)}%`);
          console.log(`   → 전량 매도 실행`);
          action = 'SELL';
          quantity = currentPosition.quantity;
          sellType = 'FULL';
          actionType = 'FULL_EXIT';
          shouldTrade = true;
          aiReasoning = `Take Profit 도달 (${profitPercent.toFixed(2)}%). ${aiReasoning}`;
        } else {
          console.log(`   → Stop Loss/Take Profit 미도달, 목표 기반 리밸런싱 검토`);
        }
      } else {
        console.log(`   → 보유 포지션 없음, 신규 진입 검토`);
      }

      // 6-4. Stop Loss/Take Profit 미도달시 목표 기반 리밸런싱
      if (!shouldTrade && targetRatio >= 0) {
        const deltaRatio = targetRatio - currentRatio;
        console.log(`   델타 비율: ${(deltaRatio * 100).toFixed(1)}%`);

        if (deltaRatio > 0.05) {
          // 추가 매수 필요
          action = 'BUY';
          actionType = currentPosition ? 'ADD_TO_POSITION' : 'NEW_POSITION';

          // Kelly Criterion으로 목표 수량 계산
          const targetValue = fundAllocation * targetRatio;
          const additionalValue = targetValue - currentPositionValue;
          const limitPriceOffset = this.calculateLimitPriceOffset(finalScore);
          const estimatedLimitPrice = currentPrice * (1 + limitPriceOffset);
          quantity = Math.floor(additionalValue / estimatedLimitPrice);

          if (quantity > 0) {
            shouldTrade = true;
            console.log(`📈 추가 매수: ${quantity}주 (목표 비율 ${(targetRatio * 100).toFixed(1)}% 도달)`);
          }

        } else if (deltaRatio < -0.05) {
          // 일부 매도 필요
          if (currentPosition && currentPosition.quantity > 0) {
            action = 'SELL';

            const targetValue = fundAllocation * targetRatio;
            const reduceValue = currentPositionValue - targetValue;
            quantity = Math.floor(reduceValue / currentPrice);

            // 전량 매도 vs 일부 매도
            if (quantity >= currentPosition.quantity || targetRatio === 0) {
              quantity = currentPosition.quantity;
              sellType = 'FULL';
              actionType = 'FULL_EXIT';
              console.log(`📉 전량 매도: ${quantity}주 (목표 비율 ${(targetRatio * 100).toFixed(1)}%)`);
            } else if (quantity > 0) {
              sellType = 'PARTIAL';
              actionType = 'PARTIAL_EXIT';
              console.log(`📉 일부 매도: ${quantity}주 / ${currentPosition.quantity}주 (목표 비율 ${(targetRatio * 100).toFixed(1)}% 도달)`);
            }

            if (quantity > 0) shouldTrade = true;
          }

        } else {
          // 델타가 작음 → HOLD
          action = 'HOLD';
          actionType = 'HOLD';
          quantity = 0;
          console.log(`✋ 포지션 유지 (델타 ${(deltaRatio * 100).toFixed(1)}% < 임계값 ±5%)`);
        }

      } else if (!shouldTrade && targetRatio === -1) {
        // 중립 신호 → HOLD
        action = 'HOLD';
        actionType = 'HOLD';
        quantity = 0;
        console.log(`✋ 포지션 유지 (중립 신호)`);
      }

      // === 7단계: 매수/매도 가격 계산 ===
      let limitPrice: number | undefined;

      if (action === 'BUY' && quantity > 0) {
        // 기계적 오프셋: +0.15%
        const buyOffset = 0.0015;
        const rawLimitPrice = currentPrice * (1 + buyOffset);

        // 🆕 Alpaca 가격 규칙 준수: $1 이상은 소수점 2자리, $1 미만은 4자리
        limitPrice = currentPrice >= 1
          ? parseFloat(rawLimitPrice.toFixed(2))
          : parseFloat(rawLimitPrice.toFixed(4));

        console.log(`💰 매수 전략:`);
        console.log(`   현재가: $${currentPrice.toFixed(2)}`);
        console.log(`   오프셋: +${(buyOffset * 100).toFixed(2)}%`);
        console.log(`   계산된 가격: $${rawLimitPrice.toFixed(5)} → 반올림: $${limitPrice.toFixed(2)}`);
        console.log(`   리미트 가격: $${limitPrice.toFixed(2)}`);
        console.log(`   ${currentPosition ? '추가' : '신규'} 매수 수량: ${quantity}주`);
        console.log(`   예상 투자액: $${(quantity * limitPrice).toFixed(2)}`);
      } else if (action === 'SELL' && quantity > 0) {
        // 기계적 오프셋: -0.10%
        const sellOffset = -0.001;
        const rawLimitPrice = currentPrice * (1 + sellOffset);

        // 🆕 Alpaca 가격 규칙 준수: $1 이상은 소수점 2자리, $1 미만은 4자리
        limitPrice = currentPrice >= 1
          ? parseFloat(rawLimitPrice.toFixed(2))
          : parseFloat(rawLimitPrice.toFixed(4));

        console.log(`💰 매도 전략:`);
        console.log(`   현재가: $${currentPrice.toFixed(2)}`);
        console.log(`   오프셋: ${(sellOffset * 100).toFixed(2)}%`);
        console.log(`   계산된 가격: $${rawLimitPrice.toFixed(5)} → 반올림: $${limitPrice.toFixed(2)}`);
        console.log(`   리미트 가격: $${limitPrice.toFixed(2)}`);
        console.log(`   매도 타입: ${sellType === 'FULL' ? '전량 매도' : '일부 매도'}`);
        console.log(`   매도 수량: ${quantity}주 / ${currentPosition?.quantity}주`);
        console.log(`   예상 매도액: $${(quantity * limitPrice).toFixed(2)}`);
        console.log(`   예상 손익: ${profitPercent > 0 ? '+' : ''}${((limitPrice - (currentPosition?.entryPrice || 0)) * quantity).toFixed(2)}`);
      }

      console.log(`🎯 최종 결정: ${action} ${quantity > 0 ? `(${quantity}주)` : ''}`);

      return {
        shouldTrade,
        action,
        actionType,  // 🆕 액션 타입 추가
        objectiveScore: {
          sentiment: sentimentScore,
          technical: technicalScore,
          baseScore
        },
        gptAdjustment,
        finalScore,
        objectiveReasoning,
        aiReasoning,
        limitPrice,
        quantity,
        sellType
      };

    } catch (error: any) {
      console.error('❌ GPT 분석 실패:', error);

      // GPT 실패시 기본 로직
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

      if (currentPosition) {
        // 보유 중: Stop Loss/Take Profit 체크
        if (profitPercent <= -stopLoss) {
          action = 'SELL';
        } else if (profitPercent >= takeProfit) {
          action = 'SELL';
        } else if (baseScore >= 0.5) {
          action = 'BUY'; // 추가 매수
        }
      } else {
        // 보유 없음: 기초 점수로 판단
        if (baseScore >= 0.2) {
          action = 'BUY';
        }
      }

      // 🆕 Alpaca 가격 규칙 준수: $1 이상은 소수점 2자리, $1 미만은 4자리
      const roundedPrice = currentPrice >= 1
        ? parseFloat(currentPrice.toFixed(2))
        : parseFloat(currentPrice.toFixed(4));

      // Map action to actionType
      let actionType: ActionType;
      if (action === 'BUY') {
        actionType = currentPosition ? 'ADD_TO_POSITION' : 'NEW_POSITION';
      } else if (action === 'SELL') {
        actionType = 'FULL_EXIT';
      } else {
        actionType = 'HOLD';
      }

      return {
        shouldTrade: action !== 'HOLD',
        action,
        actionType,
        objectiveScore: {
          sentiment: sentimentScore,
          technical: technicalScore,
          baseScore
        },
        gptAdjustment: 0,
        finalScore: baseScore,
        objectiveReasoning,
        aiReasoning: `GPT 분석 실패 (${error.message}). 기본 로직으로 판단.`,
        limitPrice: roundedPrice,
        quantity: action === 'BUY' ? Math.floor((fundAllocation * 0.3) / currentPrice) : (currentPosition?.quantity || 0),
        sellType: action === 'SELL' && currentPosition ? 'FULL' : undefined
      };
    }
  }

  /**
   * 리미트 오더 실행
   */
  async executeLimitOrder(
    symbol: string,
    action: 'BUY' | 'SELL',
    quantity: number,
    limitPrice: number,
    botId?: string
  ) {
    console.log(`\n📝 리미트 오더 실행 중...`);
    console.log(`   종목: ${symbol}`);
    console.log(`   행동: ${action}`);
    console.log(`   수량: ${quantity}주`);
    console.log(`   리미트 가격: $${limitPrice.toFixed(2)}`);

    try {
      const side = action === 'BUY' ? 'buy' : 'sell';

      const result = await alpacaTradingService.placeLimitOrder(
        symbol,
        quantity,
        side,
        limitPrice,
        botId
      );

      console.log(`✅ 리미트 오더 성공: ${result.orderId}`);

      return {
        success: true,
        orderId: result.orderId,
        message: `${action} 리미트 오더 실행 완료 (${quantity}주 @ $${limitPrice.toFixed(2)})`
      };

    } catch (error: any) {
      console.error(`❌ 리미트 오더 실패:`, error);

      return {
        success: false,
        error: error.message || '리미트 오더 실행 실패',
        message: `${action} 리미트 오더 실행 실패`
      };
    }
  }
}

export const aiTradingService = new AITradingService();
