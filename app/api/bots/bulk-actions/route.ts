import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/bots/bulk-actions
 *
 * Bulk start/stop all bots
 *
 * Request body:
 * {
 *   action: 'START' | 'STOP'
 * }
 *
 * START: Calls /start endpoint for each bot (which auto-runs test)
 * STOP: Calls /stop endpoint for each bot
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action || !['START', 'STOP'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be START or STOP' },
        { status: 400 }
      );
    }

    console.log(`[BulkActions] ${action} all bots`);

    // Get all bots
    const bots = await prisma.bot.findMany({
      select: { id: true, name: true, status: true }
    });

    if (bots.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No bots to process',
        processed: 0,
        failed: 0,
        results: []
      });
    }

    const endpoint = action === 'START' ? 'start' : 'stop';
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    console.log(`[BulkActions] Processing ${bots.length} bot(s) with ${endpoint} action`);

    // Process each bot
    const results = await Promise.allSettled(
      bots.map(async (bot) => {
        try {
          // Skip if already in target state
          if (action === 'START' && bot.status === 'ACTIVE') {
            return {
              botId: bot.id,
              botName: bot.name,
              success: true,
              skipped: true,
              message: 'Already active'
            };
          }

          if (action === 'STOP' && bot.status === 'STOPPED') {
            return {
              botId: bot.id,
              botName: bot.name,
              success: true,
              skipped: true,
              message: 'Already stopped'
            };
          }

          const response = await fetch(`${baseUrl}/api/bots/${bot.id}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to ${endpoint} bot`);
          }

          return {
            botId: bot.id,
            botName: bot.name,
            success: true,
            skipped: false
          };
        } catch (error) {
          return {
            botId: bot.id,
            botName: bot.name,
            success: false,
            skipped: false,
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
          skipped: false,
          error: result.reason instanceof Error ? result.reason.message : 'Failed to process'
        };
      }
    });

    const successful = processedResults.filter(r => r.success && !r.skipped).length;
    const skipped = processedResults.filter(r => r.skipped).length;
    const failed = processedResults.filter(r => !r.success).length;

    console.log(`[BulkActions] Completed: ${successful} ${action.toLowerCase()}ed, ${skipped} skipped, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `${action} action completed: ${successful} processed, ${skipped} skipped, ${failed} failed`,
      processed: successful,
      skipped,
      failed,
      results: processedResults
    });

  } catch (error) {
    console.error('[BulkActions] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute bulk action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
