import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../../../application/auth/auth.service';
import { registerSchema, loginSchema, socialLoginSchema } from '../validators/auth.validators';
import { generateToken } from '../../../infrastructure/auth/jwt.provider';
import { env } from '../../../shared/config/env';

/**
 * Auth Controller - Handles HTTP request/response for authentication endpoints.
 * Delegates business logic to AuthService.
 */
export class AuthController {
    constructor(private authService: AuthService) {}

    /**
     * POST /auth/register
     * Register with email/password.
     */
    register = async (req: Request, res: Response) => {
        try {
            const { email, name, password } = registerSchema.parse(req.body);

            const result = await this.authService.register(email, name, password);

            res.status(201).json(result);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors[0].message });
            }

            const message = error instanceof Error ? error.message : 'Unknown error';

            if (message === 'Email already registered') {
                return res.status(400).json({ error: message });
            }

            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * POST /auth/login
     * Login with email/password.
     */
    login = async (req: Request, res: Response) => {
        try {
            const { email, password } = loginSchema.parse(req.body);

            const result = await this.authService.login(email, password);

            res.json(result);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors[0].message });
            }

            const message = error instanceof Error ? error.message : 'Unknown error';

            if (message === 'Invalid email or password') {
                return res.status(401).json({ error: message });
            }

            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * POST /auth/social
     * Social login (for NextAuth).
     */
    socialLogin = async (req: Request, res: Response) => {
        try {
            const { email, name, avatar, provider, providerId } = socialLoginSchema.parse(req.body);

            const result = await this.authService.socialLogin(email, name, avatar, provider, providerId);

            res.json(result);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors[0].message });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    /**
     * GET /auth/google/callback
     * Google OAuth callback handler.
     */
    googleCallback = (req: Request, res: Response) => {
        const user = req.user as any;

        // Generar JWT
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
        });

        // Redirigir al frontend con el token
        res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
    };
}
