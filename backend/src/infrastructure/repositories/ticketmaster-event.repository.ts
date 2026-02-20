import { Event } from '../../domain/event/event.entity';
import { IEventRepository } from '../../domain/event/event.repository.interface';
import {
    ticketmasterClient,
    TmEvent,
} from '../integrations/ticketmaster.client';
import { mapTmEventToDomain } from '../integrations/ticketmaster.mapper';
import { IArtistRepository } from '../../domain/artist/artist.repository.interface';
import { logger } from '../../shared/utils/logger';
import { TtlCache } from '../../shared/utils/ttl-cache';
import { env } from '../../shared/config/env';

/**
 * Ticketmaster implementation of IEventRepository.
 *
 * Uses the Discovery API to fetch real concert data.
 * Two layers of caching:
 *   1. HTTP-level cache in TicketmasterClient (short TTL, avoids duplicate API calls)
 *   2. Domain-level cache here (longer TTL, avoids re-processing mapped results)
 *
 * Location cache keys use grid-snapping (~11km buckets) to maximize cache reuse
 * when the user drags the map pin slightly.
 */

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/**
 * Snap a coordinate to a grid bucket.
 * - precision 1 decimal  → ~11km buckets (good for location cache reuse)
 * - precision 0 decimals → ~111km buckets
 */
function snapCoord(value: number, decimals: number = 1): string {
    return value.toFixed(decimals);
}

/**
 * Snap radius to coarse buckets (25km steps) so that
 * 50km and 55km map to the same cache key.
 */
function snapRadius(radiusKm: number): number {
    return Math.ceil(radiusKm / 25) * 25;
}

/**
 * Resolved Ticketmaster attraction ID for an artist.
 * `null` means we tried and couldn't resolve.
 */
interface AttractionIdEntry {
    tmId: string | null;
    tmName: string | null;
}

export class TicketmasterEventRepository implements IEventRepository {
    /** Domain-level cache: stores mapped Event[] arrays */
    private artistEventCache: TtlCache<Event[]>;
    private locationEventCache: TtlCache<Event[]>;
    private eventByIdCache: TtlCache<Event>;

    /** Long-lived cache: artist name → Ticketmaster attraction ID */
    private attractionIdCache: TtlCache<AttractionIdEntry>;

    constructor(private artistRepository: IArtistRepository) {
        const domainTtlMs = (env.EVENT_CACHE_TTL || 86400) * 1000;

        this.artistEventCache = new TtlCache({
            name: 'repo-artist-events',
            ttlMs: domainTtlMs,
            maxSize: 200,
            statsInterval: 20,
        });

        this.locationEventCache = new TtlCache({
            name: 'repo-location-events',
            ttlMs: Math.min(domainTtlMs, 30 * 60 * 1000), // max 30 min for location searches
            maxSize: 150,
            statsInterval: 20,
        });

        this.eventByIdCache = new TtlCache({
            name: 'repo-event-by-id',
            ttlMs: domainTtlMs,
            maxSize: 500,
        });

        // Attraction IDs rarely change — cache for 7 days
        this.attractionIdCache = new TtlCache({
            name: 'repo-attraction-ids',
            ttlMs: 7 * 24 * 60 * 60 * 1000,
            maxSize: 500,
            statsInterval: 20,
        });

        logger.info('TicketmasterEventRepository initialized', {
            artistCacheTtl: `${domainTtlMs / 1000}s`,
            locationCacheTtl: `${Math.min(domainTtlMs, 30 * 60 * 1000) / 1000}s`,
        });
    }

    /**
     * Find events for a specific artist.
     * Looks up the artist name from our DB, then queries Ticketmaster by keyword.
     */
    async findByArtist(artistId: string, upcoming: boolean = true): Promise<Event[]> {
        const cacheKey = `${artistId}:${upcoming}`;
        const cached = this.artistEventCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Get artist name from our DB
        const artist = await this.artistRepository.findById(artistId);
        if (!artist) {
            logger.warn('Artist not found for event lookup', { artistId });
            return [];
        }

        try {
            const response = await ticketmasterClient.searchEventsByArtistName(artist.name, {
                size: 50,
            });

            const tmEvents = response._embedded?.events || [];

            // Map and filter: only keep events that have a venue with coordinates
            let events = tmEvents
                .map((tmEvent) => mapTmEventToDomain(tmEvent, artistId, artist.name))
                .filter((e) => e.venue.location.coordinates[0] !== 0 || e.venue.location.coordinates[1] !== 0);

            if (upcoming) {
                const now = new Date();
                events = events.filter((e) => e.date >= now);
            }

            events.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Update caches
            this.artistEventCache.set(cacheKey, events);

            for (const event of events) {
                if (event.externalId) {
                    this.eventByIdCache.set(event.externalId, event);
                }
            }

            return events;
        } catch (error) {
            logger.error('Failed to fetch artist events from Ticketmaster', {
                artistId,
                artistName: artist.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Return stale cached data if available
            return this.artistEventCache.getStale(cacheKey) || [];
        }
    }

    /**
     * Find events near a geographic location.
     * Uses Ticketmaster's native geoPoint + radius search.
     *
     * If artistIds are provided, we resolve them to Ticketmaster attraction IDs
     * for exact matching (with keyword fallback for unresolved artists).
     */
    async findNearLocation(
        longitude: number,
        latitude: number,
        radiusKm: number,
        artistIds?: string[]
    ): Promise<Event[]> {
        // Grid-snapped cache key: ~11km lat/lng buckets + 25km radius buckets
        const snappedLat = snapCoord(latitude);
        const snappedLng = snapCoord(longitude);
        const snappedRadius = snapRadius(radiusKm);
        const artistPart = artistIds && artistIds.length > 0
            ? artistIds.slice().sort().join(',')
            : 'all';
        const cacheKey = `${snappedLat}:${snappedLng}:${snappedRadius}:${artistPart}`;

        const cached = this.locationEventCache.get(cacheKey);
        if (cached) {
            logger.debug('Location events cache hit', { cacheKey });
            return cached;
        }

        try {
            // If we have specific artists, fetch events for each one and filter by distance.
            if (artistIds && artistIds.length > 0) {
                const allEvents = await this.fetchEventsForArtistsNearLocation(
                    artistIds,
                    latitude,
                    longitude,
                    radiusKm
                );

                this.locationEventCache.set(cacheKey, allEvents);
                return allEvents;
            }

            // No artist filter — general area search
            const startDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

            const response = await ticketmasterClient.searchEventsByLocation(
                latitude,
                longitude,
                radiusKm,
                {
                    startDateTime,
                    size: 50,
                }
            );

            const tmEvents = response._embedded?.events || [];

            const events = tmEvents
                .map((tmEvent) => {
                    const attraction = tmEvent._embedded?.attractions?.[0];
                    return mapTmEventToDomain(
                        tmEvent,
                        '', // No internal artistId for general search
                        attraction?.name || tmEvent.name || 'Unknown Artist'
                    );
                })
                .filter(
                    (e) =>
                        e.venue.location.coordinates[0] !== 0 ||
                        e.venue.location.coordinates[1] !== 0
                )
                .sort((a, b) => a.date.getTime() - b.date.getTime());

            this.locationEventCache.set(cacheKey, events);

            // Populate byId cache for individual lookups
            for (const event of events) {
                if (event.externalId) {
                    this.eventByIdCache.set(event.externalId, event);
                }
            }

            return events;
        } catch (error) {
            logger.error('Failed to fetch location events from Ticketmaster', {
                latitude,
                longitude,
                radiusKm,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Return stale data if available
            return this.locationEventCache.getStale(cacheKey) || [];
        }
    }

    /**
     * Find a single event by ID (Ticketmaster external ID or our ObjectId string).
     */
    async findById(id: string): Promise<Event | null> {
        const cached = this.eventByIdCache.get(id);
        if (cached) {
            return cached;
        }

        // Also check stale data in the byId cache
        const stale = this.eventByIdCache.getStale(id);
        if (stale) return stale;

        return null;
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /**
     * Resolve an artist name to a Ticketmaster attraction ID.
     * Uses `searchAttractions` and picks the best match.
     * Result is cached for 7 days.
     */
    private async resolveAttractionId(artistName: string): Promise<AttractionIdEntry> {
        const cacheKey = artistName.toLowerCase().trim();
        const cached = this.attractionIdCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const attractions = await ticketmasterClient.searchAttractions(artistName, { size: 5 });

            if (attractions.length === 0) {
                logger.debug('No TM attraction found for artist', { artistName });
                const entry: AttractionIdEntry = { tmId: null, tmName: null };
                this.attractionIdCache.set(cacheKey, entry);
                return entry;
            }

            // Pick the best match: prefer exact name match (case-insensitive)
            const normalized = artistName.toLowerCase().trim();
            const exactMatch = attractions.find(
                (a) => a.name.toLowerCase().trim() === normalized
            );
            const best = exactMatch || attractions[0];

            const entry: AttractionIdEntry = { tmId: best.id, tmName: best.name };
            this.attractionIdCache.set(cacheKey, entry);

            logger.info('Resolved TM attraction ID', {
                artistName,
                tmId: best.id,
                tmName: best.name,
                exactMatch: !!exactMatch,
            });

            return entry;
        } catch (error) {
            logger.warn('Failed to resolve TM attraction ID', {
                artistName,
                error: error instanceof Error ? error.message : 'Unknown',
            });
            const entry: AttractionIdEntry = { tmId: null, tmName: null };
            this.attractionIdCache.set(cacheKey, entry);
            return entry;
        }
    }

    /**
     * Search events for followed artists near a location.
     *
     * Strategy (two-pass for maximum coverage):
     *   1. Resolve artist names → TM attraction IDs (cached, exact match)
     *   2. For resolved artists: search by attractionId (batched, much more accurate)
     *   3. For unresolved artists: fall back to keyword search
     *   4. Combine, deduplicate, sort
     */
    private async fetchEventsForArtistsNearLocation(
        artistIds: string[],
        latitude: number,
        longitude: number,
        radiusKm: number
    ): Promise<Event[]> {
        const allEvents: Event[] = [];
        const seenExternalIds = new Set<string>();
        const now = new Date();
        const startDateTime = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

        // Resolve artist names from our DB
        const artists = await this.artistRepository.findByIds(artistIds);

        if (artists.length === 0) {
            logger.warn('No artists found in DB for given IDs', {
                artistIds: artistIds.slice(0, 5),
            });
            return [];
        }

        // Step 1: Resolve all artists to TM attraction IDs (in parallel, rate limited)
        const resolveBatchSize = 3;
        const resolvedArtists: Array<{
            artist: typeof artists[0];
            tmId: string | null;
            tmName: string | null;
        }> = [];

        for (let i = 0; i < artists.length; i += resolveBatchSize) {
            const batch = artists.slice(i, i + resolveBatchSize);
            const results = await Promise.all(
                batch.map(async (artist) => {
                    const entry = await this.resolveAttractionId(artist.name);
                    return { artist, tmId: entry.tmId, tmName: entry.tmName };
                })
            );
            resolvedArtists.push(...results);
        }

        // Separate resolved vs unresolved
        const withAttractionId = resolvedArtists.filter((r) => r.tmId !== null);
        const withoutAttractionId = resolvedArtists.filter((r) => r.tmId === null);

        logger.info('Artist TM resolution summary', {
            total: resolvedArtists.length,
            resolved: withAttractionId.length,
            unresolved: withoutAttractionId.length,
            unresolvedNames: withoutAttractionId.map((r) => r.artist.name),
        });

        // Step 2: Search per-artist with their individual attractionId
        // (TM doesn't reliably support multiple attractionIds in one geo call)
        const searchBatchSize = 3;
        for (let i = 0; i < withAttractionId.length; i += searchBatchSize) {
            const batch = withAttractionId.slice(i, i + searchBatchSize);

            const results = await Promise.all(
                batch.map(async (r) => {
                    try {
                        const response = await ticketmasterClient.searchEventsByLocation(
                            latitude,
                            longitude,
                            radiusKm,
                            {
                                attractionIds: [r.tmId!],
                                startDateTime,
                                size: 30,
                            }
                        );
                        return {
                            resolved: r,
                            events: response._embedded?.events || [],
                        };
                    } catch (error) {
                        logger.warn('Failed attraction ID search for artist', {
                            tmId: r.tmId,
                            artistName: r.artist.name,
                            error: error instanceof Error ? error.message : 'Unknown',
                        });
                        return { resolved: r, events: [] as TmEvent[] };
                    }
                })
            );

            for (const { resolved, events: tmEvents } of results) {
                for (const tmEvent of tmEvents) {
                    if (seenExternalIds.has(tmEvent.id)) continue;
                    seenExternalIds.add(tmEvent.id);

                    const mapped = mapTmEventToDomain(
                        tmEvent,
                        resolved.artist._id?.toString() || '',
                        resolved.tmName || resolved.artist.name
                    );

                    if (
                        (mapped.venue.location.coordinates[0] !== 0 ||
                            mapped.venue.location.coordinates[1] !== 0) &&
                        mapped.date >= now
                    ) {
                        allEvents.push(mapped);
                    }
                }
            }
        }

        // Step 3: Fallback — keyword search for unresolved artists
        const keywordBatchSize = 3;
        for (let i = 0; i < withoutAttractionId.length; i += keywordBatchSize) {
            const batch = withoutAttractionId.slice(i, i + keywordBatchSize);

            const results = await Promise.all(
                batch.map(async (r) => {
                    try {
                        const response = await ticketmasterClient.searchEventsByLocation(
                            latitude,
                            longitude,
                            radiusKm,
                            {
                                keyword: r.artist.name,
                                startDateTime,
                                size: 20,
                            }
                        );
                        return {
                            artist: r.artist,
                            events: response._embedded?.events || [],
                        };
                    } catch (error) {
                        logger.warn('Keyword fallback failed for artist', {
                            artistName: r.artist.name,
                            error: error instanceof Error ? error.message : 'Unknown',
                        });
                        return { artist: r.artist, events: [] as TmEvent[] };
                    }
                })
            );

            for (const { artist, events: tmEvents } of results) {
                for (const tmEvent of tmEvents) {
                    if (seenExternalIds.has(tmEvent.id)) continue;
                    seenExternalIds.add(tmEvent.id);

                    const mapped = mapTmEventToDomain(
                        tmEvent,
                        artist._id?.toString() || '',
                        artist.name
                    );

                    if (
                        (mapped.venue.location.coordinates[0] !== 0 ||
                            mapped.venue.location.coordinates[1] !== 0) &&
                        mapped.date >= now
                    ) {
                        allEvents.push(mapped);
                    }
                }
            }
        }

        // Sort by date
        allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

        logger.info('Artist location search complete', {
            totalEvents: allEvents.length,
            fromAttractionIds: withAttractionId.length,
            fromKeywordFallback: withoutAttractionId.length,
        });

        return allEvents.slice(0, 200);
    }

    // These methods are only meaningful for persistent stores (MongoDB).
    // Ticketmaster is a live API source — returning empty arrays is correct.

    async findCreatedAfter(_since: Date, _artistId?: string): Promise<Event[]> {
        return [];
    }

    async findUpcomingInDateRange(_artistIds: string[], _from: Date, _to: Date): Promise<Event[]> {
        return [];
    }
}
