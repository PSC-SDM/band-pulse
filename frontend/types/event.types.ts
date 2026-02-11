/**
 * Event types for BandPulse frontend.
 * Mirrors backend API response structures.
 */

export interface EventVenue {
    name: string;
    address: string;
    city: string;
    country: string;
    location: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
}

export interface EventResponse {
    id: string;
    artistId: string;
    artistName: string;
    title: string;
    date: string;
    venue: EventVenue;
    eventType: string;
    status: string;
    ticketUrl?: string;
    dataSource: string;
    soldOut?: boolean;
    inventoryStatus?: 'available' | 'few' | 'soldout' | 'unknown';
}
