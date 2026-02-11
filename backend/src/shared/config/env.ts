import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3001'),

    // MongoDB
    MONGODB_URI: z.string(),

    // JWT
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // OAuth - Google
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CALLBACK_URL: z.string().optional(),

    // External APIs
    SPOTIFY_CLIENT_ID: z.string().optional(),
    SPOTIFY_CLIENT_SECRET: z.string().optional(),
    BANDSINTOWN_APP_ID: z.string().default('bandpulse'),

    // MusicBrainz API (required for artist identity)
    MUSICBRAINZ_USER_AGENT: z.string().default('BandPulse/1.0.0 (https://bandpulse.com)'),

    // Cache TTL (in seconds)
    ARTIST_CACHE_TTL: z.string().transform(Number).default('604800'),
    EVENT_CACHE_TTL: z.string().transform(Number).default('86400'),

    // CORS
    CORS_ORIGINS: z.string().default('http://localhost:3000'),

    // Frontend URL
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
