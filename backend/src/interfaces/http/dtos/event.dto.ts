import { Event } from '../../../domain/event/event.entity';

/**
 * Event response DTO for API endpoints.
 */
export interface EventResponse {
    id: string;
    artistId: string;
    artistName: string;
    title: string;
    date: string;
    venue: {
        name: string;
        address: string;
        city: string;
        country: string;
        location: {
            type: 'Point';
            coordinates: [number, number];
        };
    };
    eventType: string;
    status: string;
    ticketUrl?: string;
    dataSource: string;
    soldOut?: boolean;
    inventoryStatus?: 'available' | 'few' | 'soldout' | 'unknown';
}

/**
 * Transform Event entity to API response format.
 */
export function toEventResponse(event: Event): EventResponse {
    return {
        id: event._id!.toString(),
        artistId: event.artistId.toString(),
        artistName: event.artistName,
        title: event.title,
        date: event.date.toISOString(),
        venue: {
            name: event.venue.name,
            address: event.venue.address,
            city: event.venue.city,
            country: event.venue.country,
            location: event.venue.location,
        },
        eventType: event.eventType,
        status: event.status,
        ticketUrl: event.ticketUrl,
        dataSource: event.dataSource,
        soldOut: event.soldOut ?? false,
        inventoryStatus: event.inventoryStatus ?? 'unknown',
    };
}
