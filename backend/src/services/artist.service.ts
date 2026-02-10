import { ArtistRepository } from '../repositories/artist.repository';
import { musicBrainzClient, MusicBrainzArtist } from '../integrations/musicbrainz';
import { Artist, ArtistResponse, toArtistResponse } from '../types/artist.types';
import { logger } from '../shared/utils/logger';

/**
 * Artist Service - Business logic layer for artist operations.
 * 
 * This service implements the cache-first, lazy-loading pattern:
 * 1. Always query MongoDB first
 * 2. Only call external APIs on cache miss
 * 3. Persist results before returning
 * 4. Never expose external API responses directly
 * 
 * Design decisions:
 * - MusicBrainz is the single source of truth for artist identity
 * - All responses come from MongoDB (after potential refresh)
 * - Enrichment (Spotify data, images, etc.) is deferred to future phases
 * - Service layer encapsulates all business logic
 */
export class ArtistService {
    constructor(private artistRepository: ArtistRepository) { }

    /**
     * Search for artists by name.
     * 
     * Lazy-loading flow:
     * 1. Search MongoDB text index
     * 2. If valid cached results exist → return them
     * 3. If not → query MusicBrainz → upsert → return from MongoDB
     * 
     * @param query - Artist name or partial name
     * @param limit - Maximum number of results
     * @returns Array of artists from MongoDB
     */
    async searchArtists(query: string, limit: number = 10): Promise<Artist[]> {
        // Step 1: Search MongoDB first
        const cachedArtists = await this.artistRepository.search(query, limit);

        // Step 2: Check if we have enough valid cached results
        const validCached = cachedArtists.filter(artist =>
            this.artistRepository.isCacheValid(artist)
        );

        if (validCached.length > 0) {
            logger.info('Artist search: cache hit', {
                query,
                cachedCount: validCached.length,
            });
            return validCached;
        }

        // Step 3: Cache miss - query MusicBrainz
        logger.info('Artist search: cache miss, querying MusicBrainz', { query });

        try {
            const mbArtists = await musicBrainzClient.searchArtists(query, limit);

            if (mbArtists.length === 0) {
                logger.info('Artist search: no results from MusicBrainz', { query });
                return cachedArtists; // Return stale cache if available
            }

            // Step 4: Upsert all results
            const upsertedArtists = await Promise.all(
                mbArtists.map(mbArtist => this.artistRepository.upsertFromMusicBrainz(mbArtist))
            );

            logger.info('Artist search: persisted from MusicBrainz', {
                query,
                count: upsertedArtists.length,
            });

            return upsertedArtists;
        } catch (error) {
            // On external API failure, return cached results (even if stale)
            logger.error('Artist search: MusicBrainz API error, returning cached', {
                query,
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            return cachedArtists;
        }
    }

    /**
     * Get a specific artist by internal ID.
     * 
     * If cache is invalid, refreshes from MusicBrainz (if MBID exists).
     * 
     * @param artistId - MongoDB ObjectId as string
     * @returns Artist or null if not found
     */
    async getArtistById(artistId: string): Promise<Artist | null> {
        const artist = await this.artistRepository.findById(artistId);

        if (!artist) {
            return null;
        }

        // Check if refresh is needed
        if (!this.artistRepository.isCacheValid(artist)) {
            return await this.refreshArtistFromMusicBrainz(artist);
        }

        return artist;
    }

    /**
     * Get artist by URL slug.
     */
    async getArtistBySlug(slug: string): Promise<Artist | null> {
        const artist = await this.artistRepository.findBySlug(slug);

        if (!artist) {
            return null;
        }

        // Check if refresh is needed
        if (!this.artistRepository.isCacheValid(artist)) {
            return await this.refreshArtistFromMusicBrainz(artist);
        }

        return artist;
    }

    /**
     * Get artist by MusicBrainz ID.
     * If not in DB, fetches from MusicBrainz and persists.
     */
    async getArtistByMbid(mbid: string): Promise<Artist | null> {
        // Check local DB first
        let artist = await this.artistRepository.findByMbid(mbid);

        if (artist && this.artistRepository.isCacheValid(artist)) {
            logger.debug('Artist by MBID: cache hit', { mbid });
            return artist;
        }

        // Fetch from MusicBrainz
        logger.info('Artist by MBID: fetching from MusicBrainz', { mbid });

        try {
            const mbArtist = await musicBrainzClient.getArtistByMbid(mbid);

            if (!mbArtist) {
                return artist; // Return stale cache if available
            }

            return await this.artistRepository.upsertFromMusicBrainz(mbArtist);
        } catch (error) {
            logger.error('Artist by MBID: MusicBrainz API error', {
                mbid,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return artist; // Return stale cache if available
        }
    }

    /**
     * Get multiple artists by their IDs.
     * Does NOT refresh stale artists (for performance in list views).
     */
    async getArtistsByIds(artistIds: string[]): Promise<Artist[]> {
        return await this.artistRepository.findByIds(artistIds);
    }

    /**
     * Refresh artist data from MusicBrainz.
     * Private method - only called when cache is invalid.
     */
    private async refreshArtistFromMusicBrainz(artist: Artist): Promise<Artist> {
        const mbid = artist.externalIds.musicbrainz;

        if (!mbid) {
            logger.warn('Cannot refresh artist without MBID', {
                artistId: artist._id?.toString()
            });
            return artist;
        }

        logger.debug('Refreshing artist from MusicBrainz', {
            artistId: artist._id?.toString(),
            mbid,
        });

        try {
            const mbArtist = await musicBrainzClient.getArtistByMbid(mbid);

            if (!mbArtist) {
                // Artist no longer exists in MusicBrainz - return stale data
                logger.warn('Artist not found in MusicBrainz during refresh', { mbid });
                return artist;
            }

            return await this.artistRepository.upsertFromMusicBrainz(mbArtist);
        } catch (error) {
            // On API failure, return stale cached data
            logger.error('Failed to refresh artist from MusicBrainz', {
                mbid,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return artist;
        }
    }

    /**
     * Convert artist to API response format.
     * Convenience method for use in route handlers.
     */
    toResponse(artist: Artist, isFollowing?: boolean): ArtistResponse {
        return toArtistResponse(artist, isFollowing);
    }
}
