import { Artist } from './artist.entity';
import { MusicBrainzArtist } from '../../infrastructure/integrations/musicbrainz.client';

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
    isCacheValid(artist: Artist): boolean;
    count(): Promise<number>;
    findStaleArtists(limit?: number): Promise<Artist[]>;
}
