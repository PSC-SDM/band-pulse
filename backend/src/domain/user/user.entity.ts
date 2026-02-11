import { ObjectId } from 'mongodb';

/**
 * User domain entity.
 */
export interface User {
    _id?: ObjectId;
    email: string;
    name: string;
    avatar?: string;
    oauthProvider?: string;
    oauthId?: string;
    passwordHash?: string;
    location?: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
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
