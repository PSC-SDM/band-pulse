import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { ArtistController } from '../controllers/artist.controller';

/**
 * Create artist routes.
 * Clean routes - only wiring between HTTP paths, middleware, and controller methods.
 */
export function createArtistRoutes(artistController: ArtistController): Router {
    const router = Router();

    router.get('/search', authenticate, artistController.search);
    router.get('/', authenticate, artistController.getFollowed);
    router.get('/:id', authenticate, artistController.getById);
    router.post('/:id/follow', authenticate, artistController.follow);
    router.delete('/:id/follow', authenticate, artistController.unfollow);

    return router;
}
