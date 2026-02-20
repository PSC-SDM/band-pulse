import { Notification, NotificationType } from './notification.entity';

/**
 * Notification repository interface - contract for data access.
 * Infrastructure layer must implement this interface.
 */
export interface INotificationRepository {
    /**
     * Persist a new notification.
     */
    create(data: Omit<Notification, '_id'>): Promise<Notification>;

    /**
     * Get notifications for a user, ordered by creation date descending.
     * @param unreadOnly - If true, returns only unread notifications
     */
    findByUser(userId: string, unreadOnly?: boolean): Promise<Notification[]>;

    /**
     * Mark a single notification as read.
     * @returns true if modified, false if not found
     */
    markAsRead(notificationId: string): Promise<boolean>;

    /**
     * Mark all notifications for a user as read.
     * @returns number of notifications marked
     */
    markAllAsRead(userId: string): Promise<number>;

    /**
     * Count unread notifications for a user.
     */
    getUnreadCount(userId: string): Promise<number>;

    /**
     * Check if a notification of a given type already exists for a user + event.
     * Used to prevent duplicate notifications.
     */
    existsForUserEvent(userId: string, eventId: string, type: NotificationType): Promise<boolean>;
}
