import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserService } from '../../../application/user/user.service';
import { toUserProfileResponse } from '../dtos/user.dto';
import { updateLocationSchema } from '../validators/user.validators';

/**
 * User Controller - Handles HTTP request/response for user endpoints.
 * Delegates business logic to UserService.
 */
export class UserController {
    constructor(private userService: UserService) {}

    /**
     * GET /users/me
     * Get the current user's profile.
     */
    getProfile = async (req: AuthRequest, res: Response) => {
        try {
            const user = await this.userService.getProfile(req.user!.userId);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(toUserProfileResponse(user));
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * PATCH /users/me/location
     * Update the current user's location.
     */
    updateLocation = async (req: AuthRequest, res: Response) => {
        try {
            const { longitude, latitude, radiusKm } = updateLocationSchema.parse(req.body);

            const user = await this.userService.updateLocation(
                req.user!.userId,
                longitude,
                latitude,
                radiusKm
            );

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(toUserProfileResponse(user));
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
