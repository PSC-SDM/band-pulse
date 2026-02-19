import { MongoClient, Db } from 'mongodb';
import { env } from '../../shared/config/env';
import { logger } from '../../shared/utils/logger';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDatabase(): Promise<Db> {
    if (db) return db;

    try {
        client = new MongoClient(env.MONGODB_URI);
        await client.connect();

        db = client.db();

        // Verify connection
        await db.admin().ping();

        // Ensure indexes (idempotent — safe to run on every startup)
        await ensureIndexes(db);

        logger.info('MongoDB connected successfully');
        return db;
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        throw error;
    }
}

async function ensureIndexes(database: Db): Promise<void> {
    try {
        // events collection
        const events = database.collection('events');
        await events.createIndex({ externalId: 1 }, { unique: true, background: true });
        await events.createIndex({ artistId: 1, date: 1 }, { background: true });
        await events.createIndex({ 'venue.location': '2dsphere' }, { background: true });
        await events.createIndex({ lastChecked: 1 }, { background: true });

        logger.info('MongoDB indexes ensured');
    } catch (error) {
        // Non-fatal: log and continue. Existing indexes with different options cause errors
        // only when the conflict is irreconcilable; createIndex is otherwise idempotent.
        logger.warn('MongoDB index creation warning:', error);
    }
}

export function getDatabase(): Db {
    if (!db) {
        throw new Error('Database not initialized. Call connectDatabase first.');
    }
    return db;
}

export async function closeDatabase(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        db = null;
        logger.info('MongoDB connection closed');
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    await closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeDatabase();
    process.exit(0);
});
