# Fase 4: Descubrimiento de Eventos

**Duración estimada:** 3 semanas

## Objetivo

Implementar integración con APIs de eventos (Bandsintown), sistema de workers para sincronización periódica, y visualización de conciertos filtrados por ubicación del usuario.

---

## APIs de Eventos

### Bandsintown API (gratuita)

**Documentación:** https://www.bandsintown.com/api/overview

**Endpoints:**
- `GET /artists/{artist_name}/events` - Eventos de un artista
- `GET /events/{event_id}` - Detalle de evento

**Request Key:** Se envía en query param `app_id`

---

## Tareas Backend

### 1. Configuración

```bash
# backend/.env
BANDSINTOWN_APP_ID=your_app_name
```

### 2. Integración Bandsintown

#### src/integrations/bandsintown.ts

```typescript
import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface BandsintownEvent {
  id: string;
  title: string;
  datetime: string;
  venue: {
    name: string;
    city: string;
    country: string;
    latitude: string;
    longitude: string;
    location: string;
  };
  offers: Array<{
    type: string;
    url: string;
    status: string;
  }>;
  description: string;
}

class BandsintownClient {
  private baseUrl = 'https://rest.bandsintown.com';

  async getArtistEvents(artistName: string): Promise<BandsintownEvent[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/artists/${encodeURIComponent(artistName)}/events`,
        { params: { app_id: env.BANDSINTOWN_APP_ID } }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return []; // Artista sin eventos
      }
      logger.error('Bandsintown API error:', error);
      throw error;
    }
  }
}

export const bandsintownClient = new BandsintownClient();
```

### 3. Modelo y Repositorio de Eventos

#### src/repositories/event.repository.ts

```typescript
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

export interface Event {
  _id?: ObjectId;
  artistId: ObjectId;
  artistName: string;
  title: string;
  date: Date;
  venue: {
    name: string;
    address: string;
    city: string;
    country: string;
    location: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    };
  };
  eventType: string;
  status: string;
  ticketUrl?: string;
  dataSource: string;
  externalId: string;
  createdAt: Date;
  updatedAt: Date;
  lastChecked: Date;
}

export class EventRepository {
  private get collection() {
    return getDatabase().collection<Event>('events');
  }

  async upsertFromBandsintown(artistId: string, artistName: string, bitEvent: any): Promise<Event> {
    const now = new Date();

    const event: Partial<Event> = {
      artistId: new ObjectId(artistId),
      artistName,
      title: bitEvent.title || `${artistName} - ${bitEvent.venue.city}`,
      date: new Date(bitEvent.datetime),
      venue: {
        name: bitEvent.venue.name,
        address: bitEvent.venue.location || '',
        city: bitEvent.venue.city,
        country: bitEvent.venue.country,
        location: {
          type: 'Point',
          coordinates: [
            parseFloat(bitEvent.venue.longitude),
            parseFloat(bitEvent.venue.latitude),
          ],
        },
      },
      eventType: 'concert',
      status: bitEvent.offers?.[0]?.status || 'announced',
      ticketUrl: bitEvent.offers?.[0]?.url,
      dataSource: 'bandsintown',
      externalId: bitEvent.id,
      updatedAt: now,
      lastChecked: now,
    };

    const result = await this.collection.findOneAndUpdate(
      { externalId: bitEvent.id, dataSource: 'bandsintown' },
      {
        $set: event,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: 'after' }
    );

    return result!;
  }

  async findByArtist(artistId: string, upcoming: boolean = true): Promise<Event[]> {
    const query: any = { artistId: new ObjectId(artistId) };
    
    if (upcoming) {
      query.date = { $gte: new Date() };
    }

    return this.collection.find(query).sort({ date: 1 }).toArray();
  }

  async findNearLocation(
    longitude: number,
    latitude: number,
    radiusKm: number,
    artistIds?: string[]
  ): Promise<Event[]> {
    const query: any = {
      'venue.location': {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radiusKm * 1000, // km to meters
        },
      },
      date: { $gte: new Date() },
    };

    if (artistIds && artistIds.length > 0) {
      query.artistId = { $in: artistIds.map((id) => new ObjectId(id)) };
    }

    return this.collection.find(query).limit(100).toArray();
  }
}
```

### 4. Worker de Sincronización

#### src/workers/event-sync.worker.ts

```typescript
import { ArtistRepository } from '../repositories/artist.repository';
import { EventRepository } from '../repositories/event.repository';
import { FollowRepository } from '../repositories/follow.repository';
import { bandsintownClient } from '../integrations/bandsintown';
import { logger } from '../utils/logger';

export class EventSyncWorker {
  constructor(
    private artistRepository: ArtistRepository,
    private eventRepository: EventRepository,
    private followRepository: FollowRepository
  ) {}

  async syncAllFollowedArtists(): Promise<void> {
    logger.info('🔄 Starting event sync for all followed artists');

    try {
      // Obtener todos los artistas que al menos un usuario sigue
      const follows = await this.followRepository.getAllFollows();
      const uniqueArtistIds = [...new Set(follows.map((f) => f.artistId.toString()))];

      logger.info(`Found ${uniqueArtistIds.length} unique followed artists`);

      for (const artistId of uniqueArtistIds) {
        await this.syncArtistEvents(artistId);
        // Rate limiting: esperar 1 segundo entre requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      logger.info('✅ Event sync completed');
    } catch (error) {
      logger.error('❌ Event sync failed:', error);
    }
  }

  async syncArtistEvents(artistId: string): Promise<void> {
    const artist = await this.artistRepository.findById(artistId);
    if (!artist) return;

    logger.info(`Syncing events for ${artist.name}`);

    try {
      const bandsintownEvents = await bandsintownClient.getArtistEvents(artist.name);

      for (const bitEvent of bandsintownEvents) {
        await this.eventRepository.upsertFromBandsintown(
          artistId,
          artist.name,
          bitEvent
        );
      }

      logger.info(`✅ Synced ${bandsintownEvents.length} events for ${artist.name}`);
    } catch (error) {
      logger.error(`Error syncing events for ${artist.name}:`, error);
    }
  }
}
```

### 5. Scheduler con node-cron

```bash
npm install node-cron
npm install -D @types/node-cron
```

#### src/workers/scheduler.ts

```typescript
import cron from 'node-cron';
import { EventSyncWorker } from './event-sync.worker';
import { ArtistRepository } from '../repositories/artist.repository';
import { EventRepository } from '../repositories/event.repository';
import { FollowRepository } from '../repositories/follow.repository';
import { logger } from '../utils/logger';

export function startScheduler() {
  const artistRepository = new ArtistRepository();
  const eventRepository = new EventRepository();
  const followRepository = new FollowRepository();
  const worker = new EventSyncWorker(artistRepository, eventRepository, followRepository);

  // Ejecutar cada 6 horas
  cron.schedule('0 */6 * * *', () => {
    logger.info('⏰ Cron job triggered: Syncing events');
    worker.syncAllFollowedArtists();
  });

  logger.info('📅 Scheduler started: Event sync every 6 hours');
}
```

#### Actualizar src/index.ts

```typescript
import { startScheduler } from './workers/scheduler';

// ... después de conectar DB y antes de start server ...
async function start() {
  try {
    await connectDatabase();
    
    // Iniciar scheduler
    startScheduler();
    
    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}
```

### 6. Routes de Eventos

#### src/routes/events.routes.ts

```typescript
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { EventRepository } from '../repositories/event.repository';
import { FollowRepository } from '../repositories/follow.repository';
import { UserRepository } from '../repositories/user.repository';
import { EventSyncWorker } from '../workers/event-sync.worker';
import { ArtistRepository } from '../repositories/artist.repository';

const router = Router();
const eventRepository = new EventRepository();
const followRepository = new FollowRepository();
const userRepository = new UserRepository();
const artistRepository = new ArtistRepository();

// Obtener eventos de artistas seguidos cerca del usuario
router.get('/near-me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await userRepository.findById(req.user!.userId);
    
    if (!user || !user.location) {
      return res.status(400).json({ error: 'User location not set' });
    }

    const artistIds = await followRepository.getFollowedArtistIds(req.user!.userId);

    const events = await eventRepository.findNearLocation(
      user.location.coordinates[0],
      user.location.coordinates[1],
      user.radiusKm || 50,
      artistIds
    );

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener eventos de un artista específico
router.get('/artist/:artistId', authenticate, async (req: AuthRequest, res) => {
  try {
    const events = await eventRepository.findByArtist(req.params.artistId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trigger manual sync (solo para desarrollo)
router.post('/sync/:artistId', authenticate, async (req: AuthRequest, res) => {
  try {
    const worker = new EventSyncWorker(
      artistRepository,
      eventRepository,
      followRepository
    );
    await worker.syncArtistEvents(req.params.artistId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as eventsRoutes };
```

---

## Tareas Frontend

### 1. Componente EventCard

#### components/Events/EventCard.tsx

```typescript
interface Event {
  _id: string;
  artistName: string;
  title: string;
  date: string;
  venue: {
    name: string;
    city: string;
    country: string;
  };
  ticketUrl?: string;
}

export default function EventCard({ event }: { event: Event }) {
  const eventDate = new Date(event.date);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{event.artistName}</h3>
          <p className="text-gray-600">{event.venue.name}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-600">
            {eventDate.getDate()}
          </div>
          <div className="text-sm text-gray-600">
            {eventDate.toLocaleDateString('en', { month: 'short' })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <span>📍</span>
        <span>{event.venue.city}, {event.venue.country}</span>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {eventDate.toLocaleDateString('en', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>

      {event.ticketUrl && (
        <a
          href={event.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition"
        >
          View Tickets
        </a>
      )}
    </div>
  );
}
```

### 2. Página de Eventos

#### app/dashboard/events/page.tsx

```typescript
'use client';

import { useEffect, useState } from 'react';
import EventCard from '@/components/Events/EventCard';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      const response = await fetch('/api/events/near-me');
      const data = await response.json();
      setEvents(data);
      setLoading(false);
    }

    fetchEvents();
  }, []);

  if (loading) {
    return <div className="p-8">Loading events...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="text-3xl font-bold mb-8">Upcoming Concerts Near You</h1>

        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              No upcoming concerts found. Try following more artists or increasing your search radius.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event: any) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3. Vista de mapa

#### components/Events/EventMap.tsx

```typescript
'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const eventIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function EventMap({ events }: { events: any[] }) {
  if (events.length === 0) return null;

  const center: [number, number] = [
    events[0].venue.location.coordinates[1],
    events[0].venue.location.coordinates[0],
  ];

  return (
    <MapContainer center={center} zoom={8} className="h-[500px] w-full rounded-lg">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {events.map((event) => (
        <Marker
          key={event._id}
          position={[
            event.venue.location.coordinates[1],
            event.venue.location.coordinates[0],
          ]}
          icon={eventIcon}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold">{event.artistName}</h3>
              <p className="text-sm">{event.venue.name}</p>
              <p className="text-xs text-gray-600">
                {new Date(event.date).toLocaleDateString()}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

---

## Entregables

- ✅ Integración con Bandsintown API
- ✅ Worker de sincronización periódica (cada 6 horas)
- ✅ Eventos filtrados por ubicación y radio del usuario
- ✅ Eventos solo de artistas seguidos
- ✅ Vista en lista y mapa
- ✅ Índice geoespacial para queries eficientes

---

## Siguiente Fase

➡️ **[Fase 5: Sistema de Notificaciones](./FASE_5_NOTIFICACIONES.md)**
