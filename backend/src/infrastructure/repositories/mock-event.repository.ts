import { ObjectId } from 'mongodb';
import { Event } from '../../domain/event/event.entity';
import { IEventRepository } from '../../domain/event/event.repository.interface';

/**
 * Mock implementation of the Event Repository.
 *
 * Returns realistic-looking event data without calling any external API.
 * This will be replaced by a real MongoDB + Bandsintown implementation later.
 */

// ---------------------------------------------------------------------------
// Mock data: venues across Europe & Americas
// ---------------------------------------------------------------------------

interface MockVenue {
    name: string;
    address: string;
    city: string;
    country: string;
    lng: number;
    lat: number;
}

const MOCK_VENUES: MockVenue[] = [
    { name: 'Wizink Center', address: 'Av. Felipe II, s/n', city: 'Madrid', country: 'Spain', lng: -3.6773, lat: 40.4225 },
    { name: 'Palau Sant Jordi', address: 'Passeig Olímpic, 5-7', city: 'Barcelona', country: 'Spain', lng: 2.1527, lat: 41.3646 },
    { name: 'Wembley Stadium', address: 'London HA9 0WS', city: 'London', country: 'United Kingdom', lng: -0.2795, lat: 51.5560 },
    { name: 'Olympia Paris', address: '28 Bd des Capucines', city: 'Paris', country: 'France', lng: 2.3284, lat: 48.8697 },
    { name: 'Ziggo Dome', address: 'De Passage 100', city: 'Amsterdam', country: 'Netherlands', lng: 4.9347, lat: 52.3139 },
    { name: 'Mercedes-Benz Arena', address: 'Mercedes-Platz 1', city: 'Berlin', country: 'Germany', lng: 13.4425, lat: 52.5075 },
    { name: 'Mediolanum Forum', address: 'Via G. Di Vittorio, 6', city: 'Milan', country: 'Italy', lng: 9.1422, lat: 45.4787 },
    { name: 'Madison Square Garden', address: '4 Pennsylvania Plaza', city: 'New York', country: 'United States', lng: -73.9934, lat: 40.7505 },
    { name: 'The O2', address: 'Peninsula Square', city: 'London', country: 'United Kingdom', lng: 0.0033, lat: 51.5030 },
    { name: 'Altice Arena', address: 'Rossio dos Olivais', city: 'Lisbon', country: 'Portugal', lng: -9.0946, lat: 38.7686 },
    { name: 'Movistar Arena', address: 'Humboldt 450', city: 'Buenos Aires', country: 'Argentina', lng: -58.4500, lat: -34.5946 },
    { name: 'Auditorio Nacional', address: 'Av. Paseo de la Reforma 50', city: 'Mexico City', country: 'Mexico', lng: -99.1779, lat: 19.4225 },
];

// ---------------------------------------------------------------------------
// Helper: generate deterministic events for a given artist
// ---------------------------------------------------------------------------

function generateMockEvents(artistId: string, artistName: string): Event[] {
    // Use artistId hash to pick venues deterministically
    const hash = artistId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const now = new Date();
    const events: Event[] = [];

    // Generate 3-6 upcoming events per artist
    const count = 3 + (hash % 4);

    for (let i = 0; i < count; i++) {
        const venue = MOCK_VENUES[(hash + i * 3) % MOCK_VENUES.length];
        const daysAhead = 7 + i * 14 + (hash % 10); // spread events across coming weeks
        const eventDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        events.push({
            _id: new ObjectId(),
            artistId: new ObjectId(artistId),
            artistName,
            title: `${artistName} Live in ${venue.city}`,
            date: eventDate,
            venue: {
                name: venue.name,
                address: venue.address,
                city: venue.city,
                country: venue.country,
                location: {
                    type: 'Point',
                    coordinates: [venue.lng, venue.lat],
                },
            },
            eventType: 'concert',
            status: 'confirmed',
            ticketUrl: `https://tickets.example.com/event/${artistId}-${i}`,
            dataSource: 'mock',
            externalId: `mock-${artistId}-${i}`,
            createdAt: now,
            updatedAt: now,
            lastChecked: now,
        });
    }

    return events;
}

// ---------------------------------------------------------------------------
// Haversine distance (km) between two lat/lng points
// ---------------------------------------------------------------------------

function haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Mock Event Repository
// ---------------------------------------------------------------------------

export class MockEventRepository implements IEventRepository {
    /**
     * In-memory cache of generated events keyed by artistId.
     * Populated lazily when an artist's events are requested.
     */
    private cache = new Map<string, Event[]>();

    /**
     * Register an artist so the mock can generate events for it.
     * Called by the EventService when it knows the artist name.
     */
    registerArtist(artistId: string, artistName: string): void {
        if (!this.cache.has(artistId)) {
            this.cache.set(artistId, generateMockEvents(artistId, artistName));
        }
    }

    async findByArtist(artistId: string, upcoming: boolean = true): Promise<Event[]> {
        const events = this.cache.get(artistId) || [];
        const now = new Date();

        const filtered = upcoming
            ? events.filter(e => e.date >= now)
            : events;

        return filtered.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    async findNearLocation(
        longitude: number,
        latitude: number,
        radiusKm: number,
        artistIds?: string[]
    ): Promise<Event[]> {
        const now = new Date();
        const allEvents: Event[] = [];

        for (const [id, events] of this.cache) {
            if (artistIds && artistIds.length > 0 && !artistIds.includes(id)) {
                continue;
            }
            allEvents.push(...events);
        }

        return allEvents
            .filter(e => {
                if (e.date < now) return false;
                const [lng, lat] = e.venue.location.coordinates;
                return haversineDistance(latitude, longitude, lat, lng) <= radiusKm;
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 100);
    }

    async findById(id: string): Promise<Event | null> {
        for (const events of this.cache.values()) {
            const found = events.find(e => e._id?.toString() === id);
            if (found) return found;
        }
        return null;
    }

    // These methods are only meaningful for persistent stores (MongoDB).
    async findCreatedAfter(_since: Date, _artistId?: string): Promise<Event[]> {
        return [];
    }

    async findUpcomingInDateRange(_artistIds: string[], _from: Date, _to: Date): Promise<Event[]> {
        return [];
    }
}
