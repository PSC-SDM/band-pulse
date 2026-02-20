import { ObjectId } from 'mongodb';
import { getDatabase } from '../database/mongodb.connection';
import { User } from '../../domain/user/user.entity';
import { IUserRepository } from '../../domain/user/user.repository.interface';
import bcrypt from 'bcrypt';

/**
 * MongoDB implementation of the User Repository.
 */
export class MongoUserRepository implements IUserRepository {
    private get collection() {
        return getDatabase().collection<User>('users');
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.collection.findOne({ email });
    }

    async findById(id: string): Promise<User | null> {
        return this.collection.findOne({ _id: new ObjectId(id) });
    }

    async create(userData: Partial<User>): Promise<User> {
        const now = new Date();
        const user: User = {
            email: userData.email!,
            name: userData.name!,
            avatar: userData.avatar,
            oauthProvider: userData.oauthProvider,
            oauthId: userData.oauthId,
            passwordHash: userData.passwordHash,
            notificationPreferences: {
                newConcerts: true,
                tourAnnouncements: true,
                concertReminders: true,
                daysBeforeConcert: 3,
            },
            createdAt: now,
            updatedAt: now,
        };

        const result = await this.collection.insertOne(user);
        return { ...user, _id: result.insertedId };
    }

    async createWithPassword(
        email: string,
        name: string,
        password: string
    ): Promise<User> {
        const passwordHash = await bcrypt.hash(password, 10);
        return this.create({
            email,
            name,
            passwordHash,
        });
    }

    async verifyPassword(email: string, password: string): Promise<User | null> {
        const user = await this.findByEmail(email);
        if (!user || !user.passwordHash) {
            return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        return isValid ? user : null;
    }

    async updateLocation(
        userId: string,
        longitude: number,
        latitude: number,
        radiusKm: number
    ): Promise<User | null> {
        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    radiusKm,
                    updatedAt: new Date(),
                },
            },
            { returnDocument: 'after' }
        );

        return result;
    }

    async updateNotificationPreferences(
        userId: string,
        preferences: Partial<User['notificationPreferences']>
    ): Promise<User | null> {
        const setFields: Record<string, unknown> = { updatedAt: new Date() };
        for (const [key, value] of Object.entries(preferences ?? {})) {
            setFields[`notificationPreferences.${key}`] = value;
        }

        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(userId) },
            { $set: setFields },
            { returnDocument: 'after' }
        );

        return result;
    }
}
