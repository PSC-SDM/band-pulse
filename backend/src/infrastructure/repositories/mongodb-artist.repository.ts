import { ObjectId, Collection } from 'mongodb';
import { getDatabase } from '../database/mongodb.connection';
import { env } from '../../shared/config/env';
import { Artist, ArtistAlias, ArtistArea } from '../../domain/artist/artist.entity';
import { IArtistRepository } from '../../domain/artist/artist.repository.interface';
import { MusicBrainzArtist } from '../integrations/musicbrainz.client';
import { logger } from '../../shared/utils/logger';

/**
 * MongoDB implementation of the Artist Repository.
 *
 * Design decisions:
 * - Uses native MongoDB driver (no ORM)
 * - MBID is the unique identifier for upserts
 * - Slug is auto-generated and unique
 * - Cache validation via lastFetchedAt + TTL
 * - Text search uses MongoDB text index on name
 */
export class MongoArtistRepository implements IArtistRepository {
    private get collection(): Collection<Artist> {
        return getDatabase().collection<Artist>('artists');
    }

    /**
     * Find artist by internal MongoDB ObjectId.
     */
    async findById(id: string): Promise<Artist | null> {
        try {
            return await this.collection.findOne({ _id: new ObjectId(id) });
        } catch (error) {
            // Invalid ObjectId format
            if (error instanceof Error && error.message.includes('ObjectId')) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Find artist by MusicBrainz ID (MBID).
     * This is the primary lookup method for identity resolution.
     */
    async findByMbid(mbid: string): Promise<Artist | null> {
        return await this.collection.findOne({ 'externalIds.musicbrainz': mbid });
    }

    /**
     * Find artist by URL slug.
     */
    async findBySlug(slug: string): Promise<Artist | null> {
        return await this.collection.findOne({ slug });
    }

    /**
     * Search artists using MongoDB text index.
     * Returns artists sorted by text search score.
     */
    async search(query: string, limit: number = 20): Promise<Artist[]> {
        return await this.collection
            .find({ $text: { $search: query } })
            .project({ score: { $meta: 'textScore' } })
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit)
            .toArray() as unknown as Artist[];
    }

    /**
     * Find multiple artists by their IDs.
     */
    async findByIds(ids: string[]): Promise<Artist[]> {
        const objectIds = ids
            .map(id => {
                try {
                    return new ObjectId(id);
                } catch {
                    return null;
                }
            })
            .filter((id): id is ObjectId => id !== null);

        if (objectIds.length === 0) {
            return [];
        }

        return await this.collection
            .find({ _id: { $in: objectIds } })
            .toArray();
    }

    /**
     * Upsert artist from MusicBrainz data.
     * Uses MBID as the unique key for the upsert operation.
     */
    async upsertFromMusicBrainz(mbData: MusicBrainzArtist): Promise<Artist> {
        const now = new Date();
        const slug = await this.generateUniqueSlug(mbData.name, mbData.mbid);

        const aliases: ArtistAlias[] = mbData.aliases.map(a => ({
            name: a.name,
            sortName: a.sortName,
            locale: a.locale,
            primary: a.primary,
            type: a.type,
        }));

        const area: ArtistArea | undefined = mbData.area ? {
            name: mbData.area.name,
            iso31661: mbData.area.iso31661,
        } : undefined;

        const updateDoc = {
            $set: {
                name: mbData.name,
                slug,
                'externalIds.musicbrainz': mbData.mbid,
                aliases,
                area,
                lastFetchedAt: now,
                fetchSource: 'musicbrainz',
                updatedAt: now,
            },
            $setOnInsert: {
                createdAt: now,
            },
        };

        const result = await this.collection.findOneAndUpdate(
            { 'externalIds.musicbrainz': mbData.mbid },
            updateDoc,
            { upsert: true, returnDocument: 'after' }
        );

        logger.debug('Artist upserted', {
            mbid: mbData.mbid,
            name: mbData.name,
            slug,
        });

        return result!;
    }

    /**
     * Check if an artist's cached data is still valid.
     * Valid = lastFetchedAt + TTL > now
     */
    isCacheValid(artist: Artist): boolean {
        if (!artist.lastFetchedAt) {
            return false;
        }

        const cacheAge = Date.now() - artist.lastFetchedAt.getTime();
        const ttlMs = env.ARTIST_CACHE_TTL * 1000;

        return cacheAge < ttlMs;
    }

    /**
     * Generate a unique URL-friendly slug from artist name.
     * Appends a suffix if the slug already exists (for different MBIDs).
     */
    private async generateUniqueSlug(name: string, mbid: string): Promise<string> {
        const baseSlug = this.slugify(name);

        // Check if this MBID already has a slug
        const existing = await this.collection.findOne({
            'externalIds.musicbrainz': mbid,
        });

        if (existing) {
            return existing.slug; // Keep existing slug
        }

        // Check if base slug is available
        const slugExists = await this.collection.findOne({ slug: baseSlug });

        if (!slugExists) {
            return baseSlug;
        }

        // Slug collision with different artist - append MBID prefix
        const uniqueSlug = `${baseSlug}-${mbid.substring(0, 8)}`;
        return uniqueSlug;
    }

    /**
     * Convert a string to URL-friendly slug.
     */
    private slugify(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with dashes
            .replace(/^-|-$/g, '')            // Remove leading/trailing dashes
            .substring(0, 100);               // Limit length
    }

    /**
     * Count total artists in the collection (for stats).
     */
    async count(): Promise<number> {
        return await this.collection.countDocuments();
    }

    /**
     * Find artists with stale cache (for background refresh workers).
     */
    async findStaleArtists(limit: number = 100): Promise<Artist[]> {
        const staleThreshold = new Date(Date.now() - env.ARTIST_CACHE_TTL * 1000);

        return await this.collection
            .find({ lastFetchedAt: { $lt: staleThreshold } })
            .sort({ lastFetchedAt: 1 }) // Oldest first
            .limit(limit)
            .toArray();
    }
}
