import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ArtistService } from '../../../application/artist/artist.service';
import { FollowService } from '../../../application/follow/follow.service';
import { toArtistResponse } from '../dtos/artist.dto';
import { searchQuerySchema, artistIdParamSchema } from '../validators/artist.validators';
import { logger } from '../../../shared/utils/logger';

/**
 * Artist Controller - Handles HTTP request/response for artist endpoints.
 * Delegates business logic to ArtistService and FollowService.
 */
export class ArtistController {
    constructor(
        private artistService: ArtistService,
        private followService: FollowService
    ) {}

    /**
     * GET /artists/search
     * Search for artists by name.
     */
    search = async (req: AuthRequest, res: Response) => {
        try {
            const validation = searchQuerySchema.safeParse(req.query);

            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid query parameters',
                    details: validation.error.errors,
                });
            }

            const { q, limit = 10 } = validation.data;

            const { artists, refreshPending } = await this.artistService.searchArtists(q, limit);

            // Get follow status for all results
            const artistIds = artists.map(a => a._id!.toString());
            const followStatus = await this.followService.checkMultipleFollowStatus(
                req.user!.userId,
                artistIds
            );

            // Transform to response format with follow status
            const response = artists.map(artist =>
                toArtistResponse(artist, followStatus.get(artist._id!.toString()))
            );

            // Inform the client if a background refresh is in progress.
            // When true, the client can re-poll after ~2s to get updated results.
            res.setHeader('X-Refresh-Pending', refreshPending ? 'true' : 'false');
            res.json(response);
        } catch (error) {
            logger.error('Artist search error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * GET /artists
     * Get artists followed by the authenticated user.
     */
    getFollowed = async (req: AuthRequest, res: Response) => {
        try {
            const artists = await this.followService.getFollowedArtists(req.user!.userId);

            const response = artists.map(artist => toArtistResponse(artist, true));

            res.json(response);
        } catch (error) {
            logger.error('Get followed artists error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * GET /artists/:id
     * Get a specific artist by ID.
     */
    getById = async (req: AuthRequest, res: Response) => {
        try {
            const validation = artistIdParamSchema.safeParse(req.params);

            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid artist ID',
                    details: validation.error.errors,
                });
            }

            const artist = await this.artistService.getArtistById(req.params.id);

            if (!artist) {
                return res.status(404).json({ error: 'Artist not found' });
            }

            const isFollowing = await this.followService.isFollowing(
                req.user!.userId,
                req.params.id
            );

            const followerCount = await this.followService.getFollowerCount(req.params.id);

            const response = {
                ...toArtistResponse(artist, isFollowing),
                followerCount,
            };

            res.json(response);
        } catch (error) {
            logger.error('Get artist error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                artistId: req.params.id,
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * POST /artists/:id/follow
     * Follow an artist.
     */
    follow = async (req: AuthRequest, res: Response) => {
        try {
            const validation = artistIdParamSchema.safeParse(req.params);

            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid artist ID',
                    details: validation.error.errors,
                });
            }

            const follow = await this.followService.followArtist(
                req.user!.userId,
                req.params.id
            );

            res.status(201).json({
                success: true,
                follow: {
                    artistId: follow.artistId.toString(),
                    followedAt: follow.followedAt,
                    notificationsEnabled: follow.notificationsEnabled,
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';

            if (message === 'Artist not found') {
                return res.status(404).json({ error: message });
            }

            if (message === 'Already following this artist') {
                return res.status(400).json({ error: message });
            }

            logger.error('Follow artist error', {
                error: message,
                artistId: req.params.id,
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * DELETE /artists/:id/follow
     * Unfollow an artist.
     */
    unfollow = async (req: AuthRequest, res: Response) => {
        try {
            const validation = artistIdParamSchema.safeParse(req.params);

            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid artist ID',
                    details: validation.error.errors,
                });
            }

            const success = await this.followService.unfollowArtist(
                req.user!.userId,
                req.params.id
            );

            if (!success) {
                return res.status(404).json({ error: 'Not following this artist' });
            }

            res.json({ success: true });
        } catch (error) {
            logger.error('Unfollow artist error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                artistId: req.params.id,
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
