import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../../shared/config/env';
import { IUserRepository } from '../../domain/user/user.repository.interface';

/**
 * Configure OAuth strategies.
 * Receives the user repository via dependency injection.
 */
export function configureOAuth(userRepository: IUserRepository): typeof passport {
    passport.use(
        new GoogleStrategy(
            {
                clientID: env.GOOGLE_CLIENT_ID || '',
                clientSecret: env.GOOGLE_CLIENT_SECRET || '',
                callbackURL: env.GOOGLE_CALLBACK_URL || '',
            },
            async (accessToken: string, refreshToken: string, profile: any, done: any) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    if (!email) {
                        return done(new Error('No email found in profile'));
                    }

                    // Buscar o crear usuario
                    let user = await userRepository.findByEmail(email);

                    if (!user) {
                        user = await userRepository.create({
                            email,
                            name: profile.displayName,
                            avatar: profile.photos?.[0]?.value,
                            oauthProvider: 'google',
                            oauthId: profile.id,
                        });
                    }

                    done(null, user);
                } catch (error) {
                    done(error as Error);
                }
            }
        )
    );

    return passport;
}

export { passport };
