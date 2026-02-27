import { IEventRepository, IEventWriter } from '../../domain/event/event.repository.interface';
import { IFollowRepository } from '../../domain/follow/follow.repository.interface';
import { IUserRepository } from '../../domain/user/user.repository.interface';
import { INotificationService } from '../notification/notification.service.interface';
import { Event } from '../../domain/event/event.entity';
import { env } from '../../shared/config/env';
import { logger } from '../../shared/utils/logger';

/**
 * Event Service - Business logic for event discovery.
 *
 * Implements a Stale-While-Revalidate (SWR) pattern for artist events:
 * - Reads are always served from MongoDB (mongoEventRepository)
 * - When data is stale/missing, a background refresh fetches from Ticketmaster
 *   (via ticketmasterRepository) and persists to MongoDB
 * - The background refresh never blocks the HTTP response
 *
 * For general location explore (no artist filter), Ticketmaster is queried directly
 * since that data is not artist-specific and not worth persisting.
 */
export class EventService {
    private readonly inFlightArtists = new Set<string>();

    constructor(
        /** Primary read/write store — MongoDB */
        private mongoEventRepository: IEventRepository & IEventWriter,
        /** Source of truth for fetching fresh event data — Ticketmaster */
        private ticketmasterRepository: IEventRepository,
        private followRepository: IFollowRepository,
        private userRepository: IUserRepository,
        /** Optional: if provided, new concerts will trigger notifications (injected after init) */
        private notificationService?: INotificationService
    ) {}

    /**
     * Get upcoming events for a specific artist.
     *
     * SWR flow:
     * 1. Read from MongoDB → return immediately (even if empty/stale)
     * 2. If stale/empty → trigger background refresh from Ticketmaster (fire-and-forget)
     */
    async getArtistEvents(artistId: string, includeVip = false): Promise<Event[]> {
        const events = await this.mongoEventRepository.findByArtist(artistId, true);

        const isStale = events.length === 0 || this.hasStaleEvents(events);

        if (isStale && !this.inFlightArtists.has(artistId)) {
            this.inFlightArtists.add(artistId);
            this.backgroundRefreshArtistEvents(artistId).finally(() =>
                this.inFlightArtists.delete(artistId)
            );
        }

        return this.deduplicateEvents(events, includeVip);
    }

    /**
     * Get events near the user's saved location, filtered by followed artists.
     *
     * SWR flow:
     * 1. Read from MongoDB → return immediately (even if empty/stale)
     * 2. For any followed artist with no fresh events, trigger a background refresh
     */
    async getEventsNearUser(userId: string, includeVip = false): Promise<Event[]> {
        const user = await this.userRepository.findById(userId);

        if (!user || !user.location) {
            logger.warn('User location not set', { userId });
            return [];
        }

        const artistIds = await this.followRepository.getFollowedArtistIds(userId);

        if (artistIds.length === 0) {
            return [];
        }

        const [longitude, latitude] = user.location.coordinates;
        const radiusKm = user.radiusKm || 50;

        this.triggerStaleArtistRefreshes(artistIds);

        const events = await this.mongoEventRepository.findNearLocation(longitude, latitude, radiusKm, artistIds);
        return this.deduplicateEvents(events, includeVip);
    }

    /**
     * Search events by explicit coordinates and radius,
     * filtered by the user's followed artists.
     *
     * SWR flow:
     * 1. Read from MongoDB → return immediately (even if empty/stale)
     * 2. For any followed artist with no fresh events, trigger a background refresh
     */
    async searchEvents(
        userId: string,
        longitude: number,
        latitude: number,
        radiusKm: number,
        includeVip = false
    ): Promise<Event[]> {
        const artistIds = await this.followRepository.getFollowedArtistIds(userId);

        if (artistIds.length === 0) {
            return [];
        }

        this.triggerStaleArtistRefreshes(artistIds);

        const events = await this.mongoEventRepository.findNearLocation(longitude, latitude, radiusKm, artistIds);
        return this.deduplicateEvents(events, includeVip);
    }

    /**
     * Explore all music events in an area — no artist filter.
     * Queries Ticketmaster directly since this is a general discovery feature
     * and not tied to specific followed artists.
     */
    async exploreEvents(longitude: number, latitude: number, radiusKm: number, includeVip = false): Promise<Event[]> {
        const events = await this.ticketmasterRepository.findNearLocation(longitude, latitude, radiusKm);
        return this.deduplicateEvents(events, includeVip);
    }

    /**
     * Get a single event by ID.
     * Tries MongoDB first, falls back to Ticketmaster in-memory cache.
     */
    async getEventById(eventId: string): Promise<Event | null> {
        const fromMongo = await this.mongoEventRepository.findById(eventId);
        if (fromMongo) return fromMongo;

        return this.ticketmasterRepository.findById(eventId);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Fire-and-forget: trigger background refreshes for any artist in the list
     * that has no fresh events in MongoDB. Non-blocking.
     */
    private triggerStaleArtistRefreshes(artistIds: string[]): void {
        const ttlMs = (env.EVENT_CACHE_TTL || 86400) * 1000;

        this.mongoEventRepository
            .findArtistIdsNeedingRefresh(artistIds, ttlMs)
            .then((staleIds) => {
                for (const artistId of staleIds) {
                    if (!this.inFlightArtists.has(artistId)) {
                        this.inFlightArtists.add(artistId);
                        this.backgroundRefreshArtistEvents(artistId).finally(() =>
                            this.inFlightArtists.delete(artistId)
                        );
                    }
                }
            })
            .catch((err) => {
                logger.error('Failed to check stale artist events', {
                    error: err instanceof Error ? err.message : 'Unknown error',
                });
            });
    }

    private hasStaleEvents(events: Event[]): boolean {
        const ttlMs = (env.EVENT_CACHE_TTL || 86400) * 1000;
        return events.some((e) => Date.now() - e.lastChecked.getTime() > ttlMs);
    }

    private isVipEvent(event: Event): boolean {
        const title = (event.title || '').toLowerCase();
        return /\b(vip|package|hospitality|meet.?greet|experience|bundle|presale|floor.?pkg)\b/.test(title);
    }

    private deduplicateEvents(events: Event[], includeVip: boolean): Event[] {
        if (includeVip) return events;

        const best = new Map<string, Event>();
        for (const event of events) {
            const day = new Date(event.date).toISOString().slice(0, 10);
            const venueKey = `${event.venue.name}${event.venue.city}`
                .toLowerCase()
                .replace(/\W+/g, '');
            const key = `${event.artistId}_${day}_${venueKey}`;

            const current = best.get(key);
            if (!current) {
                best.set(key, event);
            } else {
                const isCurrentVip = this.isVipEvent(current);
                const isNewVip = this.isVipEvent(event);
                const prefer =
                    (isCurrentVip && !isNewVip) ||
                    (!isCurrentVip && !isNewVip && !!event.ticketUrl && !current.ticketUrl);
                if (prefer) best.set(key, event);
            }
        }
        return Array.from(best.values());
    }

    private async backgroundRefreshArtistEvents(artistId: string): Promise<void> {
        try {
            logger.info('Background event refresh start', { artistId });

            const refreshedAt = new Date();

            // Fetch all events (including past) to map correctly, then filter after persisting
            const events = await this.ticketmasterRepository.findByArtist(artistId, false);

            if (events.length > 0) {
                const result = await this.mongoEventRepository.upsertMany(events);
                await this.mongoEventRepository.deletePastEvents(artistId);

                // Notify followers about newly inserted concerts (upsertedCount > 0 = truly new)
                if (result.upserted > 0 && this.notificationService) {
                    this.notificationService
                        .notifyNewConcertsForArtist(artistId, refreshedAt)
                        .catch((err) =>
                            logger.error('Failed to trigger new concert notifications', {
                                artistId,
                                error: err instanceof Error ? err.message : 'Unknown error',
                            })
                        );
                }
            }

            logger.info('Background event refresh complete', {
                artistId,
                count: events.length,
            });
        } catch (error) {
            logger.error('Background event refresh failed', {
                artistId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
