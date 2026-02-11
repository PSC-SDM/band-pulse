import { Artist, ArtistAlias, ArtistArea, ArtistMetadata } from '../../../domain/artist/artist.entity';

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
        metadata: artist.metadata,
        isFollowing,
    };
}
