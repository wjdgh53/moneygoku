/**
 * Cron Executor for Vercel Cron Jobs
 *
 * Replaces node-cron scheduler with Vercel Cron Jobs.
 * This service executes bot trading logic on a schedule.
 */

import { prisma } from '../prisma';
import { TimeHorizon } from '@prisma/client';

/**
 * Execute a single bot's trading logic
 */
async function executeBotTest(botId: string, baseUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🤖 [Cron] Executing bot: ${botId}`);

    const response = await fetch(`${baseUrl}/api/bots/${botId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bot execution failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ [Cron] Bot ${botId} executed successfully:`, result.decision);

    // Update lastExecutedAt
    await prisma.bot.update({
      where: { id: botId },
      data: { lastExecutedAt: new Date() }
    });

    return { success: true };
  } catch (error: any) {
    console.error(`❌ [Cron] Bot ${botId} execution failed:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute all active bots for a specific time horizon
 */
export async function executeBotsForTimeHorizon(
  timeHorizon: TimeHorizon,
  baseUrl: string
): Promise<{
  success: boolean;
  botsFound: number;
  botsExecuted: number;
  botsFailed: number;
  errors: string[];
}> {
  try {
    console.log(`📊 [Cron] Checking ${timeHorizon} bots...`);

    // Fetch all active bots with the specified time horizon
    const bots = await prisma.bot.findMany({
      where: {
        status: 'ACTIVE',
        strategy: {
          timeHorizon: timeHorizon
        }
      },
      include: {
        strategy: true
      }
    });

    if (bots.length === 0) {
      console.log(`ℹ️ [Cron] No active ${timeHorizon} bots found`);
      return {
        success: true,
        botsFound: 0,
        botsExecuted: 0,
        botsFailed: 0,
        errors: []
      };
    }

    console.log(`🔄 [Cron] Found ${bots.length} active ${timeHorizon} bots`);

    // Execute all bots in parallel
    const results = await Promise.all(
      bots.map(bot => executeBotTest(bot.id, baseUrl))
    );

    const botsExecuted = results.filter(r => r.success).length;
    const botsFailed = results.filter(r => !r.success).length;
    const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error');

    console.log(`✅ [Cron] ${timeHorizon} execution complete: ${botsExecuted} success, ${botsFailed} failed`);

    return {
      success: true,
      botsFound: bots.length,
      botsExecuted,
      botsFailed,
      errors
    };
  } catch (error: any) {
    console.error(`❌ [Cron] Error executing ${timeHorizon} bots:`, error);
    return {
      success: false,
      botsFound: 0,
      botsExecuted: 0,
      botsFailed: 0,
      errors: [error.message]
    };
  }
}
