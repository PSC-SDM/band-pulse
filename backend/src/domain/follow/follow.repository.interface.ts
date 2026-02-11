import { Follow, FollowCreateOptions } from './follow.entity';

/**
 * Follow repository interface - contract for data access.
 * Infrastructure layer must implement this interface.
 */
export interface IFollowRepository {
    create(options: FollowCreateOptions): Promise<Follow>;
    delete(userId: string, artistId: string): Promise<boolean>;
    exists(userId: string, artistId: string): Promise<boolean>;
    findOne(userId: string, artistId: string): Promise<Follow | null>;
    getFollowedArtistIds(userId: string): Promise<string[]>;
    getFollowsByUser(userId: string): Promise<Follow[]>;
    getFollowerUserIds(artistId: string): Promise<string[]>;
    getFollowerCount(artistId: string): Promise<number>;
    getFollowingCount(userId: string): Promise<number>;
    updateNotificationPreference(userId: string, artistId: string, enabled: boolean): Promise<boolean>;
    checkMultipleFollows(userId: string, artistIds: string[]): Promise<Map<string, boolean>>;
}
