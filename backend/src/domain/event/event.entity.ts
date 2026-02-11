import { ObjectId } from 'mongodb';

/**
 * Event domain entity.
 *
 * Represents a concert/event associated with an artist.
 * Location uses GeoJSON Point for geospatial queries.
 */
export interface Event {
    _id?: ObjectId;

    /** Reference to artists collection */
    artistId: ObjectId;

    /** Denormalized artist name for display */
    artistName: string;

    /** Event title */
    title: string;

    /** Event date and time */
    date: Date;

    /** Venue information */
    venue: EventVenue;

    /** Type of event (concert, festival, etc.) */
    eventType: string;

    /** Status of the event */
    status: 'announced' | 'confirmed' | 'cancelled' | 'postponed';

    /** URL to purchase tickets */
    ticketUrl?: string;

    /** Source of the event data */
    dataSource: string;

    /** External ID from the data source */
    externalId: string;

    createdAt: Date;
    updatedAt: Date;

    /** Last time the event data was refreshed from the source */
    lastChecked: Date;
}

/**
 * Venue details for an event.
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
