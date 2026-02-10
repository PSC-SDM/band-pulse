import { ObjectId } from 'mongodb';

/**
 * Artist domain model for BandPulse.
 * 
 * Design decisions:
 * - MusicBrainz ID (MBID) is the canonical, stable identifier for artist identity
 * - External IDs (Spotify, Bandsintown) are optional and reserved for future enrichment
 * - Fields like imageUrl, genres, metadata are optional - to be populated in future phases
 * - This model is designed to be extended without breaking changes
 */

/**
 * External service identifiers for an artist.
 * MusicBrainz is mandatory (source of truth), others are optional (enrichment).
 */
export interface ArtistExternalIds {
    /** MusicBrainz ID - required, canonical identifier */
    musicbrainz: string;
    /** Spotify ID - optional, for future enrichment */
    spotify?: string;
    /** Bandsintown ID - optional, for event fetching */
    bandsintown?: string;
    /** Songkick ID - optional, for event fetching */
    songkick?: string;
}

/**
 * Artist alias from MusicBrainz.
 * Useful for matching searches (e.g., "RHCP" -> "Red Hot Chili Peppers")
 */
export interface ArtistAlias {
    name: string;
    sortName?: string;
    locale?: string;
    primary?: boolean;
    type?: string;
}

/**
 * Geographic area associated with an artist (country/region of origin).
 */
export interface ArtistArea {
    name: string;
    /** ISO 3166-1 alpha-2 country code */
    iso31661?: string;
}

/**
 * Optional metadata for future enrichment.
 * These fields will be populated by Spotify, etc. in later phases.
 */
export interface ArtistMetadata {
    /** Spotify popularity score (0-100) */
    popularity?: number;
    /** Total follower count from Spotify */
    followerCount?: number;
    /** Additional source-specific data */
    [key: string]: unknown;
}

/**
 * MongoDB document schema for the artists collection.
 */
export interface Artist {
    _id?: ObjectId;

    /** Canonical artist name from MusicBrainz */
    name: string;

    /** URL-friendly slug, derived from name, unique */
    slug: string;

    /** External service identifiers */
    externalIds: ArtistExternalIds;

    /** Alternative names/spellings from MusicBrainz */
    aliases: ArtistAlias[];

    /** Country/region of origin */
    area?: ArtistArea;

    /** Artist image URL - to be populated by enrichment (Spotify, etc.) */
    imageUrl?: string;

    /** Music genres - to be populated by enrichment */
    genres?: string[];

    /** Enrichment metadata from external services */
    metadata?: ArtistMetadata;

    /** Timestamp of last external API fetch (for cache validation) */
    lastFetchedAt: Date;

    /** Source of the last fetch (e.g., 'musicbrainz', 'spotify') */
    fetchSource: string;

    /** Document creation timestamp */
    createdAt: Date;

    /** Document last update timestamp */
    updatedAt: Date;
}

/**
 * Artist data for API responses (excludes internal fields).
 */
export interface ArtistResponse {
    id: string;
    name: string;
    slug: string;
    aliases: ArtistAlias[];
    area?: ArtistArea;
    imageUrl?: string;
    genres?: string[];
    metadata?: ArtistMetadata;
    isFollowing?: boolean;
}

/**
 * Transform MongoDB Artist document to API response format.
 */
export function toArtistResponse(artist: Artist, isFollowing?: boolean): ArtistResponse {
    return {
        id: artist._id!.toString(),
        name: artist.name,
        slug: artist.slug,
        aliases: artist.aliases,
        area: artist.area,
        imageUrl: artist.imageUrl,
        genres: artist.genres,
        metadata: artist.metadata,
        isFollowing,
    };
}
