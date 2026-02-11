import axios, { AxiosInstance } from 'axios';
import ngeohash from 'ngeohash';
import { env } from '../../shared/config/env';
import { logger } from '../../shared/utils/logger';
import { TtlCache } from '../../shared/utils/ttl-cache';

/**
 * Ticketmaster Discovery API Client
 *
 * Uses the Discovery API v2 to fetch events, attractions (artists), and venues.
 * Free tier: 5,000 calls/day, 5 req/second.
 *
 * API Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

// Rate limiting: max 5 requests per second → 200ms between requests
const RATE_LIMIT_MS = 220;

// ---------------------------------------------------------------------------
// Response types (relevant fields only)
// ---------------------------------------------------------------------------

export interface TmVenue {
    id: string;
    name: string;
    url?: string;
    locale?: string;
    city?: { name: string };
    state?: { name: string; stateCode: string };
    country?: { name: string; countryCode: string };
    address?: { line1?: string; line2?: string };
    postalCode?: string;
    location?: { longitude: string; latitude: string };
    timezone?: string;
}

export interface TmAttraction {
    id: string;
    name: string;
    type?: string;
    url?: string;
    locale?: string;
    externalLinks?: Record<string, Array<{ url: string }>>;
    images?: Array<{ url: string; ratio?: string; width?: number; height?: number }>;
    classifications?: Array<{
        primary?: boolean;
        segment?: { id: string; name: string };
        genre?: { id: string; name: string };
        subGenre?: { id: string; name: string };
    }>;
}

export interface TmEvent {
    id: string;
    name: string;
    type?: string;
    url?: string;
    locale?: string;
    dates?: {
        start?: {
            localDate?: string;
            localTime?: string;
            dateTime?: string;
            dateTBD?: boolean;
            dateTBA?: boolean;
            timeTBA?: boolean;
            noSpecificTime?: boolean;
        };
        end?: {
            localDate?: string;
            dateTime?: string;
        };
        status?: { code?: string }; // 'onsale', 'offsale', 'cancelled', 'postponed', 'rescheduled'
    };
    classifications?: Array<{
        primary?: boolean;
        segment?: { id: string; name: string };
        genre?: { id: string; name: string };
        subGenre?: { id: string; name: string };
        type?: { id: string; name: string };
    }>;
    _embedded?: {
        venues?: TmVenue[];
        attractions?: TmAttraction[];
    };
    priceRanges?: Array<{
        type?: string;
        currency?: string;
        min?: number;
        max?: number;
    }>;
    images?: Array<{ url: string; ratio?: string; width?: number; height?: number }>;
}

export interface TmSearchResponse<T> {
    _embedded?: { events?: T[]; attractions?: T[]; venues?: T[] };
    _links?: { self?: { href: string }; next?: { href: string } };
    page?: {
        size: number;
        totalElements: number;
        totalPages: number;
        number: number;
    };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

class TicketmasterClient {
    private client: AxiosInstance;
    private lastRequestTime: number = 0;
    private requestQueue: Array<() => void> = [];
    private isProcessingQueue: boolean = false;

    /** HTTP-level cache: caches raw API responses to avoid duplicate calls */
    private responseCache: TtlCache<TmSearchResponse<TmEvent>>;
    private attractionCache: TtlCache<TmAttraction[]>;

    constructor() {
        this.client = axios.create({
            baseURL: TICKETMASTER_BASE_URL,
            timeout: 15000,
        });

        // Cache raw API responses (10 min TTL, max 200 entries)
        this.responseCache = new TtlCache({
            name: 'tm-http-events',
            ttlMs: (env.TM_HTTP_CACHE_TTL || 600) * 1000,
            maxSize: 200,
            statsInterval: 20,
        });

        this.attractionCache = new TtlCache({
            name: 'tm-http-attractions',
            ttlMs: (env.TM_HTTP_CACHE_TTL || 600) * 1000,
            maxSize: 100,
        });

        logger.info('Ticketmaster client initialized', {
            httpCacheTtl: `${env.TM_HTTP_CACHE_TTL || 600}s`,
        });
    }

    // -----------------------------------------------------------------------
    // Rate limiting (5 req/s)
    // -----------------------------------------------------------------------

    private async waitForRateLimit(): Promise<void> {
        return new Promise((resolve) => {
            this.requestQueue.push(resolve);
            this.processQueue();
        });
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.requestQueue.length === 0) return;

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const now = Date.now();
            const elapsed = now - this.lastRequestTime;

            if (elapsed < RATE_LIMIT_MS) {
                await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
            }

            this.lastRequestTime = Date.now();
            const resolve = this.requestQueue.shift();
            if (resolve) resolve();
        }

        this.isProcessingQueue = false;
    }

    // -----------------------------------------------------------------------
    // Public methods
    // -----------------------------------------------------------------------

    /**
     * Search events by geographic area.
     *
     * @param latitude  Center latitude
     * @param longitude Center longitude
     * @param radiusKm  Search radius in km (max ~500 supported by TM)
     * @param options   Additional filters
     */
    async searchEventsByLocation(
        latitude: number,
        longitude: number,
        radiusKm: number,
        options: {
            keyword?: string;
            attractionIds?: string[];
            classificationName?: string;
            startDateTime?: string;
            endDateTime?: string;
            size?: number;
            page?: number;
            sort?: string;
        } = {}
    ): Promise<TmSearchResponse<TmEvent>> {
        // Precise geohash (precision 7 ≈ ±76m) for the actual API call
        const geoPoint = ngeohash.encode(latitude, longitude, 7);

        // Coarse geohash (precision 5 ≈ ±2.4km) for cache key — nearby positions share cache
        const cacheGeoPoint = ngeohash.encode(latitude, longitude, 5);

        // Ticketmaster max radius is 500 miles ≈ 804 km. Cap it.
        const radius = Math.min(radiusKm, 804);

        // Build cache key from ALL params that affect results
        const attractionPart = options.attractionIds?.length
            ? options.attractionIds.slice().sort().join(',')
            : '';
        const cacheKey = `loc:${cacheGeoPoint}:${radius}:${options.keyword || ''}:${attractionPart}:${options.size || 50}:${options.page || 0}`;
        const cached = this.responseCache.get(cacheKey);
        if (cached) {
            logger.debug('Ticketmaster HTTP cache hit', { cacheKey });
            return cached;
        }

        await this.waitForRateLimit();

        const params: Record<string, string | number> = {
            apikey: env.TICKETMASTER_API_KEY,
            geoPoint, // precision 7 — precise location for accurate results
            radius: Math.ceil(radius),
            unit: 'km',
            classificationName: options.classificationName || 'music',
            size: options.size || 50,
            page: options.page || 0,
            sort: options.sort || 'date,asc',
        };

        if (options.keyword) params.keyword = options.keyword;
        if (options.startDateTime) params.startDateTime = options.startDateTime;
        if (options.endDateTime) params.endDateTime = options.endDateTime;
        if (options.attractionIds && options.attractionIds.length > 0) {
            params.attractionId = options.attractionIds.join(',');
        }

        try {
            logger.debug('Ticketmaster event search (API call)', { geoPoint, radius, keyword: options.keyword });

            const response = await this.client.get<TmSearchResponse<TmEvent>>('/events.json', {
                params,
            });

            const total = response.data.page?.totalElements || 0;
            const returned = response.data._embedded?.events?.length || 0;

            logger.info('Ticketmaster event search completed', {
                geoPoint,
                radius,
                total,
                returned,
            });

            // Cache the response
            this.responseCache.set(cacheKey, response.data);

            return response.data;
        } catch (error) {
            logger.error('Ticketmaster event search failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                geoPoint,
                radius,
            });
            // Return stale data if available
            const stale = this.responseCache.getStale(cacheKey);
            if (stale) {
                logger.warn('Returning stale cached data after API error', { cacheKey });
                return stale;
            }
            throw new Error(
                `Ticketmaster search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Search events for a specific artist by name.
     */
    async searchEventsByArtistName(
        artistName: string,
        options: {
            size?: number;
            page?: number;
            sort?: string;
        } = {}
    ): Promise<TmSearchResponse<TmEvent>> {
        // Cache key based on normalized artist name + params
        const cacheKey = `artist:${artistName.toLowerCase().trim()}:${options.size || 50}:${options.page || 0}`;
        const cached = this.responseCache.get(cacheKey);
        if (cached) {
            logger.debug('Ticketmaster artist HTTP cache hit', { artistName, cacheKey });
            return cached;
        }

        await this.waitForRateLimit();

        const params: Record<string, string | number> = {
            apikey: env.TICKETMASTER_API_KEY,
            keyword: artistName,
            classificationName: 'music',
            size: options.size || 50,
            page: options.page || 0,
            sort: options.sort || 'date,asc',
        };

        try {
            logger.debug('Ticketmaster artist event search (API call)', { artistName });

            const response = await this.client.get<TmSearchResponse<TmEvent>>('/events.json', {
                params,
            });

            const total = response.data.page?.totalElements || 0;
            const returned = response.data._embedded?.events?.length || 0;

            logger.info('Ticketmaster artist event search completed', {
                artistName,
                total,
                returned,
            });

            // Cache the response
            this.responseCache.set(cacheKey, response.data);

            return response.data;
        } catch (error) {
            logger.error('Ticketmaster artist event search failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                artistName,
            });
            // Return stale data if available
            const stale = this.responseCache.getStale(cacheKey);
            if (stale) {
                logger.warn('Returning stale artist data after API error', { artistName });
                return stale;
            }
            throw new Error(
                `Ticketmaster artist search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Search for an attraction (artist) by keyword to get their Ticketmaster ID.
     */
    async searchAttractions(
        keyword: string,
        options: { size?: number } = {}
    ): Promise<TmAttraction[]> {
        const cacheKey = `attr:${keyword.toLowerCase().trim()}:${options.size || 5}`;
        const cached = this.attractionCache.get(cacheKey);
        if (cached) {
            logger.debug('Ticketmaster attraction cache hit', { keyword });
            return cached;
        }

        await this.waitForRateLimit();

        try {
            logger.debug('Ticketmaster attraction search (API call)', { keyword });

            const response = await this.client.get<TmSearchResponse<TmAttraction>>(
                '/attractions.json',
                {
                    params: {
                        apikey: env.TICKETMASTER_API_KEY,
                        keyword,
                        classificationName: 'music',
                        size: options.size || 5,
                    },
                }
            );

            const results = response.data._embedded?.attractions || [];
            this.attractionCache.set(cacheKey, results);
            return results;
        } catch (error) {
            logger.error('Ticketmaster attraction search failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                keyword,
            });
            // Return stale data if available
            const stale = this.attractionCache.getStale(cacheKey);
            if (stale) {
                logger.warn('Returning stale attraction data after API error', { keyword });
                return stale;
            }
            return [];
        }
    }

    /**
     * Check inventory/sold-out status for one or more events.
     *
     * Uses the Inventory Status API v1 which returns:
     *   - TICKETS_AVAILABLE
     *   - FEW_TICKETS_LEFT
     *   - TICKETS_NOT_AVAILABLE  (= sold out)
     *
     * Accepts up to ~50 event IDs per call.
     */
    async getInventoryStatus(
        eventIds: string[]
    ): Promise<Map<string, 'available' | 'few' | 'soldout' | 'unknown'>> {
        const result = new Map<string, 'available' | 'few' | 'soldout' | 'unknown'>();

        if (eventIds.length === 0) return result;

        await this.waitForRateLimit();

        try {
            const response = await axios.get(
                'https://app.ticketmaster.com/inventory-status/v1/availability',
                {
                    params: {
                        apikey: env.TICKETMASTER_API_KEY,
                        events: eventIds.join(','),
                    },
                    timeout: 10000,
                }
            );

            // Response is an array of { eventId, status, resaleStatus }
            const statuses = Array.isArray(response.data) ? response.data : [];

            for (const item of statuses) {
                const id = item.eventId || item.event_id;
                const status = item.status;

                if (!id) continue;

                if (status === 'TICKETS_NOT_AVAILABLE') {
                    result.set(id, 'soldout');
                } else if (status === 'FEW_TICKETS_LEFT') {
                    result.set(id, 'few');
                } else if (status === 'TICKETS_AVAILABLE') {
                    result.set(id, 'available');
                } else {
                    result.set(id, 'unknown');
                }
            }

            logger.debug('Inventory status check completed', {
                requested: eventIds.length,
                returned: statuses.length,
                soldOut: [...result.values()].filter((v) => v === 'soldout').length,
            });
        } catch (error) {
            logger.warn('Inventory status check failed (non-critical)', {
                error: error instanceof Error ? error.message : 'Unknown',
                eventCount: eventIds.length,
            });
            // Non-critical — we just won't know the sold-out status
        }

        return result;
    }

    /**
     * Get cache statistics for monitoring.
     */
    getCacheStats() {
        return {
            events: this.responseCache.getStats(),
            attractions: this.attractionCache.getStats(),
        };
    }
}

// Export singleton instance
export const ticketmasterClient = new TicketmasterClient();
