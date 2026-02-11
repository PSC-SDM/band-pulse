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
