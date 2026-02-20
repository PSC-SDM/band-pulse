import { ObjectId } from 'mongodb';

export type NotificationType = 'new_concert' | 'concert_reminder' | 'tour_announcement';

/**
 * Notification domain entity.
 * Represents an in-app notification for a user.
 */
export interface Notification {
    _id?: ObjectId;

    /** User who receives the notification */
    userId: ObjectId;

    /** Type of notification */
    type: NotificationType;

    /** Short title for the notification */
    title: string;

    /** Detailed notification body */
    body: string;

    /** Related event (if applicable) */
    eventId?: ObjectId;

    /** Related artist */
    artistId?: ObjectId;

    /** Denormalized artist name for display */
    artistName?: string;

    /** Whether the user has read this notification */
    read: boolean;

    createdAt: Date;
}
