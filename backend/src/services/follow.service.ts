import { FollowRepository } from '../repositories/follow.repository';
import { ArtistRepository } from '../repositories/artist.repository';
import { Follow, FollowResponse, toFollowResponse } from '../types/follow.types';
import { Artist } from '../types/artist.types';
import { logger } from '../shared/utils/logger';

/**
 * Follow Service - Business logic layer for follow operations.
 * 
 * Design decisions:
 * - Validates artist existence before allowing follow
 * - No caching - follows are always fresh
 * - Prepared for notification system integration
 */
export class FollowService {
    constructor(
        private followRepository: FollowRepository,
        private artistRepository: ArtistRepository
    ) { }

    /**
     * Follow an artist.
     * 
     * @param userId - User performing the follow
     * @param artistId - Artist to follow
     * @throws Error if artist doesn't exist or already following
     */
    async followArtist(userId: string, artistId: string): Promise<Follow> {
        // Validate artist exists
        const artist = await this.artistRepository.findById(artistId);

        if (!artist) {
            throw new Error('Artist not found');
        }

        // Create follow (repository handles duplicate detection)
        const follow = await this.followRepository.create({
            userId,
            artistId,
            notificationsEnabled: true,
        });

        logger.info('User followed artist', {
            userId,
            artistId,
            artistName: artist.name,
        });

        return follow;
    }

    /**
     * Unfollow an artist.
     * 
     * @returns true if unfollowed, false if wasn't following
     */
    async unfollowArtist(userId: string, artistId: string): Promise<boolean> {
        const deleted = await this.followRepository.delete(userId, artistId);

        if (deleted) {
            logger.info('User unfollowed artist', { userId, artistId });
        }

        return deleted;
    }

    /**
     * Check if user is following an artist.
     */
    async isFollowing(userId: string, artistId: string): Promise<boolean> {
        return await this.followRepository.exists(userId, artistId);
    }

    /**
     * Get all artists that a user follows.
     * Returns full artist data, sorted by follow date (most recent first).
     */
    async getFollowedArtists(userId: string): Promise<Artist[]> {
        const artistIds = await this.followRepository.getFollowedArtistIds(userId);

        if (artistIds.length === 0) {
            return [];
        }

        const artists = await this.artistRepository.findByIds(artistIds);

        // Maintain follow order (most recent first)
        const artistMap = new Map(artists.map(a => [a._id!.toString(), a]));

        return artistIds
            .map(id => artistMap.get(id))
            .filter((a): a is Artist => a !== undefined);
    }

    /**
     * Get follow status for multiple artists at once.
     * Useful for decorating search results with follow state.
     */
    async checkMultipleFollowStatus(
        userId: string,
        artistIds: string[]
    ): Promise<Map<string, boolean>> {
        return await this.followRepository.checkMultipleFollows(userId, artistIds);
    }

    /**
     * Get count of artists a user follows.
     */
    async getFollowingCount(userId: string): Promise<number> {
        return await this.followRepository.getFollowingCount(userId);
    }

    /**
     * Get count of followers for an artist.
     */
    async getFollowerCount(artistId: string): Promise<number> {
        return await this.followRepository.getFollowerCount(artistId);
    }

    /**
     * Update notification preference for a follow.
     */
    async updateNotificationPreference(
        userId: string,
        artistId: string,
        enabled: boolean
    ): Promise<boolean> {
        // Verify follow exists
        const isFollowing = await this.followRepository.exists(userId, artistId);

        if (!isFollowing) {
            throw new Error('Not following this artist');
        }

        return await this.followRepository.updateNotificationPreference(
            userId,
            artistId,
            enabled
        );
    }

    /**
     * Convert follow to API response format.
     */
    toResponse(follow: Follow): FollowResponse {
        return toFollowResponse(follow);
    }
}
