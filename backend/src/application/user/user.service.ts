import { IUserRepository } from '../../domain/user/user.repository.interface';
import { User } from '../../domain/user/user.entity';
import { logger } from '../../shared/utils/logger';

/**
 * User Service - Business logic for user profile operations.
 */
export class UserService {
    constructor(private userRepository: IUserRepository) {}

    /**
     * Get user profile by ID.
     */
    async getProfile(userId: string): Promise<User | null> {
        return await this.userRepository.findById(userId);
    }

    /**
     * Update user location.
     */
    async updateLocation(
        userId: string,
        longitude: number,
        latitude: number,
        radiusKm: number
    ): Promise<User | null> {
        const user = await this.userRepository.updateLocation(
            userId,
            longitude,
            latitude,
            radiusKm
        );

        if (user) {
            logger.info('User location updated', {
                userId,
                coordinates: [longitude, latitude],
                radiusKm,
            });
        }

        return user;
    }
}
