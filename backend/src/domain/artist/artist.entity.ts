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
 * A related artist as returned by the Spotify related-artists endpoint.
 * Stored as embedded documents on the Artist.
 */
export interface RelatedArtist {
    /** Spotify artist ID */
    spotifyId: string;
    name: string;
    imageUrl?: string;
    genres?: string[];
    followerCount?: number;
}

/**
 * Artist domain entity.
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

    /** Artist image URL - populated by Spotify enrichment */
    imageUrl?: string;

    /** Music genres - populated by Spotify enrichment */
    genres?: string[];

    /** Short biography / disambiguation - populated by MusicBrainz annotation */
    description?: string;

    /** Enrichment metadata from external services */
    metadata?: ArtistMetadata;

    /** Artists related to this one - populated by Spotify enrichment */
    relatedArtists?: RelatedArtist[];

    /** Timestamp of last MusicBrainz fetch (for cache validation) */
    lastFetchedAt: Date;

    /** Source of the last MusicBrainz fetch (e.g., 'musicbrainz') */
    fetchSource: string;

    /** Timestamp of last Spotify enrichment (separate TTL, ~24h) */
    spotifyLastFetchedAt?: Date;

    /** Document creation timestamp */
    createdAt: Date;

    /** Document last update timestamp */
    updatedAt: Date;
}
