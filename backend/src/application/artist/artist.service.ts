import { IArtistRepository, SpotifyEnrichmentData } from '../../domain/artist/artist.repository.interface';
import { Artist } from '../../domain/artist/artist.entity';
import { musicBrainzClient } from '../../infrastructure/integrations/musicbrainz.client';
import { spotifyClient } from '../../infrastructure/integrations/spotify.client';
import { logger } from '../../shared/utils/logger';

/**
 * Artist Service - Business logic layer for artist operations.
 *
 * Implements a Stale-While-Revalidate (SWR) pattern:
 * 1. Always return MongoDB results immediately (even if stale or empty)
 * 2. If data is stale/missing, trigger a background refresh from MusicBrainz
 * 3. After MusicBrainz refresh, trigger Spotify enrichment if Spotify cache is stale
 * 4. Background jobs never block the HTTP response
 *
 * Two separate inFlight sets prevent duplicate concurrent refreshes:
 * - inFlight: MusicBrainz identity refreshes
 * - inFlightSpotify: Spotify enrichment jobs
 */
export class ArtistService {
    private readonly inFlight = new Set<string>();
    private readonly inFlightSpotify = new Set<string>();

    constructor(private artistRepository: IArtistRepository) {}

    /**
     * Search for artists by name.
     *
     * SWR flow:
     * 1. Search MongoDB text index → return immediately
     * 2. If no valid cached results → enqueue background refresh (fire-and-forget)
     * 3. Response includes refreshPending flag so the client can re-poll if needed
     */
    async searchArtists(
        query: string,
        limit: number = 10
    ): Promise<{ artists: Artist[]; refreshPending: boolean }> {
        const cachedArtists = await this.artistRepository.search(query, limit);

        const hasValidCache = cachedArtists.some((artist) =>
            this.artistRepository.isCacheValid(artist)
        );
        const refreshPending = !hasValidCache;

        if (refreshPending && !this.inFlight.has(query)) {
            console.log('[ARTIST DEBUG] Cache miss for query, triggering background refresh:', query);
            this.inFlight.add(query);
            // backgroundRefreshByQuery also triggers Spotify enrichment after MB upsert
            this.backgroundRefreshByQuery(query, limit).finally(() =>
                this.inFlight.delete(query)
            );
        } else {
            // MB cache is fresh — still check if Spotify enrichment is needed for each result
            console.log('[ARTIST DEBUG] Cache hit for query:', query, 'checking Spotify cache for', cachedArtists.length, 'artists');
            for (const artist of cachedArtists) {
                const spotifyValid = this.artistRepository.isSpotifyCacheValid(artist);
                console.log('[ARTIST DEBUG] Artist:', artist.name, 'spotifyLastFetchedAt:', artist.spotifyLastFetchedAt, 'Spotify cache valid:', spotifyValid);
                if (!spotifyValid) {
                    console.log('[ARTIST DEBUG] Spotify cache stale for artist:', artist.name, '- triggering enrichment');
                    this.triggerSpotifyEnrichment(artist);
                }
            }
        }

        logger.info('Artist search', {
            query,
            cachedCount: cachedArtists.length,
            hasValidCache,
            refreshPending,
        });

        return { artists: cachedArtists, refreshPending };
    }

    /**
     * Get a specific artist by internal ID.
     * Returns immediately (even stale). Triggers background refresh if stale.
     */
    async getArtistById(artistId: string): Promise<Artist | null> {
        const artist = await this.artistRepository.findById(artistId);

        if (!artist) return null;

        if (!this.artistRepository.isCacheValid(artist)) {
            const key = artist._id!.toString();
            if (!this.inFlight.has(key)) {
                this.inFlight.add(key);
                this.backgroundRefreshSingleArtist(artist).finally(() =>
                    this.inFlight.delete(key)
                );
            }
        } else if (!this.artistRepository.isSpotifyCacheValid(artist)) {
            // MusicBrainz data is fresh but Spotify enrichment is stale
            this.triggerSpotifyEnrichment(artist);
        }

        return artist;
    }

    /**
     * Get artist by URL slug.
     * Returns immediately (even stale). Triggers background refresh if stale.
     */
    async getArtistBySlug(slug: string): Promise<Artist | null> {
        const artist = await this.artistRepository.findBySlug(slug);

        if (!artist) return null;

        if (!this.artistRepository.isCacheValid(artist)) {
            const key = `slug:${slug}`;
            if (!this.inFlight.has(key)) {
                this.inFlight.add(key);
                this.backgroundRefreshSingleArtist(artist).finally(() =>
                    this.inFlight.delete(key)
                );
            }
        } else if (!this.artistRepository.isSpotifyCacheValid(artist)) {
            this.triggerSpotifyEnrichment(artist);
        }

        return artist;
    }

    /**
     * Get artist by MusicBrainz ID.
     * If not in DB, triggers background fetch and returns null (client should re-poll).
     * If in DB but stale, returns stale data and triggers background refresh.
     */
    async getArtistByMbid(mbid: string): Promise<Artist | null> {
        const artist = await this.artistRepository.findByMbid(mbid);

        if (artist && this.artistRepository.isCacheValid(artist)) {
            logger.debug('Artist by MBID: cache hit', { mbid });
            if (!this.artistRepository.isSpotifyCacheValid(artist)) {
                this.triggerSpotifyEnrichment(artist);
            }
            return artist;
        }

        if (!this.inFlight.has(`mbid:${mbid}`)) {
            this.inFlight.add(`mbid:${mbid}`);
            this.backgroundRefreshByMbid(mbid).finally(() =>
                this.inFlight.delete(`mbid:${mbid}`)
            );
        }

        return artist ?? null;
    }

    /**
     * Get multiple artists by their IDs.
     * Does NOT trigger MusicBrainz refresh (avoid thundering herd in bulk views).
     * DOES trigger Spotify enrichment for any artist missing it.
     */
    async getArtistsByIds(artistIds: string[]): Promise<Artist[]> {
        return await this.artistRepository.findByIds(artistIds);
    }

    /**
     * Trigger Spotify enrichment for a list of artists that need it.
     * Called from controllers after bulk fetches (e.g. followed artists list)
     * that bypass the normal SWR path.
     */
    enrichIfStale(artists: Artist[]): void {
        for (const artist of artists) {
            if (!this.artistRepository.isSpotifyCacheValid(artist)) {
                this.triggerSpotifyEnrichment(artist);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Background refresh helpers (fire-and-forget)
    // -------------------------------------------------------------------------

    private async backgroundRefreshByQuery(query: string, limit: number): Promise<void> {
        try {
            logger.info('Background artist refresh start (query)', { query });
            const mbArtists = await musicBrainzClient.searchArtists(query, limit);

            if (mbArtists.length === 0) {
                logger.info('Background artist refresh: no results from MusicBrainz', { query });
                return;
            }

            const upserted = await Promise.all(
                mbArtists.map((mb) => this.artistRepository.upsertFromMusicBrainz(mb))
            );

            logger.info('Background artist refresh complete (query)', {
                query,
                count: mbArtists.length,
            });

            // Trigger Spotify enrichment for any artists that need it
            for (const artist of upserted) {
                if (!this.artistRepository.isSpotifyCacheValid(artist)) {
                    this.triggerSpotifyEnrichment(artist);
                }
            }
        } catch (error) {
            logger.error('Background artist refresh failed (query)', {
                query,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    private async backgroundRefreshSingleArtist(artist: Artist): Promise<void> {
        const mbid = artist.externalIds.musicbrainz;

        if (!mbid) {
            logger.warn('Cannot refresh artist without MBID', {
                artistId: artist._id?.toString(),
            });
            return;
        }

        try {
            logger.debug('Background artist refresh start (single)', {
                artistId: artist._id?.toString(),
                mbid,
            });
            const mbArtist = await musicBrainzClient.getArtistByMbid(mbid);

            if (mbArtist) {
                const updated = await this.artistRepository.upsertFromMusicBrainz(mbArtist);
                logger.debug('Background artist refresh complete (single)', { mbid });

                if (!this.artistRepository.isSpotifyCacheValid(updated)) {
                    this.triggerSpotifyEnrichment(updated);
                }
            }
        } catch (error) {
            logger.error('Background artist refresh failed (single)', {
                mbid,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    private async backgroundRefreshByMbid(mbid: string): Promise<void> {
        try {
            logger.info('Background artist refresh start (mbid)', { mbid });
            const mbArtist = await musicBrainzClient.getArtistByMbid(mbid);

            if (mbArtist) {
                const updated = await this.artistRepository.upsertFromMusicBrainz(mbArtist);
                logger.info('Background artist refresh complete (mbid)', { mbid });

                if (!this.artistRepository.isSpotifyCacheValid(updated)) {
                    this.triggerSpotifyEnrichment(updated);
                }
            }
        } catch (error) {
            logger.error('Background artist refresh failed (mbid)', {
                mbid,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // -------------------------------------------------------------------------
    // Spotify enrichment (fire-and-forget)
    // -------------------------------------------------------------------------

    /**
     * Fire-and-forget Spotify enrichment for an artist.
     * Uses inFlightSpotify to avoid duplicate concurrent enrichments.
     */
    private triggerSpotifyEnrichment(artist: Artist): void {
        const mbid = artist.externalIds.musicbrainz;
        console.log('[ARTIST DEBUG] triggerSpotifyEnrichment called for artist:', artist.name, 'MBID:', mbid);
        
        if (!mbid) {
            console.log('[ARTIST DEBUG] Cannot enrich - no MBID for artist:', artist.name);
            return;
        }
        
        if (this.inFlightSpotify.has(mbid)) {
            console.log('[ARTIST DEBUG] Spotify enrichment already in flight for MBID:', mbid);
            return;
        }

        console.log('[ARTIST DEBUG] Starting Spotify enrichment for artist:', artist.name, 'MBID:', mbid);
        this.inFlightSpotify.add(mbid);
        this.backgroundEnrichFromSpotify(artist).finally(() =>
            this.inFlightSpotify.delete(mbid)
        );
    }

    /**
     * Enrich an artist with Spotify data:
     *  1. Find the artist on Spotify (by existing ID or by name search)
     *  2. Fetch full artist details (image, genres, followers, popularity)
     *  3. Fetch related artists
     *  4. Persist enrichment to MongoDB
     */
    private async backgroundEnrichFromSpotify(artist: Artist): Promise<void> {
        const mbid = artist.externalIds.musicbrainz;

        try {
            console.log('[ARTIST DEBUG] backgroundEnrichFromSpotify START for:', artist.name, 'MBID:', mbid);
            logger.info('Spotify enrichment start', {
                artistId: artist._id?.toString(),
                name: artist.name,
                mbid,
            });

            let spotifyData = null;

            // Use existing Spotify ID if available, otherwise search by name
            if (artist.externalIds.spotify) {
                console.log('[ARTIST DEBUG] Using existing Spotify ID:', artist.externalIds.spotify);
                spotifyData = await spotifyClient.getArtistById(artist.externalIds.spotify);
            }

            if (!spotifyData) {
                console.log('[ARTIST DEBUG] No existing Spotify ID, searching by name:', artist.name);
                // Search by name, then always fetch the full object by ID to get
                // accurate follower count (search may return simplified Artist objects)
                const searchResult = await spotifyClient.searchArtist(artist.name);
                console.log('[ARTIST DEBUG] Spotify search result:', searchResult ? 'FOUND' : 'NOT FOUND');
                if (searchResult) {
                    console.log('[ARTIST DEBUG] Fetching full artist data by ID:', searchResult.id);
                    spotifyData = await spotifyClient.getArtistById(searchResult.id) ?? searchResult;
                }
            }

            if (!spotifyData) {
                console.log('[ARTIST DEBUG] Spotify enrichment FAILED - artist not found on Spotify:', artist.name);
                logger.warn('Spotify enrichment: artist not found on Spotify', {
                    name: artist.name,
                    mbid,
                });
                return;
            }

            console.log('[ARTIST DEBUG] Spotify data retrieved:', JSON.stringify(spotifyData, null, 2));

            // Fetch related artists (store top 10 by follower count)
            console.log('[ARTIST DEBUG] Fetching related artists for Spotify ID:', spotifyData.id);
            const relatedRaw = await spotifyClient.getRelatedArtists(spotifyData.id);
            console.log('[ARTIST DEBUG] Related artists count:', relatedRaw.length);
            const relatedArtists = relatedRaw
                .sort((a, b) => b.followerCount - a.followerCount)
                .slice(0, 10)
                .map(r => ({
                    spotifyId: r.spotifyId,
                    name: r.name,
                    imageUrl: r.imageUrl,
                    genres: r.genres,
                    followerCount: r.followerCount,
                }));

            const enrichmentData: SpotifyEnrichmentData = {
                spotifyId: spotifyData.id,
                imageUrl: spotifyData.imageUrl,
                genres: spotifyData.genres,
                followerCount: spotifyData.followerCount,
                popularity: spotifyData.popularity,
                relatedArtists,
                spotifyUrl: spotifyData.spotifyUrl,
            };

            console.log('[ARTIST DEBUG] Enrichment data prepared:', JSON.stringify(enrichmentData, null, 2));
            console.log('[ARTIST DEBUG] Calling updateSpotifyEnrichment with MBID:', mbid);
            await this.artistRepository.updateSpotifyEnrichment(mbid, enrichmentData);
            console.log('[ARTIST DEBUG] updateSpotifyEnrichment completed for MBID:', mbid);

            logger.info('Spotify enrichment complete', {
                name: artist.name,
                mbid,
                spotifyId: spotifyData.id,
                followers: spotifyData.followerCount,
                relatedCount: relatedArtists.length,
            });
        } catch (error) {
            console.log('[ARTIST DEBUG] backgroundEnrichFromSpotify CATCH - Error occurred:', error instanceof Error ? error.message : error);
            console.log('[ARTIST DEBUG] Full error:', error);
            logger.error('Spotify enrichment failed', {
                name: artist.name,
                mbid,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
