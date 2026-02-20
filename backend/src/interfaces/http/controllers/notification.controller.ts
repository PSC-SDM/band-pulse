import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotificationService } from '../../../application/notification/notification.service';
import { logger } from '../../../shared/utils/logger';

/**
 * Notification Controller - Handles HTTP request/response for notification endpoints.
 * Delegates business logic to NotificationService.
 */
export class NotificationController {
    constructor(private notificationService: NotificationService) {}

    /**
     * GET /notifications
     * Get the current user's notifications (latest 50).
     * Query param: ?unread=true  → only unread notifications
     */
    getNotifications = async (req: AuthRequest, res: Response) => {
        try {
            const unreadOnly = req.query['unread'] === 'true';
            const notifications = await this.notificationService.getForUser(
                req.user!.userId,
                unreadOnly
            );
            res.json(notifications);
        } catch (error) {
            logger.error('Get notifications error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * GET /notifications/unread-count
     * Return the number of unread notifications for the current user.
     */
    getUnreadCount = async (req: AuthRequest, res: Response) => {
        try {
            const count = await this.notificationService.getUnreadCount(req.user!.userId);
            res.json({ count });
        } catch (error) {
            logger.error('Get unread count error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * PATCH /notifications/:id/read
     * Mark a single notification as read.
     */
    markAsRead = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const modified = await this.notificationService.markAsRead(id);

            if (!modified) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            res.json({ success: true });
        } catch (error) {
            logger.error('Mark notification as read error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.userId,
                notificationId: req.params.id,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * PATCH /notifications/read-all
     * Mark all notifications for the current user as read.
     */
    markAllAsRead = async (req: AuthRequest, res: Response) => {
        try {
            const count = await this.notificationService.markAllAsRead(req.user!.userId);
            res.json({ marked: count });
        } catch (error) {
            logger.error('Mark all notifications as read error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
