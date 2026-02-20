import { ObjectId, Filter } from 'mongodb';
import { Event } from '../../domain/event/event.entity';
import { IEventRepository, IEventWriter } from '../../domain/event/event.repository.interface';
import { getDatabase } from '../database/mongodb.connection';
import { logger } from '../../shared/utils/logger';

/**
 * MongoDB implementation of IEventRepository + IEventWriter.
 *
 * Stores events persisted by the background SWR refresh in EventService.
 * Reads are served directly from MongoDB using indexes on artistId, date, and location.
 */
export class MongoEventRepository implements IEventRepository, IEventWriter {
    private get collection() {
        return getDatabase().collection<Event>('events');
    }

    async findByArtist(artistId: string, upcoming: boolean = true): Promise<Event[]> {
        const filter: Filter<Event> = {
            artistId: new ObjectId(artistId) as unknown as Event['artistId'],
            ...(upcoming ? { date: { $gte: new Date() } } : {}),
        };

        return this.collection
            .find(filter as Filter<Event>)
            .sort({ date: 1 })
            .toArray();
    }

    async findNearLocation(
        longitude: number,
        latitude: number,
        radiusKm: number,
        artistIds?: string[]
    ): Promise<Event[]> {
        const filter: Record<string, unknown> = {
            'venue.location': {
                $nearSphere: {
                    $geometry: { type: 'Point', coordinates: [longitude, latitude] },
                    $maxDistance: radiusKm * 1000,
                },
            },
            date: { $gte: new Date() },
        };

        if (artistIds && artistIds.length > 0) {
            filter['artistId'] = { $in: artistIds.map((id) => new ObjectId(id)) };
        }

        return this.collection
            .find(filter as Filter<Event>)
            .limit(200)
            .toArray();
    }

    async findById(id: string): Promise<Event | null> {
        // Try externalId first (Ticketmaster ID)
        const byExternalId = await this.collection.findOne({ externalId: id } as Filter<Event>);
        if (byExternalId) return byExternalId;

        // Fall back to ObjectId
        if (ObjectId.isValid(id)) {
            return this.collection.findOne({ _id: new ObjectId(id) } as Filter<Event>);
        }

        return null;
    }

    async upsertMany(events: Event[]): Promise<{ upserted: number; modified: number }> {
        if (events.length === 0) return { upserted: 0, modified: 0 };

        const now = new Date();
        const ops = events.map((event) => {
            // Exclude _id (immutable on update) and createdAt (only set on insert)
            // to avoid MongoDB path conflict errors
            const { _id, createdAt, ...eventData } = event;
            return {
                updateOne: {
                    filter: { externalId: event.externalId },
                    update: {
                        $set: { ...eventData, updatedAt: now, lastChecked: now },
                        $setOnInsert: { createdAt: now },
                    },
                    upsert: true,
                },
            };
        });

        const result = await this.collection.bulkWrite(ops, { ordered: false });

        logger.debug('MongoEventRepository.upsertMany', {
            total: events.length,
            upserted: result.upsertedCount,
            modified: result.modifiedCount,
        });

        return {
            upserted: result.upsertedCount,
            modified: result.modifiedCount,
        };
    }

    async deletePastEvents(artistId: string): Promise<number> {
        const result = await this.collection.deleteMany({
            artistId: new ObjectId(artistId) as unknown as Event['artistId'],
            date: { $lt: new Date() },
        } as Filter<Event>);

        return result.deletedCount;
    }

    async findCreatedAfter(since: Date, artistId?: string): Promise<Event[]> {
        const filter: Record<string, unknown> = { createdAt: { $gte: since } };
        if (artistId) {
            filter['artistId'] = new ObjectId(artistId);
        }
        return this.collection.find(filter as Filter<Event>).toArray();
    }

    async findUpcomingInDateRange(artistIds: string[], from: Date, to: Date): Promise<Event[]> {
        const filter: Record<string, unknown> = {
            date: { $gte: from, $lte: to },
        };
        if (artistIds.length > 0) {
            filter['artistId'] = { $in: artistIds.map((id) => new ObjectId(id)) };
        }
        return this.collection
            .find(filter as Filter<Event>)
            .sort({ date: 1 })
            .toArray();
    }

    async findArtistIdsNeedingRefresh(artistIds: string[], ttlMs: number): Promise<string[]> {
        if (artistIds.length === 0) return [];

        const cutoff = new Date(Date.now() - ttlMs);
        const now = new Date();

        // Find artistIds that already have fresh upcoming events — no refresh needed
        const freshIds = await this.collection
            .distinct('artistId', {
                artistId: { $in: artistIds.map((id) => new ObjectId(id)) },
                date: { $gte: now },
                lastChecked: { $gte: cutoff },
            } as Filter<Event>)
            .catch(() => [] as unknown[]);

        const freshSet = new Set(freshIds.map((id) => id!.toString()));
        return artistIds.filter((id) => !freshSet.has(id));
    }
}
