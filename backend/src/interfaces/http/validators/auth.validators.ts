import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export const socialLoginSchema = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(1, 'Name is required'),
    avatar: z.string().optional(),
    provider: z.string().min(1, 'Provider is required'),
    providerId: z.string().min(1, 'Provider ID is required'),
});
