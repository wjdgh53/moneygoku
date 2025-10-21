/**
 * Bulk Bot Test API Endpoint
 *
 * POST /api/bots/bulk/test
 *
 * Runs tests on ALL ACTIVE bots regardless of their schedule.
 * Tests are executed in parallel for optimal performance.
 * Reuses the existing individual bot test logic.
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   summary: {
 *     total: number,
 *     tested: number,
 *     passed: number,
 *     failed: number,
 *     skipped: number
 *   },
 *   results: BotTestResult[]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { botTestService } from '@/lib/services/botTestService';
import { technicalIndicatorService } from '@/lib/services/technicalIndicatorService';

/**
 * Interface for individual bot test result
 */
interface BotTestResult {
  botId: string;
  botName: string;
  symbol: string;
  status: 'passed' | 'failed' | 'skipped';
  report?: any;
  error?: string;
  executionTime?: number;
}

/**
 * Run test for a single bot (reuses existing logic)
 */
async function runBotTest(bot: any): Promise<BotTestResult> {
  const startTime = Date.now();

  try {
    console.log(`[BulkTest] Testing bot: ${bot.name} (${bot.symbol})`);

    // Get current real-time price from Alpha Vantage
    let currentPrice: number;
    try {
      const price = await technicalIndicatorService.fetchCurrentPrice(bot.symbol);
      if (price) {
        currentPrice = price;
        console.log(`[BulkTest] ${bot.symbol} real-time price: $${currentPrice}`);
      } else {
        throw new Error('No real-time price available');
      }
    } catch (error) {
      console.error(`[BulkTest] ${bot.symbol} price fetch failed:`, error);
      return {
        botId: bot.id,
        botName: bot.name,
        symbol: bot.symbol,
        status: 'failed',
        error: 'Failed to fetch current price from Alpha Vantage'
      };
    }

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
        console.warn(`[BulkTest] ${bot.symbol} no entry conditions, using default RSI strategy`);
        entryConditions = {
          rsi: {
            period: 14,
            operator: '<',
            value: 30
          }
        };
      }

    } catch (error) {
      console.error(`[BulkTest] ${bot.symbol} strategy parsing failed, using default:`, error);
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

    // Run the test (reusing existing service)
    const report = await botTestService.runTest(
      strategyConfig,
      bot.symbol,
      currentPrice,
      bot.fundAllocation,
      bot.id
    );

    const executionTime = Date.now() - startTime;

    return {
      botId: bot.id,
      botName: bot.name,
      symbol: bot.symbol,
      status: 'passed',
      report,
      executionTime
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[BulkTest] Error testing bot ${bot.name}:`, error);

    return {
      botId: bot.id,
      botName: bot.name,
      symbol: bot.symbol,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime
    };
  }
}

/**
 * POST handler for bulk bot testing
 */
export async function POST(request: NextRequest) {
  const overallStartTime = Date.now();

  try {
    console.log('[BulkTest] Starting bulk bot test operation');

    // Get all ACTIVE bots with their strategies
    const activeBots = await prisma.bot.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        strategy: true
      }
    });

    console.log(`[BulkTest] Found ${activeBots.length} active bot(s)`);

    if (activeBots.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active bots to test',
        summary: {
          total: 0,
          tested: 0,
          passed: 0,
          failed: 0,
          skipped: 0
        },
        results: [],
        executionTime: Date.now() - overallStartTime
      });
    }

    // Run tests in parallel for all active bots
    console.log('[BulkTest] Running tests in parallel...');
    const results = await Promise.all(
      activeBots.map(bot => runBotTest(bot))
    );

    // Calculate summary statistics
    const summary = {
      total: activeBots.length,
      tested: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length
    };

    const totalExecutionTime = Date.now() - overallStartTime;

    console.log('[BulkTest] Completed:', summary);
    console.log(`[BulkTest] Total execution time: ${totalExecutionTime}ms`);

    return NextResponse.json({
      success: true,
      message: `Tested ${summary.tested} bot(s): ${summary.passed} passed, ${summary.failed} failed`,
      summary,
      results,
      executionTime: totalExecutionTime
    });

  } catch (error) {
    const totalExecutionTime = Date.now() - overallStartTime;
    console.error('[BulkTest] Error during bulk test:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run bulk bot test',
        details: error instanceof Error ? error.message : 'Unknown error',
        executionTime: totalExecutionTime
      },
      { status: 500 }
    );
  }
}
