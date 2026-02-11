import { IEventRepository } from '../../domain/event/event.repository.interface';
import { IFollowRepository } from '../../domain/follow/follow.repository.interface';
import { IUserRepository } from '../../domain/user/user.repository.interface';
import { Event } from '../../domain/event/event.entity';
import { logger } from '../../shared/utils/logger';

/**
 * Event Service - Business logic for event discovery.
 *
 * Delegates data access to the injected IEventRepository implementation
 * (TicketmasterEventRepository in production, MockEventRepository for testing).
 */
export class EventService {
    constructor(
        private eventRepository: IEventRepository,
        private followRepository: IFollowRepository,
        private userRepository: IUserRepository
    ) {}

    /**
     * Get upcoming events for a specific artist.
     */
    async getArtistEvents(artistId: string): Promise<Event[]> {
        return await this.eventRepository.findByArtist(artistId, true);
    }

    /**
     * Get events near the user's saved location, filtered by followed artists.
     */
    async getEventsNearUser(userId: string): Promise<Event[]> {
        const user = await this.userRepository.findById(userId);

        if (!user || !user.location) {
            logger.warn('User location not set', { userId });
            return [];
        }

        const artistIds = await this.followRepository.getFollowedArtistIds(userId);

        if (artistIds.length === 0) {
            return [];
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

        return await this.eventRepository.findNearLocation(
            longitude,
            latitude,
            radiusKm,
            artistIds
        );
    }

    /**
     * Explore all music events in an area — no artist filter.
     * Uses Ticketmaster's native geo search.
     */
    async exploreEvents(
        longitude: number,
        latitude: number,
        radiusKm: number
    ): Promise<Event[]> {
        return await this.eventRepository.findNearLocation(
            longitude,
            latitude,
            radiusKm
            // No artistIds → general search
        );
    }

    /**
     * Get a single event by ID.
     */
    async getEventById(eventId: string): Promise<Event | null> {
        return await this.eventRepository.findById(eventId);
    }
}
