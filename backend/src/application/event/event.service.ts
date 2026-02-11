import { IEventRepository } from '../../domain/event/event.repository.interface';
import { IArtistRepository } from '../../domain/artist/artist.repository.interface';
import { IFollowRepository } from '../../domain/follow/follow.repository.interface';
import { IUserRepository } from '../../domain/user/user.repository.interface';
import { Event } from '../../domain/event/event.entity';
import { MockEventRepository } from '../../infrastructure/repositories/mock-event.repository';
import { logger } from '../../shared/utils/logger';

/**
 * Event Service - Business logic for event discovery.
 *
 * Currently backed by a mock repository.
 * Will be swapped to real Bandsintown integration in a future phase.
 */
export class EventService {
    constructor(
        private eventRepository: IEventRepository,
        private artistRepository: IArtistRepository,
        private followRepository: IFollowRepository,
        private userRepository: IUserRepository
    ) {}

    /**
     * Get upcoming events for a specific artist.
     * Ensures mock data is seeded for the artist.
     */
    async getArtistEvents(artistId: string): Promise<Event[]> {
        // Ensure mock data is registered for this artist
        await this.ensureArtistRegistered(artistId);

        return await this.eventRepository.findByArtist(artistId, true);
    }

    /**
     * Get events near the user's location, filtered by followed artists.
     */
    async getEventsNearUser(userId: string): Promise<Event[]> {
        const user = await this.userRepository.findById(userId);

        if (!user || !user.location) {
            logger.warn('User location not set', { userId });
            return [];
        }

        // Get followed artist IDs
        const artistIds = await this.followRepository.getFollowedArtistIds(userId);

        if (artistIds.length === 0) {
            return [];
        }

        // Ensure mock data is registered for all followed artists
        for (const artistId of artistIds) {
            await this.ensureArtistRegistered(artistId);
        }

        const [longitude, latitude] = user.location.coordinates;
        const radiusKm = user.radiusKm || 50;

        return await this.eventRepository.findNearLocation(
            longitude,
            latitude,
            radiusKm,
            artistIds
        );
    }

    /**
     * Search events by explicit coordinates and radius,
     * filtered by the user's followed artists.
     */
    async searchEvents(
        userId: string,
        longitude: number,
        latitude: number,
        radiusKm: number
    ): Promise<Event[]> {
        const artistIds = await this.followRepository.getFollowedArtistIds(userId);

        if (artistIds.length === 0) {
            return [];
        }

        // Ensure mock data is registered for all followed artists
        for (const artistId of artistIds) {
            await this.ensureArtistRegistered(artistId);
        }

        return await this.eventRepository.findNearLocation(
            longitude,
            latitude,
            radiusKm,
            artistIds
        );
    }

    /**
     * Get a single event by ID.
     */
    async getEventById(eventId: string): Promise<Event | null> {
        return await this.eventRepository.findById(eventId);
    }

    /**
     * Ensure the mock repository has data for a given artist.
     * No-op if the repository is not a MockEventRepository.
     */
    private async ensureArtistRegistered(artistId: string): Promise<void> {
        if (this.eventRepository instanceof MockEventRepository) {
            const artist = await this.artistRepository.findById(artistId);
            if (artist) {
                this.eventRepository.registerArtist(artistId, artist.name);
            }
        }
    }
}
