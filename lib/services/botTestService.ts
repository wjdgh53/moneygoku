// Bot Test Service - Execute strategy test runs without saving results
import { technicalIndicatorService } from './technicalIndicatorService';
import { alpacaTradingService, TradeResponse } from './alpacaTradingService';
import { prisma } from '@/lib/prisma';
import { newsAnalysisService, NewsAnalysis } from './newsAnalysisService';
import { aiTradingService, AITradeDecision } from './aiTradingService';
import { reportStorageService } from './reportStorageService';
import { AnalystRating } from './fmpAnalystService';
import { FMPNewsData } from '@/lib/types/fmpNews';
import { fmpNewsService } from './fmpNewsService';
import { ParsedFMPData } from '@/lib/utils/fmpDataParser';

export interface TestReport {
  symbol: string;
  timestamp: string;
  executionTime: number; // ms
  currentPrice?: number; // Current price at test time

  // Target price calculations based on strategy risk settings
  targetPrice?: number; // Take profit target price
  stopLossPrice?: number; // Stop loss price
  takeProfitPercent?: number; // Take profit percentage from strategy
  stopLossPercent?: number; // Stop loss percentage from strategy

  apiCalls: {
    indicator: string;
    params: any;
    result: number | { [key: string]: number };
    responseTime: number;
    success: boolean;
  }[];

  conditions: {
    condition: string;
    actual: string;
    result: boolean;
    details?: string;
  }[];

  finalDecision: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
  error?: string;

  // Trading execution
  tradeExecuted?: boolean;
  tradeResult?: TradeResponse;

  // 🆕 News analysis
  newsAnalysis?: NewsAnalysis;

  // 🆕 AI trade decision
  aiDecision?: AITradeDecision;

  // 🆕 FMP News data (raw)
  fmpNews?: FMPNewsData;

  // 🆕 Parsed FMP data (for display)
  parsedFmpData?: ParsedFMPData;
}

export interface StrategyCondition {
  rsi?: { period: number; operator: '<' | '>'; value: number };
  sma?: { period: number; operator: 'price_above' | 'price_below' };
  ema?: { period: number; operator: 'price_above' | 'price_below' };
  macd?: { operator: 'histogram_positive' | 'histogram_negative' | 'bullish_crossover' | 'bearish_crossover' };
  bollinger?: {
    period: number;
    operator: 'price_above_upper' | 'price_below_lower' | 'price_in_middle' |
              'price_below_upper' | 'price_above_lower' | 'price_above_middle' | 'price_below_middle' |
              'price_approaching_upper' | 'price_approaching_lower' | 'band_squeeze' | 'band_expansion'
  };
  stochastic?: { fastkperiod?: number; slowkperiod?: number; slowdperiod?: number; operator: 'oversold' | 'overbought' | 'bullish_cross' | 'bearish_cross'; kValue?: number; dValue?: number };
  // 🆕 Crossover detection
  smaCrossover?: { fastPeriod: number; slowPeriod: number; operator: 'golden_cross' | 'death_cross' };
  emaCrossover?: { fastPeriod: number; slowPeriod: number; operator: 'bullish_cross' | 'bearish_cross' };
}

export interface ExitConditions {
  // Risk Management
  stopLoss?: {
    enabled: boolean;
    type: 'percentage' | 'fixed_price' | 'atr_based';
    value: number;
    trailingEnabled?: boolean;
    trailingDistance?: number;
  };
  takeProfit?: {
    enabled: boolean;
    type: 'percentage' | 'fixed_price' | 'risk_reward_ratio';
    value: number;
    partialTakingEnabled?: boolean;
    partialLevels?: { percentage: number; exitPercent: number }[];
  };

  // Technical Indicators
  indicators?: string[];
  rsi?: {
    period: number;
    exitSignal: 'overbought' | 'momentum_reversal' | 'divergence';
    overboughtThreshold?: number;
    momentumThreshold?: number;
  };
  macd?: {
    exitSignal: 'bearish_crossover' | 'histogram_negative' | 'divergence';
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
  };
  sma?: {
    period: number;
    exitSignal: 'price_below' | 'slope_negative' | 'cross_below';
  };
  ema?: {
    period: number;
    exitSignal: 'price_below' | 'slope_negative' | 'cross_below';
  };
  bb?: {
    period: number;
    stdDev: number;
    exitSignal: 'touch_upper' | 'break_middle_down' | 'squeeze_release';
  };
  stochastic?: {
    fastkperiod: number;
    slowkperiod: number;
    slowdperiod: number;
    exitSignal: 'overbought' | 'bearish_cross' | 'divergence';
    overboughtThreshold?: number;
  };

  // Time-Based
  timeBasedExit?: {
    enabled: boolean;
    maxHoldTime?: number; // minutes
    endOfDayExit?: boolean;
    weekendExit?: boolean;
  };

  // Advanced
  riskRewardRatio?: number;
  maxDrawdown?: number;
  volatilityExit?: {
    enabled: boolean;
    threshold: number;
    period: number;
  };
}

export interface BotStrategy {
  id: string;
  name: string;
  timeHorizon?: string; // SHORT_TERM, SWING, LONG_TERM
  entryConditions: StrategyCondition;
  exitConditions: ExitConditions | StrategyCondition; // Support both old and new formats
  stopLoss?: number; // Stop loss percentage (e.g., 5.0 for 5%) - backward compatibility
  takeProfit?: number; // Take profit percentage (e.g., 10.0 for 10%) - backward compatibility
}

class BotTestService {
  // Convert timeHorizon to Alpha Vantage interval
  private getIntervalFromTimeHorizon(timeHorizon?: string): string {
    switch (timeHorizon) {
      case 'SHORT_TERM':
        return '15min'; // Day trading: 15-minute candles
      case 'SWING':
        return '60min'; // Swing trading: 1-hour candles
      case 'LONG_TERM':
        return 'daily'; // Position trading: daily candles
      default:
        console.warn(`⚠️ Unknown timeHorizon: ${timeHorizon}, defaulting to daily`);
        return 'daily'; // Default to daily if timeHorizon is not provided
    }
  }

  // Convert DB strategy format to test service format
  private convertDBStrategyToTestFormat(dbConditions: any): StrategyCondition {
    const converted: StrategyCondition = {};

    // Handle null or undefined
    if (!dbConditions) {
      return converted;
    }

    // ===== NEW FORMAT: rules-based strategy conditions =====
    if (dbConditions.rules && Array.isArray(dbConditions.rules)) {
      console.log('🔄 Converting rules-based strategy format...');

      for (const rule of dbConditions.rules) {
        const { indicator, operator, value, weight } = rule;

        // RSI rules
        if (indicator === 'RSI') {
          converted.rsi = {
            period: 14, // Default RSI period
            operator: operator as '<' | '>',
            value: typeof value === 'number' ? value : 70
          };
        }

        // 🆕 Enhanced SMA rules with crossover support
        else if (indicator === 'SMA_50' || indicator === 'SMA_200' || indicator === 'SMA') {
          // Handle golden/death cross: SMA_50 CROSS_ABOVE SMA_200
          if ((operator === 'CROSS_ABOVE' || operator === 'CROSS_BELOW') && typeof value === 'string' && value.includes('SMA')) {
            // Extract periods from indicator names
            const fastPeriod = indicator === 'SMA_50' ? 50 : indicator === 'SMA_200' ? 200 : 50;
            const slowPeriod = value === 'SMA_200' ? 200 : value === 'SMA_50' ? 50 : 200;

            converted.smaCrossover = {
              fastPeriod,
              slowPeriod,
              operator: operator === 'CROSS_ABOVE' ? 'golden_cross' : 'death_cross'
            };
          } else {
            // Simple SMA price position: PRICE > SMA_200
            const period = indicator === 'SMA_200' ? 200 : indicator === 'SMA_50' ? 50 : 50;
            converted.sma = {
              period,
              operator: operator === '>' ? 'price_above' : 'price_below'
            };
          }
        }

        // 🆕 Enhanced EMA rules with crossover support
        else if (indicator === 'EMA_50' || indicator === 'EMA_200' || indicator === 'EMA') {
          // Handle EMA crossover: EMA_50 CROSS_ABOVE EMA_200
          if ((operator === 'CROSS_ABOVE' || operator === 'CROSS_BELOW') && typeof value === 'string' && value.includes('EMA')) {
            // Extract periods from indicator names
            const fastPeriod = indicator === 'EMA_50' ? 50 : indicator === 'EMA_200' ? 200 : 50;
            const slowPeriod = value === 'EMA_200' ? 200 : value === 'EMA_50' ? 50 : 200;

            converted.emaCrossover = {
              fastPeriod,
              slowPeriod,
              operator: operator === 'CROSS_ABOVE' ? 'bullish_cross' : 'bearish_cross'
            };
          } else {
            // Simple EMA price position: PRICE > EMA_200
            const period = indicator === 'EMA_200' ? 200 : indicator === 'EMA_50' ? 50 : 50;
            converted.ema = {
              period,
              operator: operator === '>' ? 'price_above' : 'price_below'
            };
          }
        }

        // MACD rules
        else if (indicator === 'MACD') {
          if (operator === 'CROSS_ABOVE') {
            converted.macd = { operator: 'bullish_crossover' };
          } else if (operator === 'CROSS_BELOW') {
            converted.macd = { operator: 'bearish_crossover' };
          } else if (operator === '>') {
            converted.macd = { operator: 'histogram_positive' };
          } else if (operator === '<') {
            converted.macd = { operator: 'histogram_negative' };
          }
        }

        // 🆕 Enhanced Bollinger Bands rules with full operator support
        else if (indicator === 'PRICE' && typeof value === 'string') {
          // PRICE compared to BB_UPPER, BB_MIDDLE, BB_LOWER
          if (value === 'BB_UPPER') {
            converted.bollinger = {
              period: 20, // Default BB period
              operator: operator === '>' ? 'price_above_upper' :
                       operator === '<' ? 'price_below_upper' :
                       operator === '>=' ? 'price_above_upper' :
                       operator === '<=' ? 'price_below_upper' : 'price_above_upper'
            };
          } else if (value === 'BB_LOWER') {
            converted.bollinger = {
              period: 20,
              operator: operator === '<' ? 'price_below_lower' :
                       operator === '>' ? 'price_above_lower' :
                       operator === '<=' ? 'price_below_lower' :
                       operator === '>=' ? 'price_above_lower' : 'price_below_lower'
            };
          } else if (value === 'BB_MIDDLE') {
            converted.bollinger = {
              period: 20,
              operator: operator === '>' ? 'price_above_middle' :
                       operator === '<' ? 'price_below_middle' :
                       operator === '>=' ? 'price_above_middle' :
                       operator === '<=' ? 'price_below_middle' : 'price_above_middle'
            };
          }
        }

        // BBANDS direct indicator (fallback for legacy format)
        else if (indicator === 'BBANDS') {
          converted.bollinger = {
            period: 20,
            operator: operator === '>' ? 'price_above_upper' : 'price_below_lower'
          };
        }

        // VOLUME, CHANGE_PERCENT rules are skipped (not technical indicators)
        // They're used in AI scoring but don't need indicator data
      }

      console.log('✅ Converted rules-based format:', converted);
      return converted;
    }

    // ===== OLD FORMAT: legacy strategy conditions =====
    // RSI conversion
    if (dbConditions.rsi) {
      const rsi = dbConditions.rsi;
      let operator: '<' | '>' = '<';

      if (rsi.condition === 'below' || rsi.exitSignal === 'momentum_reversal') {
        operator = '<';
      } else if (rsi.condition === 'above' || rsi.exitSignal === 'overbought') {
        operator = '>';
      }

      converted.rsi = {
        period: rsi.period,
        operator,
        value: rsi.value || rsi.overboughtThreshold || 70
      };
    }

    // SMA conversion
    if (dbConditions.sma) {
      const sma = dbConditions.sma;
      let operator: 'price_above' | 'price_below' = 'price_above';

      if (sma.position === 'above' || sma.exitSignal === 'cross_below') {
        operator = sma.exitSignal === 'cross_below' ? 'price_below' : 'price_above';
      } else if (sma.position === 'below' || sma.exitSignal === 'price_below') {
        operator = 'price_below';
      }

      converted.sma = {
        period: sma.period,
        operator
      };
    }

    // EMA conversion
    if (dbConditions.ema) {
      const ema = dbConditions.ema;
      let operator: 'price_above' | 'price_below' = 'price_above';

      if (ema.position === 'above') {
        operator = 'price_above';
      } else if (ema.position === 'below' || ema.exitSignal === 'price_below') {
        operator = 'price_below';
      }

      converted.ema = {
        period: ema.period,
        operator
      };
    }

    // MACD conversion
    if (dbConditions.macd) {
      const macd = dbConditions.macd;
      let operator: 'histogram_positive' | 'histogram_negative' | 'bullish_crossover' | 'bearish_crossover' = 'histogram_positive';

      // Entry conditions (signal field)
      if (macd.signal === 'bullish_crossover') {
        operator = 'bullish_crossover';
      } else if (macd.signal === 'bearish_crossover') {
        operator = 'bearish_crossover';
      } else if (macd.signal === 'histogram_positive') {
        operator = 'histogram_positive';
      } else if (macd.signal === 'histogram_negative') {
        operator = 'histogram_negative';
      }

      // Exit conditions (exitSignal field) - override if present
      else if (macd.exitSignal === 'bullish_crossover') {
        operator = 'bullish_crossover';
      } else if (macd.exitSignal === 'bearish_crossover') {
        operator = 'bearish_crossover';
      } else if (macd.exitSignal === 'histogram_positive') {
        operator = 'histogram_positive';
      } else if (macd.exitSignal === 'histogram_negative') {
        operator = 'histogram_negative';
      }

      converted.macd = { operator };
    }

    // Bollinger Bands conversion
    if (dbConditions.bb) {
      const bb = dbConditions.bb;
      let operator: 'price_above_upper' | 'price_below_lower' | 'price_in_middle' = 'price_below_lower';

      if (bb.position === 'lower') {
        operator = 'price_below_lower';
      } else if (bb.position === 'upper' || bb.exitSignal === 'touch_upper') {
        operator = 'price_above_upper';
      } else if (bb.position === 'middle') {
        operator = 'price_in_middle';
      }

      converted.bollinger = {
        period: bb.period,
        operator
      };
    }

    // Stochastic conversion
    if (dbConditions.stochastic) {
      const stoch = dbConditions.stochastic;
      let operator: 'oversold' | 'overbought' | 'bullish_cross' | 'bearish_cross' = 'oversold';

      if (stoch.operator === 'oversold' || stoch.exitSignal === 'overbought') {
        operator = stoch.exitSignal === 'overbought' ? 'overbought' : 'oversold';
      } else if (stoch.operator === 'bullish_cross' || stoch.exitSignal === 'bearish_cross') {
        operator = stoch.exitSignal === 'bearish_cross' ? 'bearish_cross' : 'bullish_cross';
      }

      converted.stochastic = {
        fastkperiod: stoch.fastkperiod,
        slowkperiod: stoch.slowkperiod,
        slowdperiod: stoch.slowdperiod,
        operator,
        kValue: stoch.kValue || stoch.overboughtThreshold
      };
    }

    return converted;
  }

  async runTest(strategy: BotStrategy, symbol: string, currentPrice: number, fundAllocation?: number, botId?: string, analystRating?: AnalystRating | null): Promise<TestReport> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Provide default fund allocation if not specified
    const effectiveFundAllocation = fundAllocation ?? 1000; // Default $1000

    console.log(`🎯 Starting bot test for ${symbol} at $${currentPrice} with strategy:`, strategy.name);

    // Determine interval based on timeHorizon
    const interval = this.getIntervalFromTimeHorizon(strategy.timeHorizon);
    console.log(`⏰ Using interval: ${interval} (timeHorizon: ${strategy.timeHorizon || 'not specified'})`);

    // Calculate target prices based on strategy settings
    const takeProfitPercent = strategy.takeProfit || 10.0; // Default 10%
    const stopLossPercent = strategy.stopLoss || 5.0; // Default 5%
    const targetPrice = currentPrice * (1 + takeProfitPercent / 100);
    const stopLossPrice = currentPrice * (1 - stopLossPercent / 100);

    const report: TestReport = {
      symbol,
      timestamp,
      executionTime: 0,
      currentPrice,
      targetPrice,
      stopLossPrice,
      takeProfitPercent,
      stopLossPercent,
      apiCalls: [],
      conditions: [],
      finalDecision: 'HOLD',
      reason: 'No conditions met'
    };

    try {
      console.log(`🚀 Starting test run for ${strategy.name} on ${symbol}`);

      // 🆕 0-1. Fetch current position from Alpaca (실시간 가격 포함)
      let currentPosition: { quantity: number; entryPrice: number; currentValue: number; unrealizedPL: number; unrealizedPLPercent: number } | null = null;
      let alpacaCurrentPrice: number | null = null;

      try {
        const alpacaPosition = await alpacaTradingService.getPosition(symbol);
        if (alpacaPosition && alpacaPosition.qty > 0) {
          alpacaCurrentPrice = alpacaPosition.currentPrice;  // Alpaca 실시간 가격
          currentPosition = {
            quantity: alpacaPosition.qty,
            entryPrice: alpacaPosition.costBasis / alpacaPosition.qty,
            currentValue: alpacaPosition.marketValue,
            unrealizedPL: alpacaPosition.unrealizedPl,
            unrealizedPLPercent: alpacaPosition.unrealizedPlpc
          };
          console.log(`📊 Alpaca 실시간 가격: $${alpacaCurrentPrice.toFixed(2)}`);
          console.log(`📊 현재 보유 포지션 (Alpaca): ${currentPosition.quantity}주 @ $${currentPosition.entryPrice.toFixed(2)} (수익률: ${currentPosition.unrealizedPLPercent > 0 ? '+' : ''}${currentPosition.unrealizedPLPercent.toFixed(2)}%)`);
        } else {
          console.log(`ℹ️  Alpaca 포지션 없음 - DB Position 확인 중...`);

          // 🆕 Alpaca에 없으면 DB Position 확인 (fallback)
          if (botId) {
            const dbPosition = await prisma.position.findUnique({
              where: {
                botId_symbol: { botId, symbol }
              }
            });

            if (dbPosition && dbPosition.quantity > 0) {
              console.log(`✅ DB Position 발견: ${dbPosition.quantity}주 @ $${dbPosition.avgEntryPrice.toFixed(2)}`);

              // DB 포지션을 currentPosition으로 사용
              const unrealizedPL = (dbPosition.quantity * currentPrice) - dbPosition.totalCost;
              const unrealizedPLPercent = (unrealizedPL / dbPosition.totalCost) * 100;

              currentPosition = {
                quantity: dbPosition.quantity,
                entryPrice: dbPosition.avgEntryPrice,
                currentValue: dbPosition.quantity * currentPrice,
                unrealizedPL: unrealizedPL,
                unrealizedPLPercent: unrealizedPLPercent
              };

              console.log(`📊 현재 보유 포지션 (DB): ${currentPosition.quantity}주 @ $${currentPosition.entryPrice.toFixed(2)} (수익률: ${currentPosition.unrealizedPLPercent > 0 ? '+' : ''}${currentPosition.unrealizedPLPercent.toFixed(2)}%)`);
            } else {
              console.log(`📊 현재 보유 포지션: 없음 (Alpaca & DB 모두 확인)`);
              currentPosition = null;
            }
          }
        }
      } catch (posError: any) {
        // position not found는 정상 케이스이므로 에러 로그를 출력하지 않음
        if (!posError.message?.includes('position does not exist')) {
          console.error(`❌ 포지션 조회 실패:`, posError);
        }

        // 에러 시에도 DB fallback 시도
        if (botId) {
          try {
            const dbPosition = await prisma.position.findUnique({
              where: {
                botId_symbol: { botId, symbol }
              }
            });

            if (dbPosition && dbPosition.quantity > 0) {
              console.log(`✅ DB Position 발견 (Fallback): ${dbPosition.quantity}주`);

              const unrealizedPL = (dbPosition.quantity * currentPrice) - dbPosition.totalCost;
              const unrealizedPLPercent = (unrealizedPL / dbPosition.totalCost) * 100;

              currentPosition = {
                quantity: dbPosition.quantity,
                entryPrice: dbPosition.avgEntryPrice,
                currentValue: dbPosition.quantity * currentPrice,
                unrealizedPL: unrealizedPL,
                unrealizedPLPercent: unrealizedPLPercent
              };
            } else {
              currentPosition = null;
            }
          } catch (dbError) {
            console.error(`❌ DB Position 조회 실패:`, dbError);
            currentPosition = null;
          }
        } else {
          currentPosition = null;
        }
      }

      // 0. Convert DB format to test format if needed
      const convertedEntryConditions = this.convertDBStrategyToTestFormat(strategy.entryConditions);
      console.log('📝 Converted entry conditions:', convertedEntryConditions);

      // 1. Parse required indicators from strategy conditions
      const requiredIndicators = this.parseRequiredIndicators(convertedEntryConditions);
      console.log(`📊 Required indicators:`, requiredIndicators);

      // 2. Fetch all required indicators
      for (const indicator of requiredIndicators) {
        const apiStartTime = Date.now();
        let result: any = null;
        let success = true;

        try {
          switch (indicator.type) {
            case 'rsi':
              result = await technicalIndicatorService.fetchRSI(symbol, interval, indicator.params.period);
              break;
            case 'sma':
              result = await technicalIndicatorService.fetchSMA(symbol, interval, indicator.params.period);
              break;
            case 'ema':
              result = await technicalIndicatorService.fetchEMA(symbol, interval, indicator.params.period);
              break;
            case 'macd':
              result = await technicalIndicatorService.fetchMACD(symbol, interval);
              break;
            case 'bollinger':
              result = await technicalIndicatorService.fetchBollingerBands(symbol, interval, indicator.params.period);
              break;
            case 'stochastic':
              result = await technicalIndicatorService.fetchStochastic(
                symbol,
                interval,
                indicator.params.fastkperiod,
                indicator.params.slowkperiod,
                indicator.params.slowdperiod
              );
              break;
          }

          // Add delay between API calls
          if (requiredIndicators.indexOf(indicator) < requiredIndicators.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          success = false;
          result = null;
          console.error(`❌ Failed to fetch ${indicator.type}:`, error);
        }

        const responseTime = Date.now() - apiStartTime;

        report.apiCalls.push({
          indicator: indicator.type,
          params: indicator.params,
          result,
          responseTime,
          success
        });
      }

      // 3. Evaluate entry conditions ONLY (exit conditions evaluated during actual trading)
      const entryResult = this.evaluateConditions(
        convertedEntryConditions,
        report.apiCalls,
        currentPrice,
        'ENTRY'
      );

      report.conditions.push(...entryResult.conditions);

      // 3.4.5. 🆕 Determine news symbol (underlying asset for leveraged ETFs)
      let newsSymbol = symbol;
      if (botId) {
        try {
          const bot = await prisma.bot.findUnique({
            where: { id: botId },
            select: { underlyingAsset: true }
          });

          if (bot?.underlyingAsset) {
            newsSymbol = bot.underlyingAsset;
            console.log(`📰 Leveraged ETF detected: Using underlying asset "${newsSymbol}" for news analysis (bot symbol: ${symbol})`);
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch bot underlying asset, using symbol:', error);
          // Continue with original symbol
        }
      }

      // 3.5. 🆕 Fetch and analyze news
      console.log(`📰 Analyzing news for ${newsSymbol}...`);
      try {
        const newsAnalysis = await newsAnalysisService.analyzeNews(newsSymbol);
        report.newsAnalysis = newsAnalysis;
        console.log(`✅ News analysis completed: ${newsAnalysis.articles.length} articles found`);
      } catch (error) {
        console.error('❌ News analysis failed:', error);
        report.newsAnalysis = {
          articles: [],
          summary: '뉴스 분석 중 오류가 발생했습니다.',
          sentiment: 0,
          sentimentLabel: 'Neutral'
        };
      }

      // 3.6. 🆕 Fetch FMP news data
      console.log(`📰 Fetching FMP news for ${newsSymbol}...`);
      try {
        const fmpNews = await fmpNewsService.getAllNews(newsSymbol, {
          newsLimit: 5,
          pressReleaseLimit: 5,
          includeSocialSentiment: true
        });
        report.fmpNews = fmpNews;
        console.log(
          `✅ FMP news fetched: ${fmpNews.stockNews.length} news, ${fmpNews.pressReleases.length} releases, ` +
          `${fmpNews.secFilings.length} SEC filings, ${fmpNews.insiderTrades.length} insider trades, ` +
          `${fmpNews.socialSentiment.length} sentiment`
        );

        // 🆕 Parse FMP data for display
        const { parseFMPDataForGPT } = await import('@/lib/utils/fmpDataParser');
        report.parsedFmpData = await parseFMPDataForGPT(fmpNews, newsSymbol);
        console.log(`✅ FMP data parsed for display`);
      } catch (error) {
        console.error('❌ FMP news fetch failed:', error);
        // FMP news is optional - continue without it
        report.fmpNews = {
          stockNews: [],
          pressReleases: [],
          socialSentiment: [],
          secFilings: [],
          insiderTrades: [],
          fetchedAt: new Date().toISOString()
        };
        report.parsedFmpData = undefined;
      }

      // 4. 🆕 AI 통합 거래 결정 (매수/매도/추가매수/일부매도)
      console.log(`🧠 AI 통합 거래 판단 중...`);
      const aiDecision = await aiTradingService.makeUnifiedDecision({
        symbol,
        currentPrice,
        currentPosition,
        technicalSignal: entryResult.allMet,
        technicalConditions: entryResult.conditions,  // 🆕 개별 조건 평가 결과 전달
        newsAnalysis: report.newsAnalysis,
        fundAllocation: effectiveFundAllocation,
        stopLoss: strategy.stopLoss,
        takeProfit: strategy.takeProfit,
        analystRating,
        fmpNewsData: report.fmpNews  // ✅ FMP 뉴스 데이터 전달
      });
      report.aiDecision = aiDecision;

      // 최종 결정은 AI가 내림
      report.finalDecision = aiDecision.action;
      report.reason = `${aiDecision.objectiveReasoning}\n\n🤖 AI 종합 판단:\n${aiDecision.aiReasoning}`;

      // 💼 봇 자금 현황 계산
      const stockValue = currentPosition ? currentPosition.currentValue : 0;
      const availableCash = effectiveFundAllocation;
      const totalValue = stockValue + availableCash;
      const totalReturns = currentPosition ? currentPosition.unrealizedPL : 0;
      const totalReturnsPercent = effectiveFundAllocation > 0 ? (totalReturns / effectiveFundAllocation) * 100 : 0;

      // 💼 자금 현황 출력
      console.log(`\n💼 봇 자금 현황:`);
      console.log(`   할당 자금: $${effectiveFundAllocation.toFixed(2)}`);
      console.log(`   보유 주식: ${currentPosition ? currentPosition.quantity : 0}주 × $${currentPrice.toFixed(2)} = $${stockValue.toFixed(2)}`);
      console.log(`   사용 가능 현금: $${availableCash.toFixed(2)}`);
      console.log(`   총 자산: $${totalValue.toFixed(2)}`);
      console.log(`   총 수익: ${totalReturns >= 0 ? '+' : ''}$${totalReturns.toFixed(2)} (${totalReturnsPercent >= 0 ? '+' : ''}${totalReturnsPercent.toFixed(2)}%)\n`);

      // 🎯 액션 타입 표시
      const actionTypeKorean = {
        'NEW_POSITION': '신규 매수',
        'ADD_TO_POSITION': '추가 매수',
        'PARTIAL_EXIT': '일부 매도',
        'FULL_EXIT': '전량 매도',
        'HOLD': '관망'
      };

      console.log(`🎯 AI 최종 결정: ${aiDecision.action} (${actionTypeKorean[aiDecision.actionType]})`);
      console.log(`📝 객관적 분석:\n${aiDecision.objectiveReasoning}`);
      console.log(`💭 AI 판단:\n${aiDecision.aiReasoning}`);

      // 5. 🆕 Execute AI-driven trade (BUY or SELL)
      if (aiDecision.shouldTrade && aiDecision.quantity && aiDecision.quantity > 0) {
        const action = report.finalDecision;

        // Type guard: only execute if action is BUY or SELL (not HOLD)
        if (action === 'HOLD') {
          console.log('⚠️ Action is HOLD despite shouldTrade=true. Skipping execution.');
        } else {
          console.log(`🚀 AI ${action === 'BUY' ? '매수' : '매도'} 신호 감지!`);

          try {
            const quantity = aiDecision.quantity;
            const limitPrice = aiDecision.limitPrice!;

            console.log(`📊 AI 거래 파라미터:`);
            console.log(`   액션: ${action} ${action === 'SELL' && aiDecision.sellType ? `(${aiDecision.sellType === 'FULL' ? '전량' : '일부'})` : ''}`);
            console.log(`   수량: ${quantity}주`);
            console.log(`   가격: $${limitPrice.toFixed(2)}`);
            console.log(`   총 거래액: $${(quantity * limitPrice).toFixed(2)}`);

            // Execute trade
            const tradeResult = await aiTradingService.executeLimitOrder(
              symbol,
              action,
              quantity,
              limitPrice,
              botId
            );

          // ✅ 성공 여부 정확히 판단: success && orderId 모두 있어야 함
          const isTradeSuccess = tradeResult.success && !!tradeResult.orderId;
          report.tradeExecuted = isTradeSuccess;
          report.tradeResult = tradeResult;

          if (isTradeSuccess) {
            console.log(`✅ ${action} 주문 성공: ${tradeResult.message}`);
            console.log(`   Order ID: ${tradeResult.orderId}`);

            // Create Trade record (성공 시에만)
            if (botId) {
              try {
                await prisma.trade.create({
                  data: {
                    botId,
                    symbol,
                    side: action,
                    quantity,
                    price: limitPrice,
                    total: quantity * limitPrice,
                    status: 'EXECUTED',
                    reason: aiDecision.aiReasoning,
                    alpacaOrderId: tradeResult.orderId  // ✅ Alpaca Order ID 저장
                  }
                });
                console.log(`📝 Trade 레코드 생성 완료`);
              } catch (tradeDbError) {
                console.error(`❌ Trade 레코드 생성 실패:`, tradeDbError);
              }

              // Update Position after trade
              try {
                const existingPosition = await prisma.position.findUnique({
                  where: {
                    botId_symbol: { botId, symbol }
                  }
                });

                if (action === 'BUY') {
                  // 실시간 시장가 조회 (Alpaca 우선, fallback Alpha Vantage)
                  const currentMarketPrice = alpacaCurrentPrice || await technicalIndicatorService.fetchCurrentPrice(symbol) || limitPrice;

                  if (existingPosition) {
                    // 기존 포지션에 추가 매수 - 평균가 재계산
                    const newQuantity = existingPosition.quantity + quantity;
                    const newTotalCost = existingPosition.totalCost + (quantity * limitPrice);
                    const newAvgEntryPrice = newTotalCost / newQuantity;

                    await prisma.position.update({
                      where: { botId_symbol: { botId, symbol } },
                      data: {
                        quantity: newQuantity,
                        avgEntryPrice: newAvgEntryPrice,
                        totalCost: newTotalCost,
                        marketValue: newQuantity * currentMarketPrice,  // 실시간 시장가 사용
                        unrealizedPL: (newQuantity * currentMarketPrice) - newTotalCost
                      }
                    });
                    console.log(`📊 Position 업데이트: ${newQuantity}주 @ 평균 $${newAvgEntryPrice.toFixed(2)}`);
                    console.log(`   현재 시장가: $${currentMarketPrice.toFixed(2)}, 미실현 손익: $${((newQuantity * currentMarketPrice) - newTotalCost).toFixed(2)}`);
                  } else {
                    // 신규 포지션 생성
                    await prisma.position.create({
                      data: {
                        botId,
                        symbol,
                        quantity,
                        avgEntryPrice: limitPrice,
                        totalCost: quantity * limitPrice,
                        marketValue: quantity * currentMarketPrice,  // 실시간 시장가 사용
                        unrealizedPL: (quantity * currentMarketPrice) - (quantity * limitPrice)
                      }
                    });
                    console.log(`📊 Position 생성: ${quantity}주 @ $${limitPrice.toFixed(2)}`);
                    console.log(`   현재 시장가: $${currentMarketPrice.toFixed(2)}, 미실현 손익: $${((quantity * currentMarketPrice) - (quantity * limitPrice)).toFixed(2)}`);
                  }
                } else if (action === 'SELL') {
                  if (existingPosition) {
                    // 실시간 시장가 조회 (Alpaca 우선, fallback Alpha Vantage)
                    const currentMarketPrice = alpacaCurrentPrice || await technicalIndicatorService.fetchCurrentPrice(symbol) || limitPrice;

                    // 실현 손익 계산
                    const realizedPL = (limitPrice - existingPosition.avgEntryPrice) * quantity;
                    console.log(`💰 실현 손익: ${realizedPL >= 0 ? '+' : ''}$${realizedPL.toFixed(2)}`);

                    // Bot.totalReturns 업데이트
                    await prisma.bot.update({
                      where: { id: botId },
                      data: {
                        totalReturns: {
                          increment: realizedPL
                        }
                      }
                    });

                    const newQuantity = existingPosition.quantity - quantity;

                    if (newQuantity <= 0) {
                      // 전량 매도 - Position 삭제
                      await prisma.position.delete({
                        where: { botId_symbol: { botId, symbol } }
                      });
                      console.log(`📊 Position 삭제: 전량 매도 완료`);
                    } else {
                      // 부분 매도 - quantity만 감소
                      const newTotalCost = existingPosition.avgEntryPrice * newQuantity;
                      await prisma.position.update({
                        where: { botId_symbol: { botId, symbol } },
                        data: {
                          quantity: newQuantity,
                          totalCost: newTotalCost,
                          marketValue: newQuantity * currentMarketPrice,  // 실시간 시장가 사용
                          unrealizedPL: (newQuantity * currentMarketPrice) - newTotalCost
                        }
                      });
                      console.log(`📊 Position 업데이트: ${newQuantity}주 남음 @ 평균 $${existingPosition.avgEntryPrice.toFixed(2)}`);
                      console.log(`   현재 시장가: $${currentMarketPrice.toFixed(2)}, 미실현 손익: $${((newQuantity * currentMarketPrice) - newTotalCost).toFixed(2)}`);
                    }
                  } else {
                    console.warn(`⚠️ SELL 시도했지만 Position이 없음`);
                  }
                }
              } catch (positionError) {
                console.error(`❌ Position 업데이트 실패:`, positionError);
              }
            }

            // Portfolio는 /api/account에서 모든 봇 합산으로 계산됨

          } else {
            // ✅ 거래 실패 시 상세 로그 출력
            console.error(`\n❌ ${action} 거래 실패!`);
            console.error(`   실패 이유: ${tradeResult.error || tradeResult.message}`);
            console.error(`   Order ID: ${tradeResult.orderId || 'N/A'}`);
            console.error(`   상세:`, {
              symbol,
              action,
              quantity,
              limitPrice,
              success: tradeResult.success,
              hasOrderId: !!tradeResult.orderId
            });
          }

          } catch (tradeError: any) {
            console.error(`💥 거래 실행 오류:`, tradeError);
            report.tradeExecuted = false;
            report.tradeResult = {
              success: false,
              message: `거래 실행 실패: ${tradeError.message}`,
              error: tradeError.message
            };
          }
        } // end else (action !== 'HOLD')
      } else {
        console.log(`💤 ${report.finalDecision} signal - No trade executed`);
        report.tradeExecuted = false;
      }

      report.executionTime = Date.now() - startTime;
      console.log(`✅ Test completed in ${report.executionTime}ms: ${report.finalDecision}`);

    } catch (error: any) {
      report.error = error.message;
      report.executionTime = Date.now() - startTime;
      console.error(`💥 Test failed:`, error);
    }

    // 🆕 자동으로 리포트 저장
    if (botId) {
      try {
        const reportId = await reportStorageService.saveReport(report, botId);
        console.log(`💾 Report saved with ID: ${reportId}`);
      } catch (saveError) {
        console.error('⚠️ Failed to save report, but test completed:', saveError);
      }
    }

    return report;
  }

  private parseRequiredIndicators(conditions: StrategyCondition): Array<{type: string, params: any}> {
    const indicators: Array<{type: string, params: any}> = [];

    if (conditions.rsi) {
      indicators.push({ type: 'rsi', params: { period: conditions.rsi.period } });
    }
    if (conditions.sma) {
      indicators.push({ type: 'sma', params: { period: conditions.sma.period } });
    }
    if (conditions.ema) {
      indicators.push({ type: 'ema', params: { period: conditions.ema.period } });
    }
    if (conditions.macd) {
      indicators.push({ type: 'macd', params: {} });
    }
    if (conditions.bollinger) {
      indicators.push({ type: 'bollinger', params: { period: conditions.bollinger.period } });
    }
    if (conditions.stochastic) {
      indicators.push({
        type: 'stochastic',
        params: {
          fastkperiod: conditions.stochastic.fastkperiod || 5,
          slowkperiod: conditions.stochastic.slowkperiod || 3,
          slowdperiod: conditions.stochastic.slowdperiod || 3
        }
      });
    }
    // 🆕 SMA Crossover - fetch both fast and slow period SMAs
    if (conditions.smaCrossover) {
      indicators.push({ type: 'sma', params: { period: conditions.smaCrossover.fastPeriod } });
      indicators.push({ type: 'sma', params: { period: conditions.smaCrossover.slowPeriod } });
    }
    // 🆕 EMA Crossover - fetch both fast and slow period EMAs
    if (conditions.emaCrossover) {
      indicators.push({ type: 'ema', params: { period: conditions.emaCrossover.fastPeriod } });
      indicators.push({ type: 'ema', params: { period: conditions.emaCrossover.slowPeriod } });
    }

    return indicators;
  }

  private evaluateConditions(
    conditions: StrategyCondition,
    apiResults: TestReport['apiCalls'],
    currentPrice: number,
    type: 'ENTRY' | 'EXIT'
  ): {
    allMet: boolean;
    reasons: string[];
    failedReasons: string[];
    conditions: TestReport['conditions'];
  } {
    const results: TestReport['conditions'] = [];
    const reasons: string[] = [];
    const failedReasons: string[] = [];

    // RSI condition
    if (conditions.rsi) {
      const rsiCall = apiResults.find(call => call.indicator === 'rsi');
      if (rsiCall && rsiCall.success && typeof rsiCall.result === 'number') {
        const rsiValue = rsiCall.result;
        const condition = conditions.rsi;
        let conditionMet = false;

        if (condition.operator === '<') {
          conditionMet = rsiValue < condition.value;
        } else if (condition.operator === '>') {
          conditionMet = rsiValue > condition.value;
        }

        const operatorSymbol = condition.operator === '<' ? '<' : '>';
        const conditionText = `RSI(${condition.period}) ${operatorSymbol} ${condition.value}`;
        const actualText = `${rsiValue.toFixed(2)} ${operatorSymbol} ${condition.value}`;

        results.push({
          condition: conditionText,
          actual: actualText,
          result: conditionMet,
          details: `RSI ${condition.period}-period = ${rsiValue.toFixed(2)}`
        });

        if (conditionMet) {
          reasons.push(`RSI(${rsiValue.toFixed(2)}) ${condition.operator} ${condition.value}`);
        } else {
          failedReasons.push(`RSI(${rsiValue.toFixed(2)}) not ${condition.operator} ${condition.value}`);
        }
      } else {
        results.push({
          condition: `RSI(${conditions.rsi.period}) ${conditions.rsi.operator} ${conditions.rsi.value}`,
          actual: 'API call failed',
          result: false,
          details: 'Failed to fetch RSI data'
        });
        failedReasons.push('RSI data unavailable');
      }
    }

    // SMA condition
    if (conditions.sma) {
      const smaCall = apiResults.find(call => call.indicator === 'sma');
      if (smaCall && smaCall.success && typeof smaCall.result === 'number') {
        const smaValue = smaCall.result;
        const condition = conditions.sma;
        let conditionMet = false;

        if (condition.operator === 'price_above') {
          conditionMet = currentPrice > smaValue;
        } else if (condition.operator === 'price_below') {
          conditionMet = currentPrice < smaValue;
        }

        const operatorText = condition.operator === 'price_above' ? 'above' : 'below';
        const operatorSymbol = condition.operator === 'price_above' ? '>' : '<';
        const conditionText = `Price ${operatorText} SMA(${condition.period})`;
        const actualText = `${currentPrice} ${operatorSymbol} ${smaValue.toFixed(2)}`;

        results.push({
          condition: conditionText,
          actual: actualText,
          result: conditionMet,
          details: `Price=${currentPrice}, SMA ${condition.period}=${smaValue.toFixed(2)}`
        });

        if (conditionMet) {
          reasons.push(`Price(${currentPrice}) ${operatorText} SMA(${smaValue.toFixed(2)})`);
        } else {
          failedReasons.push(`Price(${currentPrice}) not ${operatorText} SMA(${smaValue.toFixed(2)})`);
        }
      } else {
        failedReasons.push('SMA data unavailable');
      }
    }

    // 🆕 SMA Crossover condition (Golden/Death Cross)
    if (conditions.smaCrossover) {
      const { fastPeriod, slowPeriod, operator } = conditions.smaCrossover;

      // Find both SMA values in API results
      const fastSmaCall = apiResults.find(call =>
        call.indicator === 'sma' && call.params?.period === fastPeriod
      );
      const slowSmaCall = apiResults.find(call =>
        call.indicator === 'sma' && call.params?.period === slowPeriod
      );

      if (fastSmaCall && fastSmaCall.success && typeof fastSmaCall.result === 'number' &&
          slowSmaCall && slowSmaCall.success && typeof slowSmaCall.result === 'number') {

        const fastSma = fastSmaCall.result;
        const slowSma = slowSmaCall.result;
        let conditionMet = false;

        if (operator === 'golden_cross') {
          // Golden Cross: Fast SMA above Slow SMA (bullish)
          conditionMet = fastSma > slowSma;
        } else if (operator === 'death_cross') {
          // Death Cross: Fast SMA below Slow SMA (bearish)
          conditionMet = fastSma < slowSma;
        }

        const operatorText = operator === 'golden_cross' ? 'Golden Cross' : 'Death Cross';
        const crossSymbol = operator === 'golden_cross' ? '>' : '<';
        const conditionText = `SMA(${fastPeriod}) ${crossSymbol} SMA(${slowPeriod})`;
        const actualText = `${fastSma.toFixed(2)} ${crossSymbol} ${slowSma.toFixed(2)}`;

        results.push({
          condition: operatorText,
          actual: actualText,
          result: conditionMet,
          details: `SMA${fastPeriod}=${fastSma.toFixed(2)}, SMA${slowPeriod}=${slowSma.toFixed(2)}`
        });

        if (conditionMet) {
          reasons.push(`${operatorText}: SMA${fastPeriod}(${fastSma.toFixed(2)}) ${crossSymbol} SMA${slowPeriod}(${slowSma.toFixed(2)})`);
        } else {
          failedReasons.push(`No ${operatorText}: SMA${fastPeriod}(${fastSma.toFixed(2)}) ${crossSymbol} SMA${slowPeriod}(${slowSma.toFixed(2)})`);
        }
      } else {
        failedReasons.push(`SMA crossover data unavailable (SMA${fastPeriod} or SMA${slowPeriod})`);
      }
    }

    // MACD condition (with null checks)
    if (conditions.macd) {
      const macdCall = apiResults.find(call => call.indicator === 'macd');
      if (macdCall && macdCall.success && typeof macdCall.result === 'object') {
        const macdData = macdCall.result as { macdLine: number | null; signalLine: number | null; histogram: number | null };

        // Check if all MACD values are valid (not null)
        if (macdData.macdLine !== null && macdData.signalLine !== null && macdData.histogram !== null) {
          const condition = conditions.macd;
          let conditionMet = false;

          if (condition.operator === 'histogram_positive') {
            conditionMet = macdData.histogram > 0;
          } else if (condition.operator === 'histogram_negative') {
            conditionMet = macdData.histogram < 0;
          } else if (condition.operator === 'bullish_crossover') {
            conditionMet = macdData.macdLine > macdData.signalLine;
          } else if (condition.operator === 'bearish_crossover') {
            conditionMet = macdData.macdLine < macdData.signalLine;
          }

          let operatorText = '';
          let actualText = '';

          if (condition.operator === 'histogram_positive') {
            operatorText = 'histogram positive';
            actualText = `Histogram = ${macdData.histogram.toFixed(4)}`;
          } else if (condition.operator === 'histogram_negative') {
            operatorText = 'histogram negative';
            actualText = `Histogram = ${macdData.histogram.toFixed(4)}`;
          } else if (condition.operator === 'bullish_crossover') {
            operatorText = 'bullish crossover';
            actualText = `MACD(${macdData.macdLine.toFixed(4)}) > Signal(${macdData.signalLine.toFixed(4)})`;
          } else if (condition.operator === 'bearish_crossover') {
            operatorText = 'bearish crossover';
            actualText = `MACD(${macdData.macdLine.toFixed(4)}) < Signal(${macdData.signalLine.toFixed(4)})`;
          }

          const conditionText = `MACD ${operatorText}`;

          results.push({
            condition: conditionText,
            actual: actualText,
            result: conditionMet,
            details: `MACD=${macdData.macdLine.toFixed(4)}, Signal=${macdData.signalLine.toFixed(4)}, Hist=${macdData.histogram.toFixed(4)}`
          });

          if (conditionMet) {
            reasons.push(`MACD ${operatorText}`);
          } else {
            failedReasons.push(`MACD ${operatorText} not met`);
          }
        } else {
          failedReasons.push('MACD data unavailable (null values)');
        }
      } else {
        failedReasons.push('MACD data unavailable');
      }
    }

    // EMA condition
    if (conditions.ema) {
      const emaCall = apiResults.find(call => call.indicator === 'ema');
      if (emaCall && emaCall.success && typeof emaCall.result === 'number') {
        const emaValue = emaCall.result;
        const condition = conditions.ema;
        let conditionMet = false;

        if (condition.operator === 'price_above') {
          conditionMet = currentPrice > emaValue;
        } else if (condition.operator === 'price_below') {
          conditionMet = currentPrice < emaValue;
        }

        const operatorText = condition.operator === 'price_above' ? 'above' : 'below';
        const operatorSymbol = condition.operator === 'price_above' ? '>' : '<';
        const conditionText = `Price ${operatorText} EMA(${condition.period})`;
        const actualText = `${currentPrice} ${operatorSymbol} ${emaValue.toFixed(2)}`;

        results.push({
          condition: conditionText,
          actual: actualText,
          result: conditionMet,
          details: `Price=${currentPrice}, EMA ${condition.period}=${emaValue.toFixed(2)}`
        });

        if (conditionMet) {
          reasons.push(`Price(${currentPrice}) ${operatorText} EMA(${emaValue.toFixed(2)})`);
        } else {
          failedReasons.push(`Price(${currentPrice}) not ${operatorText} EMA(${emaValue.toFixed(2)})`);
        }
      } else {
        failedReasons.push('EMA data unavailable');
      }
    }

    // 🆕 EMA Crossover condition (Bullish/Bearish Cross)
    if (conditions.emaCrossover) {
      const { fastPeriod, slowPeriod, operator } = conditions.emaCrossover;

      // Find both EMA values in API results
      const fastEmaCall = apiResults.find(call =>
        call.indicator === 'ema' && call.params?.period === fastPeriod
      );
      const slowEmaCall = apiResults.find(call =>
        call.indicator === 'ema' && call.params?.period === slowPeriod
      );

      if (fastEmaCall && fastEmaCall.success && typeof fastEmaCall.result === 'number' &&
          slowEmaCall && slowEmaCall.success && typeof slowEmaCall.result === 'number') {

        const fastEma = fastEmaCall.result;
        const slowEma = slowEmaCall.result;
        let conditionMet = false;

        if (operator === 'bullish_cross') {
          // Bullish Cross: Fast EMA above Slow EMA
          conditionMet = fastEma > slowEma;
        } else if (operator === 'bearish_cross') {
          // Bearish Cross: Fast EMA below Slow EMA
          conditionMet = fastEma < slowEma;
        }

        const operatorText = operator === 'bullish_cross' ? 'Bullish EMA Cross' : 'Bearish EMA Cross';
        const crossSymbol = operator === 'bullish_cross' ? '>' : '<';
        const conditionText = `EMA(${fastPeriod}) ${crossSymbol} EMA(${slowPeriod})`;
        const actualText = `${fastEma.toFixed(2)} ${crossSymbol} ${slowEma.toFixed(2)}`;

        results.push({
          condition: operatorText,
          actual: actualText,
          result: conditionMet,
          details: `EMA${fastPeriod}=${fastEma.toFixed(2)}, EMA${slowPeriod}=${slowEma.toFixed(2)}`
        });

        if (conditionMet) {
          reasons.push(`${operatorText}: EMA${fastPeriod}(${fastEma.toFixed(2)}) ${crossSymbol} EMA${slowPeriod}(${slowEma.toFixed(2)})`);
        } else {
          failedReasons.push(`No ${operatorText}: EMA${fastPeriod}(${fastEma.toFixed(2)}) ${crossSymbol} EMA${slowPeriod}(${slowEma.toFixed(2)})`);
        }
      } else {
        failedReasons.push(`EMA crossover data unavailable (EMA${fastPeriod} or EMA${slowPeriod})`);
      }
    }

    // Bollinger Bands condition
    if (conditions.bollinger) {
      const bollingerCall = apiResults.find(call => call.indicator === 'bollinger');
      if (bollingerCall && bollingerCall.success && typeof bollingerCall.result === 'object') {
        const bollingerData = bollingerCall.result as { upper: number | null; middle: number | null; lower: number | null };

        // Check if all Bollinger Band values are valid (not null)
        if (bollingerData.upper !== null && bollingerData.middle !== null && bollingerData.lower !== null) {
          const condition = conditions.bollinger;
          let conditionMet = false;

          // 🆕 Extended Bollinger Bands operators
          if (condition.operator === 'price_above_upper') {
            conditionMet = currentPrice > bollingerData.upper;
          } else if (condition.operator === 'price_below_upper') {
            // Exit signal for momentum strategy
            conditionMet = currentPrice < bollingerData.upper;
          } else if (condition.operator === 'price_below_lower') {
            conditionMet = currentPrice < bollingerData.lower;
          } else if (condition.operator === 'price_above_lower') {
            // Exit signal for mean reversion strategy
            conditionMet = currentPrice > bollingerData.lower;
          } else if (condition.operator === 'price_above_middle') {
            conditionMet = currentPrice > bollingerData.middle;
          } else if (condition.operator === 'price_below_middle') {
            // Exit signal for mean reversion when above middle
            conditionMet = currentPrice < bollingerData.middle;
          } else if (condition.operator === 'price_in_middle') {
            conditionMet = currentPrice > bollingerData.lower && currentPrice < bollingerData.upper;
          } else if (condition.operator === 'price_approaching_upper') {
            // Price within 5% of upper band
            const threshold = bollingerData.upper * 0.95;
            conditionMet = currentPrice >= threshold && currentPrice < bollingerData.upper;
          } else if (condition.operator === 'price_approaching_lower') {
            // Price within 5% of lower band
            const threshold = bollingerData.lower * 1.05;
            conditionMet = currentPrice <= threshold && currentPrice > bollingerData.lower;
          } else if (condition.operator === 'band_squeeze') {
            // Band width < 5% of middle band (tight range)
            const bandWidth = (bollingerData.upper - bollingerData.lower) / bollingerData.middle;
            conditionMet = bandWidth < 0.05;
          } else if (condition.operator === 'band_expansion') {
            // Band width > 10% of middle band (volatile)
            const bandWidth = (bollingerData.upper - bollingerData.lower) / bollingerData.middle;
            conditionMet = bandWidth > 0.10;
          }

          let operatorText = '';
          if (condition.operator === 'price_above_upper') operatorText = 'price above upper';
          else if (condition.operator === 'price_below_upper') operatorText = 'price below upper';
          else if (condition.operator === 'price_below_lower') operatorText = 'price below lower';
          else if (condition.operator === 'price_above_lower') operatorText = 'price above lower';
          else if (condition.operator === 'price_above_middle') operatorText = 'price above middle';
          else if (condition.operator === 'price_below_middle') operatorText = 'price below middle';
          else if (condition.operator === 'price_in_middle') operatorText = 'price in middle';
          else if (condition.operator === 'price_approaching_upper') operatorText = 'price approaching upper';
          else if (condition.operator === 'price_approaching_lower') operatorText = 'price approaching lower';
          else if (condition.operator === 'band_squeeze') operatorText = 'band squeeze';
          else if (condition.operator === 'band_expansion') operatorText = 'band expansion';

          const conditionText = `Bollinger ${operatorText}`;
          const actualText = `Price=${currentPrice}, Upper=${bollingerData.upper.toFixed(2)}, Lower=${bollingerData.lower.toFixed(2)}`;

          results.push({
            condition: conditionText,
            actual: actualText,
            result: conditionMet,
            details: `Upper=${bollingerData.upper.toFixed(2)}, Middle=${bollingerData.middle.toFixed(2)}, Lower=${bollingerData.lower.toFixed(2)}`
          });

          if (conditionMet) {
            reasons.push(`Bollinger ${operatorText}`);
          } else {
            failedReasons.push(`Bollinger ${operatorText} not met`);
          }
        } else {
          failedReasons.push('Bollinger Bands data unavailable (null values)');
        }
      } else {
        failedReasons.push('Bollinger Bands data unavailable');
      }
    }

    // Stochastic condition
    if (conditions.stochastic) {
      const stochasticCall = apiResults.find(call => call.indicator === 'stochastic');
      if (stochasticCall && stochasticCall.success && typeof stochasticCall.result === 'object') {
        const stochasticData = stochasticCall.result as { slowK: number | null; slowD: number | null };

        // Check if all Stochastic values are valid (not null)
        if (stochasticData.slowK !== null && stochasticData.slowD !== null) {
          const condition = conditions.stochastic;
          let conditionMet = false;

          if (condition.operator === 'oversold') {
            // Oversold when %K < 20
            conditionMet = stochasticData.slowK < (condition.kValue || 20);
          } else if (condition.operator === 'overbought') {
            // Overbought when %K > 80
            conditionMet = stochasticData.slowK > (condition.kValue || 80);
          } else if (condition.operator === 'bullish_cross') {
            // %K crosses above %D
            conditionMet = stochasticData.slowK > stochasticData.slowD;
          } else if (condition.operator === 'bearish_cross') {
            // %K crosses below %D
            conditionMet = stochasticData.slowK < stochasticData.slowD;
          }

          let operatorText = '';
          if (condition.operator === 'oversold') operatorText = 'oversold';
          else if (condition.operator === 'overbought') operatorText = 'overbought';
          else if (condition.operator === 'bullish_cross') operatorText = 'bullish cross';
          else if (condition.operator === 'bearish_cross') operatorText = 'bearish cross';

          const conditionText = `Stochastic ${operatorText}`;
          const actualText = `%K=${stochasticData.slowK.toFixed(2)}, %D=${stochasticData.slowD.toFixed(2)}`;

          results.push({
            condition: conditionText,
            actual: actualText,
            result: conditionMet,
            details: `SlowK=${stochasticData.slowK.toFixed(2)}, SlowD=${stochasticData.slowD.toFixed(2)}`
          });

          if (conditionMet) {
            reasons.push(`Stochastic ${operatorText}`);
          } else {
            failedReasons.push(`Stochastic ${operatorText} not met`);
          }
        } else {
          failedReasons.push('Stochastic data unavailable (null values)');
        }
      } else {
        failedReasons.push('Stochastic data unavailable');
      }
    }

    return {
      allMet: results.length > 0 && results.every(r => r.result),
      reasons,
      failedReasons,
      conditions: results
    };
  }

  private evaluateExitConditions(
    exitConditions: ExitConditions | StrategyCondition,
    apiResults: TestReport['apiCalls'],
    currentPrice: number,
    targetPrice: number,
    stopLossPrice: number
  ): {
    riskManagementTriggered: boolean;
    technicalExitTriggered: boolean;
    timeBasedExitTriggered: boolean;
    reasons: string[];
    conditions: TestReport['conditions'];
  } {
    const results: TestReport['conditions'] = [];
    const reasons: string[] = [];
    let riskManagementTriggered = false;
    let technicalExitTriggered = false;
    let timeBasedExitTriggered = false;

    // Check if it's the new comprehensive format
    const isNewFormat = 'indicators' in exitConditions || 'stopLoss' in exitConditions || 'takeProfit' in exitConditions;

    if (!isNewFormat) {
      // Backward compatibility: Use old evaluation method
      const oldResult = this.evaluateConditions(
        exitConditions as StrategyCondition,
        apiResults,
        currentPrice,
        'EXIT'
      );
      return {
        riskManagementTriggered: false,
        technicalExitTriggered: oldResult.allMet,
        timeBasedExitTriggered: false,
        reasons: oldResult.reasons,
        conditions: oldResult.conditions
      };
    }

    const conditions = exitConditions as ExitConditions;

    // 1. PRIORITY 1: Risk Management Exits (Always Override)

    // Stop Loss Check
    if (conditions.stopLoss?.enabled) {
      const stopLossTriggered = currentPrice <= stopLossPrice;
      results.push({
        condition: `Stop Loss (${conditions.stopLoss.value}%)`,
        actual: `Current: ${currentPrice}, Stop: ${stopLossPrice.toFixed(2)}`,
        result: stopLossTriggered,
        details: conditions.stopLoss.trailingEnabled ? 'Trailing stop loss active' : 'Fixed stop loss'
      });

      if (stopLossTriggered) {
        riskManagementTriggered = true;
        reasons.push(`Stop loss triggered at ${stopLossPrice.toFixed(2)}`);
      }
    }

    // Take Profit Check
    if (conditions.takeProfit?.enabled) {
      const takeProfitTriggered = currentPrice >= targetPrice;
      results.push({
        condition: `Take Profit (${conditions.takeProfit.value}%)`,
        actual: `Current: ${currentPrice}, Target: ${targetPrice.toFixed(2)}`,
        result: takeProfitTriggered,
        details: conditions.takeProfit.partialTakingEnabled ? 'Partial profit taking enabled' : 'Full profit taking'
      });

      if (takeProfitTriggered) {
        riskManagementTriggered = true;
        reasons.push(`Take profit triggered at ${targetPrice.toFixed(2)}`);
      }
    }

    // 2. PRIORITY 2: Technical Exit Signals
    if (conditions.indicators && conditions.indicators.length > 0 && !riskManagementTriggered) {

      // RSI Exit Signals
      if (conditions.indicators.includes('RSI') && conditions.rsi) {
        const rsiCall = apiResults.find(call => call.indicator === 'rsi');
        if (rsiCall && rsiCall.success && typeof rsiCall.result === 'number') {
          const rsiValue = rsiCall.result;
          let exitTriggered = false;
          let exitReason = '';

          switch (conditions.rsi.exitSignal) {
            case 'overbought':
              const threshold = conditions.rsi.overboughtThreshold || 70;
              exitTriggered = rsiValue > threshold;
              exitReason = `RSI overbought (${rsiValue.toFixed(2)} > ${threshold})`;
              break;
            case 'momentum_reversal':
              const momentumThreshold = conditions.rsi.momentumThreshold || 50;
              exitTriggered = rsiValue < momentumThreshold;
              exitReason = `RSI momentum reversal (${rsiValue.toFixed(2)} < ${momentumThreshold})`;
              break;
            case 'divergence':
              // Simplified divergence check (would need historical data for proper implementation)
              exitTriggered = false;
              exitReason = 'RSI divergence analysis (requires historical data)';
              break;
          }

          results.push({
            condition: `RSI Exit (${conditions.rsi.exitSignal})`,
            actual: exitReason,
            result: exitTriggered,
            details: `RSI ${conditions.rsi.period}-period = ${rsiValue.toFixed(2)}`
          });

          if (exitTriggered) {
            technicalExitTriggered = true;
            reasons.push(exitReason);
          }
        }
      }

      // MACD Exit Signals
      if (conditions.indicators.includes('MACD') && conditions.macd) {
        const macdCall = apiResults.find(call => call.indicator === 'macd');
        if (macdCall && macdCall.success && typeof macdCall.result === 'object') {
          const macdData = macdCall.result as { macdLine: number; signalLine: number; histogram: number };
          let exitTriggered = false;
          let exitReason = '';

          switch (conditions.macd.exitSignal) {
            case 'bearish_crossover':
              exitTriggered = macdData.macdLine < macdData.signalLine;
              exitReason = `MACD bearish crossover (${macdData.macdLine.toFixed(4)} < ${macdData.signalLine.toFixed(4)})`;
              break;
            case 'histogram_negative':
              exitTriggered = macdData.histogram < 0;
              exitReason = `MACD histogram negative (${macdData.histogram.toFixed(4)})`;
              break;
            case 'divergence':
              // Simplified divergence check
              exitTriggered = false;
              exitReason = 'MACD divergence analysis (requires historical data)';
              break;
          }

          results.push({
            condition: `MACD Exit (${conditions.macd.exitSignal})`,
            actual: exitReason,
            result: exitTriggered,
            details: `MACD=${macdData.macdLine.toFixed(4)}, Signal=${macdData.signalLine.toFixed(4)}`
          });

          if (exitTriggered) {
            technicalExitTriggered = true;
            reasons.push(exitReason);
          }
        }
      }

      // Moving Average Exit Signals
      if (conditions.indicators.includes('SMA') && conditions.sma) {
        const smaCall = apiResults.find(call => call.indicator === 'sma');
        if (smaCall && smaCall.success && typeof smaCall.result === 'number') {
          const smaValue = smaCall.result;
          let exitTriggered = false;
          let exitReason = '';

          switch (conditions.sma.exitSignal) {
            case 'price_below':
              exitTriggered = currentPrice < smaValue;
              exitReason = `Price below SMA (${currentPrice} < ${smaValue.toFixed(2)})`;
              break;
            case 'cross_below':
              // Simplified cross below check (would need previous price for proper implementation)
              exitTriggered = currentPrice < smaValue;
              exitReason = `Price crossed below SMA (${currentPrice} < ${smaValue.toFixed(2)})`;
              break;
            case 'slope_negative':
              // Simplified slope check (would need historical MA data)
              exitTriggered = false;
              exitReason = 'SMA slope analysis (requires historical data)';
              break;
          }

          results.push({
            condition: `SMA Exit (${conditions.sma.exitSignal})`,
            actual: exitReason,
            result: exitTriggered,
            details: `Price=${currentPrice}, SMA ${conditions.sma.period}=${smaValue.toFixed(2)}`
          });

          if (exitTriggered) {
            technicalExitTriggered = true;
            reasons.push(exitReason);
          }
        }
      }

      // Similar implementations for EMA, Bollinger Bands, and Stochastic would follow the same pattern
      // ... (implement other indicators as needed)
    }

    // 3. PRIORITY 3: Time-Based Exits
    if (conditions.timeBasedExit?.enabled && !riskManagementTriggered && !technicalExitTriggered) {
      // Time-based exit logic would require position entry time
      // This is a placeholder for demonstration
      const timeBasedExit = false; // Would implement actual time checking here

      if (timeBasedExit) {
        timeBasedExitTriggered = true;
        reasons.push('Maximum hold time exceeded');
      }
    }

    return {
      riskManagementTriggered,
      technicalExitTriggered,
      timeBasedExitTriggered,
      reasons,
      conditions: results
    };
  }
}

export const botTestService = new BotTestService();