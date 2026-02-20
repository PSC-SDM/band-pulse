import { ObjectId, Collection } from 'mongodb';
import { getDatabase } from '../database/mongodb.connection';
import { Notification, NotificationType } from '../../domain/notification/notification.entity';
import { INotificationRepository } from '../../domain/notification/notification.repository.interface';

/**
 * MongoDB implementation of the Notification Repository.
 *
 * Indexes (created at startup or via migration):
 *   - { userId: 1, createdAt: -1 }   → fast user feed queries
 *   - { userId: 1, read: 1 }         → fast unread count
 *   - { userId: 1, eventId: 1, type: 1 } → duplicate check
 */
export class MongoNotificationRepository implements INotificationRepository {
    private get collection(): Collection<Notification> {
        return getDatabase().collection<Notification>('notifications');
    }

    async create(data: Omit<Notification, '_id'>): Promise<Notification> {
        const result = await this.collection.insertOne(data as Notification);
        return { ...data, _id: result.insertedId };
    }

    async findByUser(userId: string, unreadOnly = false): Promise<Notification[]> {
        const filter: Record<string, unknown> = { userId: new ObjectId(userId) };
        if (unreadOnly) filter['read'] = false;

        return this.collection
            .find(filter as any)
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();
    }

    async markAsRead(notificationId: string): Promise<boolean> {
        const result = await this.collection.updateOne(
            { _id: new ObjectId(notificationId) },
            { $set: { read: true } }
        );
        return result.modifiedCount > 0;
    }

    async markAllAsRead(userId: string): Promise<number> {
        const result = await this.collection.updateMany(
            { userId: new ObjectId(userId), read: false },
            { $set: { read: true } }
        );
        return result.modifiedCount;
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.collection.countDocuments({
            userId: new ObjectId(userId),
            read: false,
        } as any);
    }

    async existsForUserEvent(userId: string, eventId: string, type: NotificationType): Promise<boolean> {
        const count = await this.collection.countDocuments({
            userId: new ObjectId(userId),
            eventId: new ObjectId(eventId),
            type,
        } as any);
        return count > 0;
    }
}
