import { Router } from 'express';
import { authenticate, AuthRequest } from '../shared/middleware/auth.middleware';
import { UserRepository } from '../repositories/user.repository';
import { z } from 'zod';

const router = Router();
const userRepository = new UserRepository();

// Obtener perfil del usuario actual
router.get('/me', authenticate, async (req: AuthRequest, res) => {
    try {
        const user = await userRepository.findById(req.user!.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Actualizar ubicación del usuario
const updateLocationSchema = z.object({
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    radiusKm: z.number().min(1).max(500),
});

router.patch('/me/location', authenticate, async (req: AuthRequest, res) => {
    try {
        const { longitude, latitude, radiusKm } = updateLocationSchema.parse(req.body);

        const user = await userRepository.updateLocation(
            req.user!.userId,
            longitude,
            latitude,
            radiusKm
        );

        res.json(user);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as usersRoutes };
