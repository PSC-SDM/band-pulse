import { Artist, ArtistAlias, ArtistArea, ArtistMetadata } from '../../../domain/artist/artist.entity';

/**
 * Related artist entry in API responses.
 */
export interface RelatedArtistResponse {
    spotifyId: string;
    name: string;
    imageUrl?: string;
    genres?: string[];
    followerCount?: number;
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
    /** Short biography from MusicBrainz annotation */
    description?: string;
    metadata?: ArtistMetadata;
    /** Artists related to this one (from Spotify) */
    relatedArtists?: RelatedArtistResponse[];
    /** Direct link to the artist's Spotify profile */
    spotifyUrl?: string;
    isFollowing?: boolean;
}

/**
 * Artist detail response with follower count.
 */
export interface ArtistDetailResponse extends ArtistResponse {
    followerCount: number;
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
        description: artist.description,
        metadata: artist.metadata,
        relatedArtists: artist.relatedArtists?.map(r => ({
            spotifyId: r.spotifyId,
            name: r.name,
            imageUrl: r.imageUrl,
            genres: r.genres,
            followerCount: r.followerCount,
        })),
        spotifyUrl: artist.metadata?.spotifyUrl as string | undefined,
        isFollowing,
    };
}
