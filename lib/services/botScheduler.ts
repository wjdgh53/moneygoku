// NOTE: This file previously used node-cron for scheduling.
// Scheduling is now handled by Vercel Cron Jobs (see vercel.json).
// This file is kept for manual execution and status checking.

import { prisma } from '../prisma';

interface SchedulerConfig {
  SHORT_TERM: string;  // Every 30 minutes during market hours
  SWING: string[];     // 3 times per day
  LONG_TERM: string;   // Once per day
}

// Cron schedule patterns (for reference only - actual scheduling in vercel.json)
const SCHEDULES: SchedulerConfig = {
  SHORT_TERM: '*/30 9-16 * * 1-5',  // Every 30 minutes, 9 AM - 4:30 PM, Mon-Fri
  SWING: [
    '0 9 * * 1-5',   // 9:00 AM, Mon-Fri
    '0 13 * * 1-5',  // 1:00 PM, Mon-Fri
    '0 17 * * 1-5'   // 5:00 PM, Mon-Fri (after market close for analysis)
  ],
  LONG_TERM: '0 9 * * 1-5'  // 9:00 AM, Mon-Fri
};

// Scheduler is disabled (using Vercel Cron Jobs instead)
const isSchedulerActive = false;

/**
 * Execute a single bot's trading logic
 */
async function executeBotTest(botId: string): Promise<void> {
  try {
    console.log(`🤖 [Scheduler] Executing bot: ${botId}`);

    const response = await fetch(`http://localhost:3000/api/bots/${botId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bot execution failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ [Scheduler] Bot ${botId} executed successfully:`, result.decision);

    // Update lastExecutedAt
    await prisma.bot.update({
      where: { id: botId },
      data: { lastExecutedAt: new Date() }
    });

  } catch (error) {
    console.error(`❌ [Scheduler] Bot ${botId} execution failed:`, error);
  }
}

/**
 * Execute all active bots for a specific time horizon
 */
async function executeBotsForTimeHorizon(timeHorizon: string): Promise<void> {
  try {
    console.log(`📊 [Scheduler] Checking ${timeHorizon} bots...`);

    // Fetch all active bots with the specified time horizon
    const bots = await prisma.bot.findMany({
      where: {
        status: 'ACTIVE',
        strategy: {
          timeHorizon: timeHorizon as any
        }
      },
      include: {
        strategy: true
      }
    });

    if (bots.length === 0) {
      console.log(`ℹ️ [Scheduler] No active ${timeHorizon} bots found`);
      return;
    }

    console.log(`🔄 [Scheduler] Found ${bots.length} active ${timeHorizon} bots`);

    // Execute all bots in parallel
    await Promise.all(
      bots.map(bot => executeBotTest(bot.id))
    );

  } catch (error) {
    console.error(`❌ [Scheduler] Error executing ${timeHorizon} bots:`, error);
  }
}

/**
 * Initialize and start all cron jobs
 * NOTE: This function is now a no-op. Scheduling is handled by Vercel Cron Jobs.
 */
export function startBotScheduler(): void {
  console.log('ℹ️  [Scheduler] Bot scheduler start requested, but scheduling is handled by Vercel Cron Jobs.');
  console.log('ℹ️  [Scheduler] See vercel.json for cron job configuration.');
}

/**
 * Stop all running cron jobs
 * NOTE: This function is now a no-op. Scheduling is handled by Vercel Cron Jobs.
 */
export function stopBotScheduler(): void {
  console.log('ℹ️  [Scheduler] Bot scheduler stop requested, but scheduling is handled by Vercel Cron Jobs.');
  console.log('ℹ️  [Scheduler] Cron jobs are managed by Vercel platform.');
}

/**
 * Get status of all scheduled jobs
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  activeJobs: string[];
  schedules: SchedulerConfig;
  note: string;
} {
  return {
    isRunning: isSchedulerActive,
    activeJobs: [], // No active jobs (using Vercel Cron instead)
    schedules: SCHEDULES,
    note: 'Scheduling handled by Vercel Cron Jobs. See vercel.json for configuration.'
  };
}

/**
 * Manually trigger execution for all active bots (for testing)
 */
export async function triggerManualExecution(): Promise<void> {
  console.log('🔧 [Scheduler] Manual execution triggered for all active bots');

  await Promise.all([
    executeBotsForTimeHorizon('SHORT_TERM'),
    executeBotsForTimeHorizon('SWING'),
    executeBotsForTimeHorizon('LONG_TERM')
  ]);
}
