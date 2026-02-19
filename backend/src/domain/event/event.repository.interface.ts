import { Event } from './event.entity';

/**
 * Event repository interface - contract for data access.
 * Infrastructure layer must implement this interface.
 */
export interface IEventRepository {
    /**
     * Find events for a specific artist.
     * @param artistId - Artist MongoDB ID
     * @param upcoming - If true, only return future events
     */
    findByArtist(artistId: string, upcoming?: boolean): Promise<Event[]>;

    /**
     * Find events near a geographic location.
     * @param longitude - Longitude coordinate
     * @param latitude - Latitude coordinate
     * @param radiusKm - Search radius in kilometers
     * @param artistIds - Optional filter by artist IDs
     */
    findNearLocation(
        longitude: number,
        latitude: number,
        radiusKm: number,
        artistIds?: string[]
    ): Promise<Event[]>;

    /**
     * Find a single event by ID.
     */
    findById(id: string): Promise<Event | null>;
}

/**
 * Write contract for persistent event repositories (MongoDB).
 * Only implemented by MongoEventRepository.
 */
export interface IEventWriter {
    /**
     * Upsert a batch of events by externalId.
     */
    upsertMany(events: Event[]): Promise<{ upserted: number; modified: number }>;

    /**
     * Delete past events for an artist (cleanup after sync).
     */
    deletePastEvents(artistId: string): Promise<number>;

    /**
     * Return the subset of artistIds that have no upcoming events
     * or whose events were last checked before the TTL cutoff.
     * Used by the SWR pattern to decide which artists need a background refresh.
     */
    findArtistIdsNeedingRefresh(artistIds: string[], ttlMs: number): Promise<string[]>;
}
