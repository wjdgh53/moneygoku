/**
 * Bulk Bot Creation API Endpoint
 *
 * POST /api/bots/bulk
 *
 * Creates multiple trading bots in a single transaction.
 * Uses Prisma transaction to ensure atomicity - either all bots are created or none.
 *
 * Request Body:
 * {
 *   bots: [
 *     {
 *       symbol: string,
 *       strategyId: string,
 *       fundAllocation: number,
 *       name: string,
 *       orderType?: 'MARKET' | 'LIMIT'
 *     }
 *   ]
 * }
 *
 * Response:
 * {
 *   created: BotCreationResult[],
 *   failed: BotCreationResult[],
 *   summary: { total, successful, failed }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  BulkBotCreateRequest,
  BulkBotCreateResponse,
  BotCreationResult
} from '@/lib/types/stockScreener';
import { createBot } from '@/lib/services/botCreationService';
import { deleteAllBots } from '@/lib/services/botDeletionService';

/**
 * POST handler for bulk bot creation
 */
export async function POST(request: NextRequest) {
  try {
    const body: BulkBotCreateRequest = await request.json();

    // Validate request body
    if (!body.bots || !Array.isArray(body.bots)) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          message: 'bots must be an array'
        },
        { status: 400 }
      );
    }

    if (body.bots.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          message: 'bots array cannot be empty'
        },
        { status: 400 }
      );
    }

    // Limit to prevent abuse (max 50 bots per request)
    if (body.bots.length > 50) {
      return NextResponse.json(
        {
          error: 'Too many bots',
          message: 'Maximum 50 bots can be created in a single request'
        },
        { status: 400 }
      );
    }

    console.log(`[BulkBotCreate] Creating ${body.bots.length} bots`);

    // Use common bot creation service (with FMP integration)
    const results = await Promise.all(
      body.bots.map(botData =>
        createBot({
          name: botData.name,
          symbol: botData.symbol,
          strategyId: botData.strategyId,
          fundAllocation: botData.fundAllocation,
          orderType: botData.orderType
        })
      )
    );

    // Separate successful and failed results
    const created = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Build response
    const response: BulkBotCreateResponse = {
      created,
      failed,
      summary: {
        total: body.bots.length,
        successful: created.length,
        failed: failed.length
      }
    };

    console.log(
      `[BulkBotCreate] Completed: ${created.length} successful, ${failed.length} failed`
    );

    // Return 207 Multi-Status if there are partial failures
    const statusCode = failed.length > 0 ? (created.length > 0 ? 207 : 400) : 201;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('[BulkBotCreate] Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Get information about bulk creation limits and validation rules
 */
export async function GET() {
  return NextResponse.json({
    limits: {
      maxBotsPerRequest: 50,
      minFundAllocation: 0.01
    },
    requiredFields: ['symbol', 'strategyId', 'name', 'fundAllocation'],
    optionalFields: ['orderType'],
    validOrderTypes: ['MARKET', 'LIMIT'],
    notes: [
      'Duplicate bots (same symbol + strategy) will be rejected',
      'Bot names should be unique for better identification',
      'All symbols will be converted to uppercase',
      'All bots are created in STOPPED mode with PAPER trading'
    ]
  });
}

/**
 * DELETE handler - Delete all bots with position cleanup
 *
 * DELETE /api/bots/bulk
 *
 * Deletes all bots from the system with automatic Alpaca position cleanup.
 * - Closes all open positions on Alpaca
 * - Deletes bots (cascade deletes trades, reports, positions)
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   totalBots: number,
 *   deleted: number,
 *   failed: number,
 *   totalPositionsClosed: number
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('[BulkBotDelete] Starting bulk delete operation with position cleanup');

    // Use common deletion service
    const result = await deleteAllBots();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete all bots',
          details: 'See server logs for details'
        },
        { status: 500 }
      );
    }

    console.log(`[BulkBotDelete] Bulk delete complete:`);
    console.log(`   Total: ${result.totalBots}`);
    console.log(`   Deleted: ${result.deleted}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Positions closed: ${result.totalPositionsClosed}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deleted} bot(s), closed ${result.totalPositionsClosed} position(s)`,
      totalBots: result.totalBots,
      deleted: result.deleted,
      failed: result.failed,
      totalPositionsClosed: result.totalPositionsClosed
    });
  } catch (error) {
    console.error('[BulkBotDelete] Error deleting all bots:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete all bots',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler - Test all bots
 *
 * PUT /api/bots/bulk/test
 *
 * Runs tests for all bots in the system.
 * Note: Uses PUT method to avoid confusion with POST for creation.
 *
 * Response:
 * {
 *   success: boolean,
 *   tested: number,
 *   failed: number,
 *   results: Array<{ botId, botName, success, error? }>
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('[BulkBotTest] Starting bulk test operation');

    // Get all bots
    const bots = await prisma.bot.findMany({
      include: { strategy: true }
    });

    if (bots.length === 0) {
      console.log('[BulkBotTest] No bots to test');
      return NextResponse.json({
        success: true,
        message: 'No bots to test',
        tested: 0,
        failed: 0,
        results: []
      });
    }

    console.log(`[BulkBotTest] Testing ${bots.length} bot(s)`);

    // Test each bot individually
    const results = await Promise.allSettled(
      bots.map(async (bot) => {
        try {
          // Call the individual bot test endpoint
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/bots/${bot.id}/test`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }
          );

          if (!response.ok) {
            throw new Error(`Test failed for bot ${bot.name}`);
          }

          return {
            botId: bot.id,
            botName: bot.name,
            success: true
          };
        } catch (error) {
          return {
            botId: bot.id,
            botName: bot.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    // Process results
    const processedResults = results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          botId: 'unknown',
          botName: 'unknown',
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Test failed'
        };
      }
    });

    const tested = processedResults.filter(r => r.success).length;
    const failed = processedResults.filter(r => !r.success).length;

    console.log(`[BulkBotTest] Completed: ${tested} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Tested ${tested} bot(s), ${failed} failed`,
      tested,
      failed,
      results: processedResults
    });
  } catch (error) {
    console.error('[BulkBotTest] Error testing all bots:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test all bots',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
