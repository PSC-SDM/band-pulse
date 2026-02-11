import { User } from '../../../domain/user/user.entity';

/**
 * User profile response DTO (excludes sensitive fields).
 */
export interface UserProfileResponse {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    location?: {
        type: 'Point';
        coordinates: [number, number];
    };
    radiusKm?: number;
    notificationPreferences?: {
        newConcerts: boolean;
        tourAnnouncements: boolean;
        concertReminders: boolean;
        daysBeforeConcert: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Transform User entity to profile response (strips passwordHash, oauthId, etc.).
 */
export function toUserProfileResponse(user: User): UserProfileResponse {
    return {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        location: user.location,
        radiusKm: user.radiusKm,
        notificationPreferences: user.notificationPreferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
