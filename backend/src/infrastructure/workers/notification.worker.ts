import { INotificationService } from '../../application/notification/notification.service.interface';
import { logger } from '../../shared/utils/logger';

/**
 * NotificationWorker - Background job executor for the notification system.
 *
 * Wired to the scheduler in infrastructure/scheduler.ts.
 * Entry points:
 *   - sendReminders() → called daily at 9 AM
 */
export class NotificationWorker {
    constructor(private notificationService: INotificationService) {}

    /**
     * Trigger daily concert reminders.
     * Called by the scheduler cron job.
     */
    async sendReminders(): Promise<void> {
        logger.info('NotificationWorker: starting concert reminder job');
        await this.notificationService.sendConcertReminders();
        logger.info('NotificationWorker: concert reminder job complete');
    }
}
