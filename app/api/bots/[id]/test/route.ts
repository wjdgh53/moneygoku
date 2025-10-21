import { NextRequest, NextResponse } from 'next/server';
import { botTestService } from '@/lib/services/botTestService';
import { marketDataService } from '@/lib/services/marketDataService';
import { technicalIndicatorService } from '@/lib/services/technicalIndicatorService';
import { alpacaTradingService } from '@/lib/services/alpacaTradingService';
import { prisma } from '@/lib/prisma';
import { parseAnalystRating } from '@/lib/types/analyst';

// POST /api/bots/[id]/test - Run bot test
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get bot details
    const bot = await prisma.bot.findUnique({
      where: { id },
      include: { strategy: true }
    });

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    // Parse analyst rating if available
    const analystRating = parseAnalystRating(bot.analystRating);

    // Get current real-time price - Alpaca first, then Alpha Vantage fallback
    let currentPrice: number | null = null;
    let priceSource = 'unknown';

    try {
      // 1. Try Alpaca Bars API (highest priority)
      currentPrice = await alpacaTradingService.getLatestPrice(bot.symbol);
      if (currentPrice && currentPrice > 0) {
        priceSource = 'Alpaca';
        console.log(`✅ Real-time price from Alpaca: $${currentPrice}`);
      }
    } catch (alpacaError) {
      console.warn('⚠️ Alpaca bars failed, trying Alpha Vantage...', alpacaError);
    }

    // 2. Fallback to Alpha Vantage if Alpaca fails
    if (!currentPrice || currentPrice <= 0) {
      try {
        currentPrice = await technicalIndicatorService.fetchCurrentPrice(bot.symbol);
        if (currentPrice && currentPrice > 0) {
          priceSource = 'Alpha Vantage';
          console.log(`✅ Real-time price from Alpha Vantage (fallback): $${currentPrice}`);
        }
      } catch (avError) {
        console.error('❌ Alpha Vantage price fetch also failed:', avError);
      }
    }

    // 3. Final validation
    if (!currentPrice || currentPrice <= 0) {
      throw new Error('Failed to fetch current price from any source (Alpaca, Alpha Vantage)');
    }

    console.log(`📊 Using price: $${currentPrice} from ${priceSource}`);

    // Parse strategy configuration with safe defaults
    let entryConditions;
    let exitConditions;
    let strategyName = 'Default Strategy';
    let stopLoss = 5.0;
    let takeProfit = 10.0;

    try {
      if (bot.strategy) {
        strategyName = bot.strategy.name || 'Custom Strategy';

        // Parse entry conditions
        if (bot.strategy.entryConditions) {
          entryConditions = typeof bot.strategy.entryConditions === 'string'
            ? JSON.parse(bot.strategy.entryConditions)
            : bot.strategy.entryConditions;
        }

        // Parse exit conditions
        if (bot.strategy.exitConditions) {
          exitConditions = typeof bot.strategy.exitConditions === 'string'
            ? JSON.parse(bot.strategy.exitConditions)
            : bot.strategy.exitConditions;
        }

        // Get stop loss and take profit from strategy
        if (bot.strategy.stopLoss !== null && bot.strategy.stopLoss !== undefined) {
          stopLoss = bot.strategy.stopLoss;
        }
        if (bot.strategy.takeProfit !== null && bot.strategy.takeProfit !== undefined) {
          takeProfit = bot.strategy.takeProfit;
        }
      }

      // Fallback to default strategy if no entry conditions found
      if (!entryConditions || Object.keys(entryConditions).length === 0) {
        console.warn('⚠️ No entry conditions found, using default RSI strategy');
        entryConditions = {
          rsi: {
            period: 14,
            operator: '<',
            value: 30
          }
        };
      }

    } catch (error) {
      console.error('❌ Strategy parsing failed, using default:', error);
      // Safe fallback strategy
      entryConditions = {
        rsi: {
          period: 14,
          operator: '<',
          value: 30
        }
      };
      exitConditions = {};
    }

    console.log(`🧪 Running test for bot ${bot.name} (${bot.symbol})`);
    console.log(`💰 Current price: $${currentPrice}`);
    console.log(`💼 Allocated fund: $${bot.fundAllocation}`);
    console.log(`📊 Strategy:`, strategyName);
    console.log(`📈 Entry conditions:`, JSON.stringify(entryConditions, null, 2));

    // Build complete strategy object
    const strategyConfig = {
      id: bot.strategy?.id || 'default',
      name: strategyName,
      timeHorizon: bot.strategy?.timeHorizon,
      entryConditions,
      exitConditions: exitConditions || {},
      stopLoss,
      takeProfit
    };

    // Run the test
    const report = await botTestService.runTest(
      strategyConfig,
      bot.symbol,
      currentPrice,
      bot.fundAllocation,
      bot.id,
      analystRating
    );

    return NextResponse.json({
      success: true,
      report,
      message: `Test completed for ${bot.name}`
    });

  } catch (error) {
    console.error('Error running bot test:', error);
    return NextResponse.json(
      { error: 'Failed to run bot test', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}