import { Follow } from '../../../domain/follow/follow.entity';

/**
 * Follow response for API endpoints.
 */
export interface FollowResponse {
    artistId: string;
    followedAt: Date;
    notificationsEnabled: boolean;
}

/**
 * Transform MongoDB Follow document to API response format.
 */
export function toFollowResponse(follow: Follow): FollowResponse {
    return {
        artistId: follow.artistId.toString(),
        followedAt: follow.followedAt,
        notificationsEnabled: follow.notificationsEnabled,
    };
}
