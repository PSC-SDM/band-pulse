import { ObjectId, Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { env } from '../config/env';
import { Artist, ArtistAlias, ArtistArea } from '../types/artist.types';
import { MusicBrainzArtist } from '../integrations/musicbrainz';
import { logger } from '../shared/utils/logger';

/**
 * Artist Repository - Data access layer for the artists collection.
 * 
 * Design decisions:
 * - Uses native MongoDB driver (no ORM)
 * - MBID is the unique identifier for upserts
 * - Slug is auto-generated and unique
 * - Cache validation via lastFetchedAt + TTL
 * - Text search uses MongoDB text index on name
 */
export class ArtistRepository {
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
     * 
     * @param query - Search query string
     * @param limit - Maximum number of results
     */
    async search(query: string, limit: number = 20): Promise<Artist[]> {
        return await this.collection
            .find(
                { $text: { $search: query } },
                { score: { $meta: 'textScore' } }
            )
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit)
            .toArray();
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
     * 
     * @param mbData - Normalized data from MusicBrainz API
     * @returns The upserted artist document
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
                // Initialize optional fields as undefined (not stored)
                // These will be populated by enrichment in future phases
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
     * 
     * @param artist - Artist document to check
     * @returns true if cache is valid, false if refresh needed
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
     * @param limit - Maximum number of stale artists to return
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
