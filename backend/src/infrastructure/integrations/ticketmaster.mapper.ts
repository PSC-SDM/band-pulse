import { ObjectId } from 'mongodb';
import { Event } from '../../domain/event/event.entity';
import { TmEvent, TmVenue } from './ticketmaster.client';

/**
 * Maps a Ticketmaster venue to our domain venue format.
 */
export function mapTmVenue(venue?: TmVenue): Event['venue'] {
    if (!venue) {
        return {
            name: 'TBA',
            address: '',
            city: '',
            country: '',
            location: { type: 'Point', coordinates: [0, 0] },
        };
    }

    const lng = venue.location?.longitude ? parseFloat(venue.location.longitude) : 0;
    const lat = venue.location?.latitude ? parseFloat(venue.location.latitude) : 0;

    return {
        name: venue.name || 'TBA',
        address: venue.address?.line1 || '',
        city: venue.city?.name || '',
        country: venue.country?.name || venue.country?.countryCode || '',
        location: {
            type: 'Point',
            coordinates: [lng, lat],
        },
    };
}

/**
 * Maps a Ticketmaster event to our domain Event entity.
 */
export function mapTmEventToDomain(
    tmEvent: TmEvent,
    artistId: string,
    artistName: string
): Event {
    const venue = tmEvent._embedded?.venues?.[0];
    const now = new Date();

    // Parse date
    const dateStr = tmEvent.dates?.start?.dateTime || tmEvent.dates?.start?.localDate;
    const eventDate = dateStr ? new Date(dateStr) : now;

    // Map status
    let status: Event['status'] = 'confirmed';
    const tmStatus = tmEvent.dates?.status?.code;
    if (tmStatus === 'cancelled') status = 'cancelled';
    else if (tmStatus === 'postponed' || tmStatus === 'rescheduled') status = 'postponed';

    // Determine sold-out / inventory status from Discovery API's sales status.
    // 'offsale' on a future event strongly indicates sold out.
    // 'onsale' means tickets are available.
    let inventoryStatus: Event['inventoryStatus'] = 'unknown';
    let soldOut = false;

    if (tmStatus === 'offsale' && eventDate > now) {
        inventoryStatus = 'soldout';
        soldOut = true;
    } else if (tmStatus === 'onsale') {
        inventoryStatus = 'available';
    }

    // Map event type from classifications
    let eventType = 'concert';
    const classification = tmEvent.classifications?.find((c) => c.primary);
    if (classification?.genre?.name) {
        eventType = classification.genre.name.toLowerCase();
    }

    return {
        _id: new ObjectId(),
        artistId: ObjectId.isValid(artistId) ? new ObjectId(artistId) : new ObjectId(),
        artistName,
        title: tmEvent.name || `${artistName} Concert`,
        date: eventDate,
        venue: mapTmVenue(venue),
        eventType,
        status,
        ticketUrl: tmEvent.url,
        dataSource: 'ticketmaster',
        externalId: tmEvent.id,
        soldOut,
        inventoryStatus,
        createdAt: now,
        updatedAt: now,
        lastChecked: now,
    };
}
