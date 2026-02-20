import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { NotificationController } from '../controllers/notification.controller';

/**
 * Create notification routes.
 * All endpoints require authentication.
 */
export function createNotificationRoutes(notificationController: NotificationController): Router {
    const router = Router();

    // GET /api/notifications?unread=true
    router.get('/', authenticate, notificationController.getNotifications);

    // GET /api/notifications/unread-count
    // Must be defined BEFORE /:id routes to avoid being caught as a param
    router.get('/unread-count', authenticate, notificationController.getUnreadCount);

    // PATCH /api/notifications/read-all
    router.patch('/read-all', authenticate, notificationController.markAllAsRead);

    // PATCH /api/notifications/:id/read
    router.patch('/:id/read', authenticate, notificationController.markAsRead);

    return router;
}
