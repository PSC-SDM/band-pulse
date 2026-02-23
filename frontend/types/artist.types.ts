/**
 * Artist types for BandPulse frontend.
 * Mirrors backend API response structures.
 */

export interface ArtistAlias {
    name: string;
    sortName?: string;
    locale?: string;
    primary?: boolean;
    type?: string;
}

export interface ArtistArea {
    name: string;
    iso31661?: string;
}

export interface ArtistMetadata {
    popularity?: number;
    followerCount?: number;
    spotifyUrl?: string;
    [key: string]: unknown;
}

export interface RelatedArtist {
    spotifyId: string;
    name: string;
    imageUrl?: string;
    genres?: string[];
    followerCount?: number;
}

export interface Artist {
    id: string;
    name: string;
    slug: string;
    aliases: ArtistAlias[];
    area?: ArtistArea;
    imageUrl?: string;
    genres?: string[];
    /** Short biography from MusicBrainz annotation */
    description?: string;
    metadata?: ArtistMetadata;
    /** Artists related to this one (from Spotify) */
    relatedArtists?: RelatedArtist[];
    /** Direct link to the artist's Spotify profile */
    spotifyUrl?: string;
    isFollowing?: boolean;
    followerCount?: number;
}

export interface FollowResponse {
    success: boolean;
    follow?: {
        artistId: string;
        followedAt: string;
        notificationsEnabled: boolean;
    };
}

export interface UnfollowResponse {
    success: boolean;
}
