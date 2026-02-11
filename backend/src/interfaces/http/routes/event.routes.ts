import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { EventController } from '../controllers/event.controller';

/**
 * Create event routes.
 * Clean routes - only wiring between HTTP paths, middleware, and controller methods.
 */
export function createEventRoutes(eventController: EventController): Router {
    const router = Router();

    router.get('/near-me', authenticate, eventController.getNearMe);
    router.get('/search', authenticate, eventController.search);
    router.get('/explore', authenticate, eventController.explore);
    router.get('/artist/:artistId', authenticate, eventController.getByArtist);

    return router;
}
