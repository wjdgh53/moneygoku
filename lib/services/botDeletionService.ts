/**
 * Bot Deletion Service
 *
 * Handles bot deletion with automatic position cleanup
 * - Closes all Alpaca positions for the bot's symbol
 * - Deletes bot from database (cascade deletes Position, Trade, Report records)
 */

import { prisma } from '@/lib/prisma';
import { alpacaTradingService } from './alpacaTradingService';

export interface DeleteBotResult {
  success: boolean;
  botId: string;
  botName?: string;
  symbol?: string;
  positionsClosed?: number;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Delete a bot with position cleanup
 *
 * Steps:
 * 1. Fetch bot and its positions from database
 * 2. Close all Alpaca positions (fail-safe: continues even if Alpaca fails)
 * 3. Delete bot from database (cascade deletes related records)
 */
export async function deleteBot(botId: string): Promise<DeleteBotResult> {
  try {
    console.log(`🗑️ [BotDeletion] Starting deletion process for bot ${botId}`);

    // Step 1: Fetch bot and its positions
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: {
        positions: true
      }
    });

    if (!bot) {
      console.error(`❌ [BotDeletion] Bot ${botId} not found`);
      return {
        success: false,
        botId,
        error: {
          code: 'BOT_NOT_FOUND',
          message: `Bot with id ${botId} not found`
        }
      };
    }

    console.log(`📋 [BotDeletion] Bot: ${bot.name} (${bot.symbol})`);
    console.log(`📊 [BotDeletion] Active positions: ${bot.positions.length}`);

    let positionsClosed = 0;

    // Step 2: Close Alpaca positions (if any)
    if (bot.positions.length > 0) {
      console.log(`🔄 [BotDeletion] Closing ${bot.positions.length} position(s) on Alpaca...`);

      for (const position of bot.positions) {
        if (position.quantity > 0) {
          try {
            // Check if position exists on Alpaca
            const alpacaPosition = await alpacaTradingService.getPosition(position.symbol);

            if (alpacaPosition && alpacaPosition.qty > 0) {
              console.log(`📉 [BotDeletion] Closing ${alpacaPosition.qty} shares of ${position.symbol}...`);

              // Close position with market sell order
              const closeResult = await alpacaTradingService.executeTrade({
                symbol: position.symbol,
                side: 'sell',
                type: 'market',
                qty: alpacaPosition.qty,
                timeInForce: 'day'
              });

              if (closeResult.success) {
                console.log(`✅ [BotDeletion] Position closed: ${position.symbol}`);
                positionsClosed++;
              } else {
                console.warn(`⚠️ [BotDeletion] Failed to close position ${position.symbol}: ${closeResult.error}`);
                // Continue anyway (fail-safe)
              }
            } else {
              console.log(`ℹ️ [BotDeletion] No active Alpaca position for ${position.symbol}, skipping`);
            }
          } catch (alpacaError: any) {
            console.warn(`⚠️ [BotDeletion] Alpaca position close error for ${position.symbol}:`, alpacaError.message);
            // Continue anyway (fail-safe: Paper trading has no real money at risk)
          }

          // Small delay between position closes to avoid rate limits
          if (bot.positions.indexOf(position) < bot.positions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      console.log(`📊 [BotDeletion] Closed ${positionsClosed}/${bot.positions.length} position(s)`);
    } else {
      console.log(`ℹ️ [BotDeletion] No positions to close`);
    }

    // Step 3: Delete bot from database
    // Cascade delete will automatically remove:
    // - Position records
    // - Trade records
    // - Report records
    console.log(`🗑️ [BotDeletion] Deleting bot from database...`);

    await prisma.bot.delete({
      where: { id: botId }
    });

    console.log(`✅ [BotDeletion] Bot ${bot.name} deleted successfully`);
    console.log(`   - Positions closed: ${positionsClosed}`);
    console.log(`   - Database records cascade deleted`);

    return {
      success: true,
      botId,
      botName: bot.name,
      symbol: bot.symbol,
      positionsClosed
    };

  } catch (error: any) {
    console.error(`❌ [BotDeletion] Error deleting bot ${botId}:`, error);

    return {
      success: false,
      botId,
      error: {
        code: 'DELETION_FAILED',
        message: error.message || 'Unknown error occurred'
      }
    };
  }
}

/**
 * Delete all bots with position cleanup
 *
 * Sequentially processes each bot to avoid overwhelming Alpaca API
 */
export async function deleteAllBots(): Promise<{
  success: boolean;
  totalBots: number;
  deleted: number;
  failed: number;
  totalPositionsClosed: number;
  results: DeleteBotResult[];
}> {
  try {
    console.log(`🗑️ [BulkBotDeletion] Starting bulk deletion process`);

    // Get all bots
    const bots = await prisma.bot.findMany({
      select: { id: true, name: true }
    });

    if (bots.length === 0) {
      console.log(`ℹ️ [BulkBotDeletion] No bots to delete`);
      return {
        success: true,
        totalBots: 0,
        deleted: 0,
        failed: 0,
        totalPositionsClosed: 0,
        results: []
      };
    }

    console.log(`📋 [BulkBotDeletion] Found ${bots.length} bot(s) to delete`);

    // Process each bot sequentially to avoid rate limits
    const results: DeleteBotResult[] = [];
    let totalPositionsClosed = 0;

    for (const bot of bots) {
      console.log(`\n🔄 [BulkBotDeletion] Processing ${bots.indexOf(bot) + 1}/${bots.length}: ${bot.name}`);

      const result = await deleteBot(bot.id);
      results.push(result);

      if (result.success && result.positionsClosed) {
        totalPositionsClosed += result.positionsClosed;
      }

      // Small delay between bot deletions
      if (bots.indexOf(bot) < bots.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const deleted = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n✅ [BulkBotDeletion] Bulk deletion complete:`);
    console.log(`   Total bots: ${bots.length}`);
    console.log(`   Deleted: ${deleted}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total positions closed: ${totalPositionsClosed}`);

    return {
      success: true,
      totalBots: bots.length,
      deleted,
      failed,
      totalPositionsClosed,
      results
    };

  } catch (error: any) {
    console.error(`❌ [BulkBotDeletion] Error:`, error);
    throw error;
  }
}
