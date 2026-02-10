import { ObjectId, Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { Follow, FollowCreateOptions } from '../types/follow.types';
import { logger } from '../shared/utils/logger';

/**
 * Follow Repository - Data access layer for the follows collection.
 * 
 * Design decisions:
 * - Compound unique index on (userId, artistId) prevents duplicates
 * - No caching - follows are always read fresh
 * - Prepared for notification workers and event discovery
 * - Simple junction table pattern
 */
export class FollowRepository {
    private get collection(): Collection<Follow> {
        return getDatabase().collection<Follow>('follows');
    }

    /**
     * Create a follow relationship between user and artist.
     * 
     * @throws Error if follow already exists (duplicate key)
     */
    async create(options: FollowCreateOptions): Promise<Follow> {
        const follow: Omit<Follow, '_id'> = {
            userId: new ObjectId(options.userId),
            artistId: new ObjectId(options.artistId),
            followedAt: new Date(),
            notificationsEnabled: options.notificationsEnabled ?? true,
        };

        try {
            const result = await this.collection.insertOne(follow as Follow);

            logger.debug('Follow created', {
                userId: options.userId,
                artistId: options.artistId,
            });

            return {
                ...follow,
                _id: result.insertedId,
            };
        } catch (error: any) {
            // Handle duplicate key error (user already follows artist)
            if (error.code === 11000) {
                throw new Error('Already following this artist');
            }
            throw error;
        }
    }

    /**
     * Remove a follow relationship.
     * 
     * @returns true if a follow was deleted, false if it didn't exist
     */
    async delete(userId: string, artistId: string): Promise<boolean> {
        const result = await this.collection.deleteOne({
            userId: new ObjectId(userId),
            artistId: new ObjectId(artistId),
        });

        if (result.deletedCount > 0) {
            logger.debug('Follow deleted', { userId, artistId });
        }

        return result.deletedCount > 0;
    }

    /**
     * Check if a user is following an artist.
     */
    async exists(userId: string, artistId: string): Promise<boolean> {
        const count = await this.collection.countDocuments({
            userId: new ObjectId(userId),
            artistId: new ObjectId(artistId),
        });

        return count > 0;
    }

    /**
     * Get a specific follow relationship.
     */
    async findOne(userId: string, artistId: string): Promise<Follow | null> {
        return await this.collection.findOne({
            userId: new ObjectId(userId),
            artistId: new ObjectId(artistId),
        });
    }

    /**
     * Get all artist IDs that a user follows.
     */
    async getFollowedArtistIds(userId: string): Promise<string[]> {
        const follows = await this.collection
            .find({ userId: new ObjectId(userId) })
            .project<{ artistId: ObjectId }>({ artistId: 1 })
            .toArray();

        return follows.map(f => f.artistId.toString());
    }

    /**
     * Get all follows for a user with full follow data.
     */
    async getFollowsByUser(userId: string): Promise<Follow[]> {
        return await this.collection
            .find({ userId: new ObjectId(userId) })
            .sort({ followedAt: -1 }) // Most recent first
            .toArray();
    }

    /**
     * Get all user IDs that follow a specific artist.
     * Useful for notification workers.
     */
    async getFollowerUserIds(artistId: string): Promise<string[]> {
        const follows = await this.collection
            .find({
                artistId: new ObjectId(artistId),
                notificationsEnabled: true, // Only users with notifications enabled
            })
            .project<{ userId: ObjectId }>({ userId: 1 })
            .toArray();

        return follows.map(f => f.userId.toString());
    }

    /**
     * Count how many users follow a specific artist.
     */
    async getFollowerCount(artistId: string): Promise<number> {
        return await this.collection.countDocuments({
            artistId: new ObjectId(artistId),
        });
    }

    /**
     * Count how many artists a user follows.
     */
    async getFollowingCount(userId: string): Promise<number> {
        return await this.collection.countDocuments({
            userId: new ObjectId(userId),
        });
    }

    /**
     * Update notification preferences for a follow.
     */
    async updateNotificationPreference(
        userId: string,
        artistId: string,
        enabled: boolean
    ): Promise<boolean> {
        const result = await this.collection.updateOne(
            {
                userId: new ObjectId(userId),
                artistId: new ObjectId(artistId),
            },
            { $set: { notificationsEnabled: enabled } }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Check follow status for multiple artists at once.
     * Returns a map of artistId -> isFollowing
     */
    async checkMultipleFollows(
        userId: string,
        artistIds: string[]
    ): Promise<Map<string, boolean>> {
        const objectIds = artistIds.map(id => new ObjectId(id));

        const follows = await this.collection
            .find({
                userId: new ObjectId(userId),
                artistId: { $in: objectIds },
            })
            .project<{ artistId: ObjectId }>({ artistId: 1 })
            .toArray();

        const followedSet = new Set(follows.map(f => f.artistId.toString()));

        const result = new Map<string, boolean>();
        for (const artistId of artistIds) {
            result.set(artistId, followedSet.has(artistId));
        }

        return result;
    }
}
