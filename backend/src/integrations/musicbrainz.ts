import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { logger } from '../shared/utils/logger';

/**
 * MusicBrainz API Client
 * 
 * Design decisions:
 * - Uses MusicBrainz API v2 with JSON responses
 * - Strict rate limiting: max 1 request per second (MB requirement)
 * - User-Agent header is mandatory per MB API terms
 * - Singleton pattern for rate limiter state
 * - Extracts only identity data (no heavy relations like recordings/releases)
 * 
 * API Documentation: https://musicbrainz.org/doc/MusicBrainz_API
 */

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const RATE_LIMIT_MS = 1100; // Slightly over 1 second to be safe

/**
 * Raw artist data from MusicBrainz search/lookup response.
 */
export interface MusicBrainzArtistRaw {
    id: string; // MBID
    name: string;
    'sort-name'?: string;
    disambiguation?: string;
    type?: string; // 'Person', 'Group', 'Orchestra', etc.
    country?: string; // ISO 3166-1 alpha-2
    area?: {
        id: string;
        name: string;
        'sort-name'?: string;
        'iso-3166-1-codes'?: string[];
    };
    'begin-area'?: {
        id: string;
        name: string;
    };
    'life-span'?: {
        begin?: string;
        end?: string;
        ended?: boolean;
    };
    aliases?: Array<{
        name: string;
        'sort-name'?: string;
        locale?: string;
        primary?: boolean;
        type?: string;
    }>;
    score?: number; // Search relevance score (0-100)
}

/**
 * Normalized artist data for internal use.
 */
export interface MusicBrainzArtist {
    mbid: string;
    name: string;
    sortName?: string;
    disambiguation?: string;
    type?: string;
    country?: string;
    area?: {
        name: string;
        iso31661?: string;
    };
    aliases: Array<{
        name: string;
        sortName?: string;
        locale?: string;
        primary?: boolean;
        type?: string;
    }>;
    score?: number;
}

/**
 * Search response from MusicBrainz API.
 */
interface MusicBrainzSearchResponse {
    created: string;
    count: number;
    offset: number;
    artists: MusicBrainzArtistRaw[];
}

/**
 * Normalize raw MusicBrainz artist data to internal format.
 */
function normalizeArtist(raw: MusicBrainzArtistRaw): MusicBrainzArtist {
    return {
        mbid: raw.id,
        name: raw.name,
        sortName: raw['sort-name'],
        disambiguation: raw.disambiguation,
        type: raw.type,
        country: raw.country,
        area: raw.area ? {
            name: raw.area.name,
            iso31661: raw.area['iso-3166-1-codes']?.[0],
        } : undefined,
        aliases: (raw.aliases || []).map(alias => ({
            name: alias.name,
            sortName: alias['sort-name'],
            locale: alias.locale,
            primary: alias.primary,
            type: alias.type,
        })),
        score: raw.score,
    };
}

/**
 * MusicBrainz API Client with built-in rate limiting.
 * 
 * Rate limiting is critical: MusicBrainz will block IPs that exceed 1 req/s.
 * This client uses a queue-based approach to ensure compliance.
 */
class MusicBrainzClient {
    private client: AxiosInstance;
    private lastRequestTime: number = 0;
    private requestQueue: Array<() => void> = [];
    private isProcessingQueue: boolean = false;

    constructor() {
        this.client = axios.create({
            baseURL: MUSICBRAINZ_BASE_URL,
            headers: {
                'User-Agent': env.MUSICBRAINZ_USER_AGENT,
                'Accept': 'application/json',
            },
            timeout: 10000, // 10 second timeout
        });

        logger.info('MusicBrainz client initialized', {
            userAgent: env.MUSICBRAINZ_USER_AGENT,
        });
    }

    /**
     * Enforce rate limiting by waiting if necessary.
     * Returns a promise that resolves when it's safe to make a request.
     */
    private async waitForRateLimit(): Promise<void> {
        return new Promise((resolve) => {
            this.requestQueue.push(resolve);
            this.processQueue();
        });
    }

    /**
     * Process the request queue with rate limiting.
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;

            if (timeSinceLastRequest < RATE_LIMIT_MS) {
                const waitTime = RATE_LIMIT_MS - timeSinceLastRequest;
                await new Promise(r => setTimeout(r, waitTime));
            }

            this.lastRequestTime = Date.now();
            const resolve = this.requestQueue.shift();
            if (resolve) {
                resolve();
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Search for artists by name.
     * 
     * @param query - Artist name or partial name to search for
     * @param limit - Maximum number of results (default: 10, max: 100)
     * @returns Array of normalized artist data
     */
    async searchArtists(query: string, limit: number = 10): Promise<MusicBrainzArtist[]> {
        await this.waitForRateLimit();

        try {
            logger.debug('MusicBrainz search request', { query, limit });

            const response = await this.client.get<MusicBrainzSearchResponse>('/artist', {
                params: {
                    query: query,
                    limit: Math.min(limit, 100),
                    fmt: 'json',
                },
            });

            const artists = response.data.artists.map(normalizeArtist);

            logger.info('MusicBrainz search completed', {
                query,
                total: response.data.count,
                returned: artists.length,
            });

            return artists;
        } catch (error) {
            logger.error('MusicBrainz search failed', {
                query,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to search MusicBrainz: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Fetch a specific artist by MBID.
     * 
     * @param mbid - MusicBrainz ID (UUID format)
     * @returns Normalized artist data or null if not found
     */
    async getArtistByMbid(mbid: string): Promise<MusicBrainzArtist | null> {
        await this.waitForRateLimit();

        try {
            logger.debug('MusicBrainz lookup request', { mbid });

            // Include aliases in the lookup for complete identity data
            const response = await this.client.get<MusicBrainzArtistRaw>(`/artist/${mbid}`, {
                params: {
                    inc: 'aliases',
                    fmt: 'json',
                },
            });

            const artist = normalizeArtist(response.data);

            logger.info('MusicBrainz lookup completed', {
                mbid,
                name: artist.name,
            });

            return artist;
        } catch (error) {
            // 404 means artist not found - return null instead of throwing
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                logger.warn('MusicBrainz artist not found', { mbid });
                return null;
            }

            logger.error('MusicBrainz lookup failed', {
                mbid,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to fetch artist from MusicBrainz: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Export singleton instance
export const musicBrainzClient = new MusicBrainzClient();
