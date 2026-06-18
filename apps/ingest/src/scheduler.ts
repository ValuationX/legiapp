import cron from 'node-cron';
import { runAll } from './pipeline.js';

/**
 * In-process scheduler. PUBINFO publishes a fresh daily snapshot each morning, so
 * we refresh once a day and re-apply member enrichment in the same pass.
 */
export function startScheduler(): void {
  const schedule = process.env.INGEST_CRON ?? '0 5 * * *'; // 05:00 daily
  console.log(`• Scheduler started (cron "${schedule}"). Manual refresh: POST /api/ingest/refresh.`);

  cron.schedule(schedule, async () => {
    console.log(`[cron] refresh starting at ${new Date().toISOString()}`);
    try {
      await runAll();
      console.log('[cron] refresh complete');
    } catch (err) {
      console.error('[cron] refresh failed', err);
    }
  });

  // Keep the worker process alive.
  setInterval(() => {}, 1 << 30);
}
