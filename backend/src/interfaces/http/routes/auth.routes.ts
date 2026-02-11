import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { passport } from '../../../infrastructure/auth/oauth.config';

/**
 * Create auth routes.
 * Clean routes - only wiring between HTTP paths, middleware, and controller methods.
 */
export function createAuthRoutes(authController: AuthController): Router {
    const router = Router();

    router.post('/register', authController.register);
    router.post('/login', authController.login);
    router.post('/social', authController.socialLogin);

    // Google OAuth
    router.get(
        '/google',
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            session: false,
        })
    );

    router.get(
        '/google/callback',
        passport.authenticate('google', { session: false }),
        authController.googleCallback
    );

    return router;
}
