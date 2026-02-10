import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDatabase, getDatabase } from './config/database';
import { env } from './config/env';
import { errorHandler } from './shared/middleware/error.middleware';
import { logger } from './shared/utils/logger';
import { passport } from './config/oauth';
import { authRoutes } from './routes/auth.routes';
import { usersRoutes } from './routes/users.routes';
import { artistsRoutes } from './routes/artists.routes';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
    cors({
        origin: env.CORS_ORIGINS.split(','),
        credentials: true,
    })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Request logging in development
if (env.NODE_ENV === 'development') {
    app.use((req: Request, _res: Response, next) => {
        logger.debug(`${req.method} ${req.path}`);
        next();
    });
}

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
    try {
        // Check database connection
        const db = getDatabase();
        await db.admin().ping();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: env.NODE_ENV,
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed',
        });
    }
});

// API routes placeholder
app.get('/api', (_req: Request, res: Response) => {
    res.json({
        name: 'BandPulse API',
        version: '1.0.0',
        documentation: '/api/docs',
    });
});

// Auth routes
app.use('/api/auth', authRoutes);

// User routes
app.use('/api/users', usersRoutes);

// Artist routes
app.use('/api/artists', artistsRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

// Start server
async function start(): Promise<void> {
    try {
        // Connect to database
        await connectDatabase();

        // Start listening
        app.listen(env.PORT, () => {
            logger.info(`🚀 BandPulse API running on port ${env.PORT}`);
            logger.info(`📍 Environment: ${env.NODE_ENV}`);
            logger.info(`🔗 Health check: http://localhost:${env.PORT}/health`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();

export { app };
