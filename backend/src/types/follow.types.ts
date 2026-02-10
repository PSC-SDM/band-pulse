import { ObjectId } from 'mongodb';

/**
 * Follow relationship between a user and an artist.
 * 
 * Design decisions:
 * - Simple junction table pattern
 * - notificationsEnabled allows per-follow notification control
 * - No caching - follows are always read fresh from DB
 * - Prepared for notification workers and event discovery
 */

/**
 * MongoDB document schema for the follows collection.
 */
export interface Follow {
    _id?: ObjectId;

    /** Reference to users collection */
    userId: ObjectId;

    /** Reference to artists collection */
    artistId: ObjectId;

    /** Timestamp when the user followed the artist */
    followedAt: Date;

    /** Whether to receive notifications for this artist's events */
    notificationsEnabled: boolean;
}

/**
 * Options for creating a follow relationship.
 */
export interface FollowCreateOptions {
    userId: string;
    artistId: string;
    notificationsEnabled?: boolean;
}

/**
 * Follow response for API endpoints.
 */
export interface FollowResponse {
    artistId: string;
    followedAt: Date;
    notificationsEnabled: boolean;
}

/**
 * Transform MongoDB Follow document to API response format.
 */
export function toFollowResponse(follow: Follow): FollowResponse {
    return {
        artistId: follow.artistId.toString(),
        followedAt: follow.followedAt,
        notificationsEnabled: follow.notificationsEnabled,
    };
}
