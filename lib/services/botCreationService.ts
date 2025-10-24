/**
 * Bot Creation Service
 *
 * Common service for creating trading bots with consistent logic:
 * - Validation
 * - Strategy verification
 * - Duplicate checking
 * - FMP Analyst Rating integration
 * - Bot creation with Prisma
 *
 * Used by both:
 * - POST /api/bots (individual creation)
 * - POST /api/bots/bulk (bulk creation)
 */

import { prisma } from '@/lib/prisma';
import { fmpAnalystService } from '@/lib/services/fmpAnalystService';

export interface CreateBotParams {
  name: string;
  symbol: string;
  strategyId: string;
  fundAllocation: number;
  orderType?: 'MARKET' | 'LIMIT';
  description?: string;
  underlyingAsset?: string | null;
  extendedHours?: boolean;
}

export interface CreateBotResult {
  success: boolean;
  bot?: {
    id: string;
    name: string;
    symbol: string;
    strategyId: string;
    fundAllocation: number;
    analystRating?: string | null;
  };
  error?: {
    code: string;
    message: string;
    symbol?: string;
  };
}

/**
 * Validate bot creation parameters
 */
function validateBotParams(params: CreateBotParams): { valid: boolean; error?: string } {
  if (!params.symbol || typeof params.symbol !== 'string') {
    return { valid: false, error: 'symbol is required and must be a string' };
  }

  if (!params.strategyId || typeof params.strategyId !== 'string') {
    return { valid: false, error: 'strategyId is required and must be a string' };
  }

  if (!params.name || typeof params.name !== 'string') {
    return { valid: false, error: 'name is required and must be a string' };
  }

  if (typeof params.fundAllocation !== 'number' || params.fundAllocation <= 0) {
    return { valid: false, error: 'fundAllocation must be a positive number' };
  }

  if (params.orderType && !['MARKET', 'LIMIT'].includes(params.orderType)) {
    return { valid: false, error: 'orderType must be either MARKET or LIMIT' };
  }

  return { valid: true };
}

/**
 * Main function: Create a single bot with all validation and FMP integration
 */
export async function createBot(params: CreateBotParams): Promise<CreateBotResult> {
  const { name, symbol, strategyId, fundAllocation, orderType, description, underlyingAsset, extendedHours } = params;

  try {
    // 1. Validate input parameters
    const validation = validateBotParams(params);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'INVALID_BOT_DATA',
          message: validation.error!,
          symbol: symbol
        }
      };
    }

    // 2. Check if strategy exists
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId }
    });

    if (!strategy) {
      return {
        success: false,
        error: {
          code: 'STRATEGY_NOT_FOUND',
          message: `Strategy with id ${strategyId} not found`,
          symbol: symbol
        }
      };
    }

    // 3. Check for duplicate bot (same symbol + strategy combination)
    const existingBot = await prisma.bot.findFirst({
      where: {
        symbol: symbol.toUpperCase(),
        strategyId: strategyId
      }
    });

    if (existingBot) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_BOT',
          message: `Bot already exists for ${symbol} with this strategy`,
          symbol: symbol
        }
      };
    }

    // 4. Fetch analyst ratings from FMP (fail-safe: continue even if this fails)
    let analystRatingJson: string | null = null;
    try {
      console.log(`📊 ${symbol}: Fetching analyst ratings...`);
      const analystRating = await fmpAnalystService.getUpgradesDowngrades(symbol);

      if (analystRating) {
        analystRatingJson = JSON.stringify(analystRating);
        console.log(`✅ ${symbol}: Analyst rating saved`);
      } else {
        console.log(`ℹ️ ${symbol}: No analyst rating available`);
      }
    } catch (error: any) {
      console.error(`⚠️ ${symbol}: Failed to fetch analyst rating (continuing bot creation):`, error.message);
      // Continue with bot creation even if FMP call fails
    }

    // 5. Create the bot
    const bot = await prisma.bot.create({
      data: {
        name,
        symbol: symbol.toUpperCase(),
        underlyingAsset: underlyingAsset?.toUpperCase() || null,
        extendedHours: extendedHours || false,
        strategyId,
        fundAllocation,
        orderType: orderType || 'MARKET',
        status: 'STOPPED',
        mode: 'PAPER',
        analystRating: analystRatingJson,
      },
      select: {
        id: true,
        name: true,
        symbol: true,
        strategyId: true,
        fundAllocation: true,
        analystRating: true,
      }
    });

    console.log(`✅ Bot created: ${bot.name} (${bot.symbol}) [ID: ${bot.id}]`);

    return {
      success: true,
      bot
    };

  } catch (error) {
    console.error(`[BotCreationService] Error creating bot for ${symbol}:`, error);
    return {
      success: false,
      error: {
        code: 'CREATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        symbol: symbol
      }
    };
  }
}

/**
 * Create multiple bots (used by bulk endpoint)
 * Returns array of results with individual success/failure status
 */
export async function createBots(paramsArray: CreateBotParams[]): Promise<CreateBotResult[]> {
  console.log(`[BotCreationService] Creating ${paramsArray.length} bots...`);

  // Create all bots in parallel (not using transaction to allow partial success)
  const results = await Promise.all(
    paramsArray.map(params => createBot(params))
  );

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`[BotCreationService] Completed: ${successful} successful, ${failed} failed`);

  return results;
}
