import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { EventService } from '../../../application/event/event.service';
import { toEventResponse } from '../dtos/event.dto';
import { artistIdParamSchema, searchEventsQuerySchema } from '../validators/event.validators';
import { logger } from '../../../shared/utils/logger';

/**
 * Event Controller - Handles HTTP request/response for event endpoints.
 * Delegates business logic to EventService.
 */
export class EventController {
    constructor(private eventService: EventService) {}

    /**
     * GET /events/near-me
     * Get events near the authenticated user's location,
     * filtered by their followed artists.
     */
    getNearMe = async (req: AuthRequest, res: Response) => {
        try {
            const events = await this.eventService.getEventsNearUser(req.user!.userId);

            res.json(events.map(toEventResponse));
        } catch (error) {
            logger.error('Get near-me events error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * GET /events/search?lng=X&lat=Y&radiusKm=Z
     * Search events by custom coordinates and radius,
     * filtered by the user's followed artists.
     */
    search = async (req: AuthRequest, res: Response) => {
        try {
            const validation = searchEventsQuerySchema.safeParse(req.query);

            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid query parameters. Required: lng, lat, radiusKm',
                    details: validation.error.errors,
                });
            }

            const { lng, lat, radiusKm } = validation.data;

            const events = await this.eventService.searchEvents(
                req.user!.userId,
                lng,
                lat,
                radiusKm
            );

            res.json(events.map(toEventResponse));
        } catch (error) {
            logger.error('Search events error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * GET /events/explore?lng=X&lat=Y&radiusKm=Z
     * Explore all music events in an area (no artist filter).
     */
    explore = async (req: AuthRequest, res: Response) => {
        try {
            const validation = searchEventsQuerySchema.safeParse(req.query);

            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid query parameters. Required: lng, lat, radiusKm',
                    details: validation.error.errors,
                });
            }

            const { lng, lat, radiusKm } = validation.data;

            const events = await this.eventService.exploreEvents(lng, lat, radiusKm);

            res.json(events.map(toEventResponse));
        } catch (error) {
            logger.error('Explore events error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * GET /events/artist/:artistId
     * Get upcoming events for a specific artist.
     */
    getByArtist = async (req: AuthRequest, res: Response) => {
        try {
            const validation = artistIdParamSchema.safeParse(req.params);

            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid artist ID',
                    details: validation.error.errors,
                });
            }

            const events = await this.eventService.getArtistEvents(req.params.artistId);

            res.json(events.map(toEventResponse));
        } catch (error) {
            logger.error('Get artist events error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                artistId: req.params.artistId,
                userId: req.user?.userId,
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
