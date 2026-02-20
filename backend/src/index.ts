import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Shared
import { env } from './shared/config/env';
import { logger } from './shared/utils/logger';

// Infrastructure
import { connectDatabase, getDatabase } from './infrastructure/database/mongodb.connection';
import { configureOAuth, passport } from './infrastructure/auth/oauth.config';

// Repositories (Infrastructure implementations)
import { MongoArtistRepository } from './infrastructure/repositories/mongodb-artist.repository';
import { MongoFollowRepository } from './infrastructure/repositories/mongodb-follow.repository';
import { MongoUserRepository } from './infrastructure/repositories/mongodb-user.repository';
import { MongoEventRepository } from './infrastructure/repositories/mongodb-event.repository';
import { MongoNotificationRepository } from './infrastructure/repositories/mongodb-notification.repository';
import { TicketmasterEventRepository } from './infrastructure/repositories/ticketmaster-event.repository';

// Infrastructure - Email & Scheduler
import { EmailService } from './infrastructure/email/email.service';
import { NotificationWorker } from './infrastructure/workers/notification.worker';
import { Scheduler } from './infrastructure/scheduler';

// Application Services
import { ArtistService } from './application/artist/artist.service';
import { FollowService } from './application/follow/follow.service';
import { AuthService } from './application/auth/auth.service';
import { UserService } from './application/user/user.service';
import { EventService } from './application/event/event.service';
import { NotificationService } from './application/notification/notification.service';

// Interface Layer - Controllers
import { ArtistController } from './interfaces/http/controllers/artist.controller';
import { AuthController } from './interfaces/http/controllers/auth.controller';
import { UserController } from './interfaces/http/controllers/user.controller';
import { EventController } from './interfaces/http/controllers/event.controller';
import { NotificationController } from './interfaces/http/controllers/notification.controller';

// Interface Layer - Routes
import { createArtistRoutes } from './interfaces/http/routes/artist.routes';
import { createAuthRoutes } from './interfaces/http/routes/auth.routes';
import { createUserRoutes } from './interfaces/http/routes/user.routes';
import { createEventRoutes } from './interfaces/http/routes/event.routes';
import { createNotificationRoutes } from './interfaces/http/routes/notification.routes';

// Interface Layer - Middleware
import { errorHandler } from './interfaces/http/middleware/error.middleware';

// ============================================================================
// Bootstrap - Dependency Composition
// ============================================================================

// Repositories
const artistRepository = new MongoArtistRepository();
const followRepository = new MongoFollowRepository();
const userRepository = new MongoUserRepository();
const mongoEventRepository = new MongoEventRepository();
const notificationRepository = new MongoNotificationRepository();
const ticketmasterEventRepository = new TicketmasterEventRepository(artistRepository);

// Services
const artistService = new ArtistService(artistRepository);
const followService = new FollowService(followRepository, artistRepository);
const authService = new AuthService(userRepository);
const userService = new UserService(userRepository);
const emailService = new EmailService();
const notificationService = new NotificationService(
    notificationRepository,
    followRepository,
    userRepository,
    mongoEventRepository,
    emailService,
);
const eventService = new EventService(
    mongoEventRepository,        // primary read/write store (MongoDB)
    ticketmasterEventRepository, // source for background refresh + explore
    followRepository,
    userRepository,
    notificationService,         // triggers notifications when new concerts are found
);

// Workers & Scheduler
const notificationWorker = new NotificationWorker(notificationService);
const scheduler = new Scheduler(notificationWorker);

// Controllers
const artistController = new ArtistController(artistService, followService);
const authController = new AuthController(authService);
const userController = new UserController(userService);
const eventController = new EventController(eventService);
const notificationController = new NotificationController(notificationService);

// Configure OAuth with injected repository
configureOAuth(userRepository);

// ============================================================================
// Express App Setup
// ============================================================================

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

// API info endpoint
app.get('/api', (_req: Request, res: Response) => {
    res.json({
        name: 'BandPulse API',
        version: '1.0.0',
        documentation: '/api/docs',
    });
});

// API routes
app.use('/api/auth', createAuthRoutes(authController));
app.use('/api/users', createUserRoutes(userController));
app.use('/api/artists', createArtistRoutes(artistController));
app.use('/api/events', createEventRoutes(eventController));
app.use('/api/notifications', createNotificationRoutes(notificationController));

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

// ============================================================================
// Start Server
// ============================================================================

async function start(): Promise<void> {
    try {
        // Connect to database
        await connectDatabase();

        // Start listening
        app.listen(env.PORT, () => {
            logger.info(`BandPulse API running on port ${env.PORT}`);
            logger.info(`Environment: ${env.NODE_ENV}`);
            logger.info(`Health check: http://localhost:${env.PORT}/health`);
        });

        // Start background scheduler (daily reminders at 09:00)
        scheduler.start();
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();

export { app };
