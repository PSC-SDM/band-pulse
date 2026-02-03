import { Router } from 'express';
import { passport } from '../config/oauth';
import { generateToken } from '../utils/jwt';
import { env } from '../config/env';
import { UserRepository } from '../repositories/user.repository';
import { z } from 'zod';

const router = Router();
const userRepository = new UserRepository();

// Validation schemas
const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

// Register with email/password
router.post('/register', async (req, res) => {
    try {
        const { email, name, password } = registerSchema.parse(req.body);

        // Check if user already exists
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user with password
        const user = await userRepository.createWithPassword(email, name, password);

        // Generate JWT
        const token = generateToken({
            userId: user._id!.toString(),
            email: user.email,
        });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login with email/password
router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        // Verify credentials
        const user = await userRepository.verifyPassword(email, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT
        const token = generateToken({
            userId: user._id!.toString(),
            email: user.email,
        });

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Iniciar OAuth con Google
router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
    })
);

// Callback de Google
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
        const user = req.user as any;

        // Generar JWT
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
        });

        // Redirigir al frontend con el token
        res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
    }
);

export { router as authRoutes };
