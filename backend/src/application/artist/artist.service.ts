import { IArtistRepository } from '../../domain/artist/artist.repository.interface';
import { Artist } from '../../domain/artist/artist.entity';
import { musicBrainzClient } from '../../infrastructure/integrations/musicbrainz.client';
import { logger } from '../../shared/utils/logger';

/**
 * Artist Service - Business logic layer for artist operations.
 *
 * Implements a Stale-While-Revalidate (SWR) pattern:
 * 1. Always return MongoDB results immediately (even if stale or empty)
 * 2. If data is stale/missing, trigger a background refresh from MusicBrainz
 * 3. The background refresh never blocks the HTTP response
 *
 * The inFlight set prevents duplicate concurrent refreshes for the same query/artist.
 */
export class ArtistService {
    private readonly inFlight = new Set<string>();

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
            this.inFlight.add(query);
            this.backgroundRefreshByQuery(query, limit).finally(() =>
                this.inFlight.delete(query)
            );
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
     * Does NOT trigger refresh (used in bulk list views — avoid thundering herd).
     */
    async getArtistsByIds(artistIds: string[]): Promise<Artist[]> {
        return await this.artistRepository.findByIds(artistIds);
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

            await Promise.all(
                mbArtists.map((mb) => this.artistRepository.upsertFromMusicBrainz(mb))
            );

            logger.info('Background artist refresh complete (query)', {
                query,
                count: mbArtists.length,
            });
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
                await this.artistRepository.upsertFromMusicBrainz(mbArtist);
                logger.debug('Background artist refresh complete (single)', { mbid });
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
                await this.artistRepository.upsertFromMusicBrainz(mbArtist);
                logger.info('Background artist refresh complete (mbid)', { mbid });
            }
        } catch (error) {
            logger.error('Background artist refresh failed (mbid)', {
                mbid,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
