import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../shared/middleware/auth.middleware';
import { ArtistService } from '../services/artist.service';
import { FollowService } from '../services/follow.service';
import { ArtistRepository } from '../repositories/artist.repository';
import { FollowRepository } from '../repositories/follow.repository';
import { toArtistResponse } from '../types/artist.types';
import { logger } from '../shared/utils/logger';

const router = Router();

// Initialize repositories and services
// Note: Using lazy initialization to ensure database is connected
let artistService: ArtistService;
let followService: FollowService;

function getServices() {
    if (!artistService) {
        const artistRepository = new ArtistRepository();
        const followRepository = new FollowRepository();
        artistService = new ArtistService(artistRepository);
        followService = new FollowService(followRepository, artistRepository);
    }
    return { artistService, followService };
}

// ============================================================================
// Validation Schemas
// ============================================================================

const searchQuerySchema = z.object({
    q: z.string().min(2, 'Query must be at least 2 characters').max(100),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).optional(),
});

const artistIdParamSchema = z.object({
    id: z.string().min(1, 'Artist ID is required'),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /artists/search
 * 
 * Search for artists by name.
 * Implements lazy-loading: queries MongoDB first, then MusicBrainz on cache miss.
 * 
 * Query params:
 * - q: Search query (required, min 2 chars)
 * - limit: Max results (optional, default 10, max 50)
 * 
 * Response: Array of artist objects
 */
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const validation = searchQuerySchema.safeParse(req.query);

        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: validation.error.errors,
            });
        }

        const { q, limit = 10 } = validation.data;
        const { artistService, followService } = getServices();

        const artists = await artistService.searchArtists(q, limit);

        // Get follow status for all results
        const artistIds = artists.map(a => a._id!.toString());
        const followStatus = await followService.checkMultipleFollowStatus(
            req.user!.userId,
            artistIds
        );

        // Transform to response format with follow status
        const response = artists.map(artist =>
            toArtistResponse(artist, followStatus.get(artist._id!.toString()))
        );

        res.json(response);
    } catch (error) {
        logger.error('Artist search error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.userId,
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /artists
 * 
 * Get artists followed by the authenticated user.
 * 
 * Response: Array of artist objects (with isFollowing: true)
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { followService } = getServices();

        const artists = await followService.getFollowedArtists(req.user!.userId);

        const response = artists.map(artist => toArtistResponse(artist, true));

        res.json(response);
    } catch (error) {
        logger.error('Get followed artists error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.userId,
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /artists/:id
 * 
 * Get a specific artist by ID.
 * Refreshes from MusicBrainz if cache is stale.
 * 
 * Response: Artist object with isFollowing status
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const validation = artistIdParamSchema.safeParse(req.params);

        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid artist ID',
                details: validation.error.errors,
            });
        }

        const { artistService, followService } = getServices();

        const artist = await artistService.getArtistById(req.params.id);

        if (!artist) {
            return res.status(404).json({ error: 'Artist not found' });
        }

        const isFollowing = await followService.isFollowing(
            req.user!.userId,
            req.params.id
        );

        // Get follower count for this artist
        const followerCount = await followService.getFollowerCount(req.params.id);

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
});

/**
 * POST /artists/:id/follow
 * 
 * Follow an artist.
 * 
 * Response: { success: true, follow: FollowResponse }
 * Error 400 if already following
 * Error 404 if artist not found
 */
router.post('/:id/follow', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const validation = artistIdParamSchema.safeParse(req.params);

        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid artist ID',
                details: validation.error.errors,
            });
        }

        const { followService } = getServices();

        const follow = await followService.followArtist(
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
});

/**
 * DELETE /artists/:id/follow
 * 
 * Unfollow an artist.
 * 
 * Response: { success: true }
 * Error 404 if not following
 */
router.delete('/:id/follow', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const validation = artistIdParamSchema.safeParse(req.params);

        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid artist ID',
                details: validation.error.errors,
            });
        }

        const { followService } = getServices();

        const success = await followService.unfollowArtist(
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
});

export { router as artistsRoutes };
