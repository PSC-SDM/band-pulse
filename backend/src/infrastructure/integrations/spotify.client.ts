import axios, { AxiosInstance } from 'axios';
import { env } from '../../shared/config/env';
import { logger } from '../../shared/utils/logger';

/**
 * Spotify Web API Client
 *
 * Design decisions:
 * - Client Credentials flow (no user auth needed for artist data)
 * - Auto-refreshes token before expiry
 * - Singleton pattern, one token shared across all requests
 * - No strict rate limiting required but 100ms minimum between calls
 *
 * API Documentation: https://developer.spotify.com/documentation/web-api
 */

const SPOTIFY_BASE_URL = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const MIN_REQUEST_INTERVAL_MS = 100;

// ─── Raw API types ────────────────────────────────────────────────────────────

interface SpotifyTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number; // seconds
}

interface SpotifyImage {
    url: string;
    width: number | null;
    height: number | null;
}

interface SpotifyArtistRaw {
    id: string;
    name: string;
    genres: string[];
    popularity: number;
    /** Simplified Artist objects from search may omit followers */
    followers?: { href: string | null; total: number };
    images: SpotifyImage[];
    external_urls: { spotify: string };
    type: string;
    uri: string;
}

interface SpotifySearchResponse {
    artists: {
        items: SpotifyArtistRaw[];
        total: number;
    };
}

interface SpotifyRelatedArtistsResponse {
    artists: SpotifyArtistRaw[];
}

// ─── Normalized output types ──────────────────────────────────────────────────

export interface SpotifyArtistData {
    id: string;
    name: string;
    genres: string[];
    popularity: number;
    followerCount: number;
    /** URL of the largest available image */
    imageUrl?: string;
    spotifyUrl: string;
}

export interface SpotifyRelatedArtist {
    spotifyId: string;
    name: string;
    imageUrl?: string;
    genres: string[];
    followerCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pick the largest image from a Spotify images array.
 * Spotify returns images sorted by size descending (largest first) but this
 * is not guaranteed, so we sort by width explicitly.
 */
function pickLargestImage(images: SpotifyImage[]): string | undefined {
    if (images.length === 0) return undefined;
    const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    return sorted[0].url;
}

/**
 * Normalize a raw Spotify artist to our internal format.
 */
function normalizeArtist(raw: SpotifyArtistRaw): SpotifyArtistData {
    return {
        id: raw.id,
        name: raw.name,
        genres: raw.genres ?? [],
        popularity: raw.popularity ?? 0,
        followerCount: raw.followers?.total ?? 0,
        imageUrl: pickLargestImage(raw.images ?? []),
        spotifyUrl: raw.external_urls?.spotify ?? '',
    };
}

/**
 * Simple name similarity check: normalize both strings and compare.
 * Returns true if they match closely enough to be the same artist.
 */
function nameMatchesArtist(searchName: string, resultName: string): boolean {
    const normalize = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const a = normalize(searchName);
    const b = normalize(resultName);
    return a === b || a.startsWith(b) || b.startsWith(a);
}

// ─── Client ───────────────────────────────────────────────────────────────────

class SpotifyClient {
    private client: AxiosInstance;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;
    private lastRequestTime: number = 0;

    constructor() {
        this.client = axios.create({
            baseURL: SPOTIFY_BASE_URL,
            timeout: 10000,
        });

        logger.info('Spotify client initialized');
    }

    // ── Token management ────────────────────────────────────────────────────

    /**
     * Fetch a new Client Credentials token from Spotify.
     */
    private async refreshToken(): Promise<void> {
        console.log('[SPOTIFY DEBUG] refreshToken called');
        console.log('[SPOTIFY DEBUG] Client ID configured:', !!env.SPOTIFY_CLIENT_ID, 'length:', env.SPOTIFY_CLIENT_ID?.length);
        console.log('[SPOTIFY DEBUG] Client Secret configured:', !!env.SPOTIFY_CLIENT_SECRET, 'length:', env.SPOTIFY_CLIENT_SECRET?.length);
        
        try {
            const credentials = Buffer.from(
                `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
            ).toString('base64');

            const response = await axios.post<SpotifyTokenResponse>(
                SPOTIFY_TOKEN_URL,
                new URLSearchParams({ grant_type: 'client_credentials' }),
                {
                    headers: {
                        Authorization: `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    timeout: 10000,
                }
            );

            this.accessToken = response.data.access_token;
            // Subtract 30s buffer to refresh before actual expiry
            this.tokenExpiresAt = Date.now() + (response.data.expires_in - 30) * 1000;

            console.log('[SPOTIFY DEBUG] Token refreshed successfully, expires in:', response.data.expires_in, 'seconds');
            logger.debug('Spotify token refreshed', {
                expiresIn: response.data.expires_in,
            });
        } catch (error) {
            console.log('[SPOTIFY DEBUG] refreshToken FAILED:', error instanceof Error ? error.message : error);
            if (axios.isAxiosError(error)) {
                console.log('[SPOTIFY DEBUG] Token refresh error details:', error.response?.status, error.response?.data);
            }
            throw error;
        }
    }

    /**
     * Get a valid access token, refreshing if necessary.
     */
    private async getAccessToken(): Promise<string> {
        if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
            await this.refreshToken();
        }
        return this.accessToken!;
    }

    // ── Rate limiting ────────────────────────────────────────────────────────

    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < MIN_REQUEST_INTERVAL_MS) {
            await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
        }
        this.lastRequestTime = Date.now();
    }

    // ── Internal request helper ──────────────────────────────────────────────

    private async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
        await this.waitForRateLimit();
        const token = await this.getAccessToken();

        const response = await this.client.get<T>(path, {
            headers: { Authorization: `Bearer ${token}` },
            params,
        });

        return response.data;
    }

    // ── Public methods ───────────────────────────────────────────────────────

    /**
     * Search for an artist by name.
     * Returns the best-matching result or null if no confident match found.
     */
    async searchArtist(name: string): Promise<SpotifyArtistData | null> {
        try {
            console.log('[SPOTIFY DEBUG] searchArtist called with name:', name);
            logger.debug('Spotify artist search', { name });

            const data = await this.get<SpotifySearchResponse>('/search', {
                q: name,
                type: 'artist',
                limit: 5,
            });

            console.log('[SPOTIFY DEBUG] Search response received, items count:', data.artists?.items?.length ?? 0);
            const items = data.artists?.items ?? [];

            if (items.length === 0) {
                logger.info('Spotify: no results for artist', { name });
                return null;
            }

            // Prefer an exact (or close) name match; fall back to the top result
            const match =
                items.find(a => nameMatchesArtist(name, a.name)) ?? items[0];

            if (!nameMatchesArtist(name, match.name)) {
                logger.warn('Spotify: top result name mismatch, skipping', {
                    searched: name,
                    found: match.name,
                });
                return null;
            }

            console.log('[SPOTIFY DEBUG] Artist matched:', match.name, 'ID:', match.id, 'followers:', match.followers?.total);
            logger.info('Spotify artist found', {
                name,
                spotifyId: match.id,
                followers: match.followers?.total ?? 0,
            });

            const normalized = normalizeArtist(match);
            console.log('[SPOTIFY DEBUG] Normalized artist data:', JSON.stringify(normalized, null, 2));
            return normalized;
        } catch (error) {
            console.log('[SPOTIFY DEBUG] searchArtist ERROR:', error instanceof Error ? error.message : error);
            if (axios.isAxiosError(error)) {
                console.log('[SPOTIFY DEBUG] Axios error details:', error.response?.status, error.response?.data);
            }
            logger.error('Spotify artist search failed', {
                name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    /**
     * Fetch full artist data by Spotify ID.
     */
    async getArtistById(spotifyId: string): Promise<SpotifyArtistData | null> {
        try {
            logger.debug('Spotify get artist by ID', { spotifyId });

            const raw = await this.get<SpotifyArtistRaw>(`/artists/${spotifyId}`);
            console.log('[SPOTIFY DEBUG] getArtistById raw response:', JSON.stringify(raw, null, 2));
            return normalizeArtist(raw);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                logger.warn('Spotify artist not found', { spotifyId });
                return null;
            }
            console.log('[SPOTIFY DEBUG] getArtistById ERROR:', error instanceof Error ? error.message : error);
            logger.error('Spotify get artist failed', {
                spotifyId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    /**
     * Fetch artists related to a given Spotify artist.
     * Returns up to 20 related artists (Spotify's maximum).
     */
    async getRelatedArtists(spotifyId: string): Promise<SpotifyRelatedArtist[]> {
        try {
            logger.debug('Spotify get related artists', { spotifyId });

            const data = await this.get<SpotifyRelatedArtistsResponse>(
                `/artists/${spotifyId}/related-artists`
            );

            const related: SpotifyRelatedArtist[] = data.artists.map(raw => ({
                spotifyId: raw.id,
                name: raw.name,
                imageUrl: pickLargestImage(raw.images),
                genres: raw.genres,
                followerCount: raw.followers.total,
            }));

            logger.info('Spotify related artists fetched', {
                spotifyId,
                count: related.length,
            });

            return related;
        } catch (error) {
            logger.error('Spotify get related artists failed', {
                spotifyId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return [];
        }
    }
}

// Export singleton instance
export const spotifyClient = new SpotifyClient();
