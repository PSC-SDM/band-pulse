import { NotificationWorker } from './workers/notification.worker';
import { logger } from '../shared/utils/logger';

/**
 * Scheduler - Manages periodic background jobs.
 *
 * Uses native setInterval with time-of-day checks to avoid adding
 * a node-cron dependency. Runs in the same process as the HTTP server.
 *
 * To add a real cron library later:
 *   npm install node-cron @types/node-cron
 *   import cron from 'node-cron';
 *   cron.schedule('0 9 * * *', () => worker.sendReminders());
 */
export class Scheduler {
    private timers: NodeJS.Timeout[] = [];

    constructor(private notificationWorker: NotificationWorker) {}

    /**
     * Start all scheduled jobs.
     * Call this once after the server has fully initialised.
     */
    start(): void {
        this.scheduleReminders();
        logger.info('Scheduler started');
    }

    /**
     * Stop all scheduled jobs (useful for graceful shutdown).
     */
    stop(): void {
        for (const timer of this.timers) {
            clearInterval(timer);
        }
        this.timers = [];
        logger.info('Scheduler stopped');
    }

    /**
     * Schedule the concert reminder job to run once per day at 09:00 local time.
     *
     * Strategy: check every minute whether it is 09:00 and the job hasn't
     * already run today. This keeps the implementation dependency-free.
     */
    private scheduleReminders(): void {
        let lastRunDate: string | null = null;

        const tick = async () => {
            const now = new Date();
            const today = now.toDateString();
            const hour = now.getHours();
            const minute = now.getMinutes();

            // Fire at 09:00 and only once per calendar day
            if (hour === 9 && minute === 0 && lastRunDate !== today) {
                lastRunDate = today;
                try {
                    await this.notificationWorker.sendReminders();
                } catch (error) {
                    logger.error('Scheduled reminder job failed', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        };

        // Check every 60 seconds
        const timer = setInterval(tick, 60_000);
        this.timers.push(timer);

        logger.info('Reminder job scheduled (daily at 09:00)');
    }
}
