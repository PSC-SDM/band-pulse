import { IUserRepository } from '../../domain/user/user.repository.interface';
import { User } from '../../domain/user/user.entity';
import { generateToken, JWTPayload } from '../../infrastructure/auth/jwt.provider';
import { logger } from '../../shared/utils/logger';

export interface AuthResult {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
    };
}

/**
 * Auth Service - Business logic for authentication operations.
 *
 * Handles registration, login, and social authentication flows.
 * Generates JWT tokens for authenticated users.
 */
export class AuthService {
    constructor(private userRepository: IUserRepository) {}

    /**
     * Register a new user with email and password.
     *
     * @throws Error if email is already registered
     */
    async register(email: string, name: string, password: string): Promise<AuthResult> {
        // Check if user already exists
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('Email already registered');
        }

        // Create user with password
        const user = await this.userRepository.createWithPassword(email, name, password);

        logger.info('User registered', { userId: user._id?.toString(), email });

        return this.buildAuthResult(user);
    }

    /**
     * Login with email and password.
     *
     * @throws Error if credentials are invalid
     */
    async login(email: string, password: string): Promise<AuthResult> {
        const user = await this.userRepository.verifyPassword(email, password);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        logger.info('User logged in', { userId: user._id?.toString(), email });

        return this.buildAuthResult(user);
    }

    /**
     * Social login - find or create user from OAuth provider data.
     */
    async socialLogin(
        email: string,
        name: string,
        avatar?: string,
        provider?: string,
        providerId?: string
    ): Promise<AuthResult> {
        let user = await this.userRepository.findByEmail(email);

        if (!user) {
            user = await this.userRepository.create({
                email,
                name,
                avatar,
                oauthProvider: provider,
                oauthId: providerId,
            });

            logger.info('User created via social login', {
                userId: user._id?.toString(),
                email,
                provider,
            });
        } else {
            logger.info('User logged in via social', {
                userId: user._id?.toString(),
                email,
                provider,
            });
        }

        return this.buildAuthResult(user);
    }

    /**
     * Build the authentication result with JWT token and user data.
     */
    private buildAuthResult(user: User): AuthResult {
        const token = generateToken({
            userId: user._id!.toString(),
            email: user.email,
        });

        return {
            token,
            user: {
                id: user._id!.toString(),
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            },
        };
    }
}
