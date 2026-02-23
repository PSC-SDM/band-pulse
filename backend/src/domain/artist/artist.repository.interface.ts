import { Artist, RelatedArtist } from './artist.entity';
import { MusicBrainzArtist } from '../../infrastructure/integrations/musicbrainz.client';

/**
 * Data required to enrich an artist with Spotify data.
 */
export interface SpotifyEnrichmentData {
    spotifyId: string;
    imageUrl?: string;
    genres: string[];
    followerCount: number;
    popularity: number;
    relatedArtists: RelatedArtist[];
    spotifyUrl: string;
}

/**
 * Artist repository interface - contract for data access.
 * Infrastructure layer must implement this interface.
 */
export interface IArtistRepository {
    findById(id: string): Promise<Artist | null>;
    findByMbid(mbid: string): Promise<Artist | null>;
    findBySlug(slug: string): Promise<Artist | null>;
    findByIds(ids: string[]): Promise<Artist[]>;
    search(query: string, limit?: number): Promise<Artist[]>;
    upsertFromMusicBrainz(mbData: MusicBrainzArtist): Promise<Artist>;
    /** Persist Spotify enrichment data for an artist identified by MBID */
    updateSpotifyEnrichment(mbid: string, data: SpotifyEnrichmentData): Promise<void>;
    isCacheValid(artist: Artist): boolean;
    /** Check if Spotify enrichment is still fresh (separate TTL from MusicBrainz) */
    isSpotifyCacheValid(artist: Artist): boolean;
    count(): Promise<number>;
    findStaleArtists(limit?: number): Promise<Artist[]>;
}
