import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import bcrypt from 'bcrypt';

export interface User {
    _id?: ObjectId;
    email: string;
    name: string;
    avatar?: string;
    oauthProvider?: string; // Opcional ahora (solo para OAuth)
    oauthId?: string; // Opcional ahora (solo para OAuth)
    passwordHash?: string; // Para autenticación email/password
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

export class UserRepository {
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
}
