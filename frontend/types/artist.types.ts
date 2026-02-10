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
    [key: string]: unknown;
}

export interface Artist {
    id: string;
    name: string;
    slug: string;
    aliases: ArtistAlias[];
    area?: ArtistArea;
    imageUrl?: string;
    genres?: string[];
    metadata?: ArtistMetadata;
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
