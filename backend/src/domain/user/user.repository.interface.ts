import { User } from './user.entity';

/**
 * User repository interface - contract for data access.
 * Infrastructure layer must implement this interface.
 */
export interface IUserRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    create(userData: Partial<User>): Promise<User>;
    createWithPassword(email: string, name: string, password: string): Promise<User>;
    verifyPassword(email: string, password: string): Promise<User | null>;
    updateLocation(userId: string, longitude: number, latitude: number, radiusKm: number): Promise<User | null>;
    updateNotificationPreferences(userId: string, preferences: Partial<User['notificationPreferences']>): Promise<User | null>;
}
