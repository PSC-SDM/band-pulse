import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { UserController } from '../controllers/user.controller';

/**
 * Create user routes.
 * Clean routes - only wiring between HTTP paths, middleware, and controller methods.
 */
export function createUserRoutes(userController: UserController): Router {
    const router = Router();

    router.get('/me', authenticate, userController.getProfile);
    router.patch('/me/location', authenticate, userController.updateLocation);

    return router;
}
