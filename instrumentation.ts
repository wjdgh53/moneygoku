/**
 * ⚠️ DEPRECATED: node-cron scheduler disabled for Vercel compatibility
 *
 * The bot scheduler has been replaced with Vercel Cron Jobs.
 * See /api/cron/* routes and vercel.json for the new implementation.
 *
 * Keeping this file for reference and potential local development use.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // ❌ DISABLED: node-cron doesn't work on Vercel serverless
    // Now using Vercel Cron Jobs instead (see vercel.json)
    //
    // const { startBotScheduler } = await import('./lib/services/botScheduler');
    // console.log('📡 [Instrumentation] Initializing bot scheduler...');
    // startBotScheduler();
    // console.log('✅ [Instrumentation] Bot scheduler initialized successfully');

    console.log('📡 [Instrumentation] Bot scheduler disabled (using Vercel Cron Jobs)');
  }
}
