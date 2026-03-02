# Tour Announcements Feature

> Sistema de detección y notificación de anuncios de giras musicales

---

## Tabla de Contenidos

1. [Overview](#overview)
2. [Fuentes de Datos](#fuentes-de-datos)
3. [Detección de Tours](#detección-de-tours)
4. [Sistema de Notificaciones](#sistema-de-notificaciones)
5. [Frontend UI](#frontend-ui)
6. [Database Schema](#database-schema)

---

## Overview

### Estado Actual

El backend ya tiene preparado el tipo `tour_announcement` en el enum de notificaciones:

```typescript
// Existente en: backend/src/application/notification/notification.service.ts
type NotificationType = 'new_concert' | 'concert_reminder' | 'tour_announcement';
```

**Falta implementar**:
- ✅ Tipo definido en código
- ❌ Detección automática de tours
- ❌ Lógica de notificación
- ❌ UI para mostrar tours
- ❌ Email template específico

### Diferencia con "New Concert"

| Feature | New Concert | Tour Announcement |
|---------|-------------|-------------------|
| **Trigger** | 1 evento nuevo | 5+ eventos en cluster |
| **Scope** | Single show | Serie de shows (tour) |
| **Prioridad** | Normal | Alta (más urgente) |
| **UI** | Card simple | Card destacada con badge |
| **Email** | Template estándar | Template premium con tour dates |

---

## Fuentes de Datos

### Comparación de APIs

```
┌─────────────────────────────────────────────────────────────┐
│                    FUENTES DE TOUR DATA                     │
├─────────────────┬───────────────────────────────────────────┤
│ Bandsintown API │ ✅ Endpoint específico para tour          │
│                 │ ✅ Incluye fechas futuras                 │
│                 │ ✅ Estado "announced"                     │
│                 │ ❌ API key limitada                      │
├─────────────────┼───────────────────────────────────────────┤
│ Songkick API    │ ✅ Artist calendar con flag "touring"    │
│                 │ ✅ Detecta patrones de múltiples shows    │
│                 │ ❌ Rate limits estrictos                 │
├─────────────────┼───────────────────────────────────────────┤
│ Ticketmaster    │ ✅ Ya integrado en Band-Pulse            │
│ (actual)        │ ✅ Keyword "tour" en nombre evento       │
│                 │ ✅ 5 req/s, 5000/día free tier          │
│                 │ ⚠️ Requiere heurística para detectar     │
└─────────────────┴───────────────────────────────────────────┘
```

### Estrategia Recomendada

**Fase 1**: Usar Ticketmaster (ya integrado) + heurística
**Fase 2**: Añadir Bandsintown como fuente complementaria

---

## Detección de Tours

### Heurística de Detección

Un "tour" se define como:
- **5+ eventos** del mismo artista
- En un período de **60 días**
- Con máximo **14 días** entre shows consecutivos
- Abarcando **2+ ciudades** o regiones

### Tour Detection Service

```typescript
// Nuevo archivo: backend/src/application/tour/tour-detection.service.ts

import { EventRepository } from '../../infrastructure/repositories/event.repository';
import { TourRepository } from '../../infrastructure/repositories/tour.repository';
import crypto from 'crypto';

interface TourAnnouncement {
  artistId: string;
  tourName: string;
  dates: {
    start: Date;
    end: Date;
  };
  eventCount: number;
  regions: string[];  // ['North America', 'Europe', etc.]
  cities: string[];
  announcedAt: Date;
  hash: string;       // Para deduplicación
}

export class TourDetectionService {
  // Configuración de detección
  private readonly TOUR_THRESHOLD = 5;           // Mínimo 5 shows
  private readonly TOUR_WINDOW_DAYS = 60;        // Dentro de 60 días
  private readonly MAX_DAYS_BETWEEN_SHOWS = 14;  // Máx gap entre shows

  constructor(
    private eventRepository: EventRepository,
    private tourRepository: TourRepository
  ) {}

  /**
   * Detectar tour announcement para un artista
   */
  async detectTourForArtist(artistId: string): Promise<TourAnnouncement | null> {
    // Obtener eventos futuros del artista
    const events = await this.eventRepository.findUpcomingByArtist(artistId);
    
    if (events.length < this.TOUR_THRESHOLD) {
      return null;
    }

    // Ordenar por fecha
    const sortedEvents = events.sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );

    // Agrupar en clusters por proximidad temporal
    const clusters = this.clusterEventsByProximity(sortedEvents);
    
    // Encontrar cluster más grande que cumpla threshold
    const tourCluster = clusters.find(c => c.length >= this.TOUR_THRESHOLD);
    
    if (!tourCluster) {
      return null;
    }

    // Generar hash para deduplicación
    const tourHash = this.generateTourHash(artistId, tourCluster);
    
    // Verificar si ya notificamos este tour
    const alreadyNotified = await this.tourRepository.existsByHash(tourHash);
    
    if (alreadyNotified) {
      return null;
    }

    // Construir tour announcement
    return {
      artistId,
      tourName: this.inferTourName(tourCluster),
      dates: {
        start: tourCluster[0].date,
        end: tourCluster[tourCluster.length - 1].date
      },
      eventCount: tourCluster.length,
      regions: this.extractRegions(tourCluster),
      cities: this.extractCities(tourCluster),
      announcedAt: new Date(),
      hash: tourHash
    };
  }

  /**
   * Agrupar eventos en clusters por proximidad temporal
   */
  private clusterEventsByProximity(events: Event[]): Event[][] {
    const clusters: Event[][] = [];
    let currentCluster: Event[] = [];
    
    for (let i = 0; i < events.length; i++) {
      if (currentCluster.length === 0) {
        currentCluster.push(events[i]);
        continue;
      }
      
      const lastEvent = currentCluster[currentCluster.length - 1];
      const daysDiff = this.daysBetween(lastEvent.date, events[i].date);
      
      // Si el gap es <= 14 días, pertenece al mismo tour
      if (daysDiff <= this.MAX_DAYS_BETWEEN_SHOWS) {
        currentCluster.push(events[i]);
      } else {
        // Gap demasiado grande, nuevo cluster
        clusters.push(currentCluster);
        currentCluster = [events[i]];
      }
    }
    
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }
    
    return clusters;
  }

  /**
   * Inferir nombre del tour desde nombres de eventos
   */
  private inferTourName(events: Event[]): string {
    // Buscar substring común en títulos
    const titles = events.map(e => e.title);
    const commonSubstring = this.findCommonSubstring(titles);
    
    // Si hay "tour" en el substring común, usarlo
    if (commonSubstring && commonSubstring.toLowerCase().includes('tour')) {
      return commonSubstring.trim();
    }
    
    // Buscar en descripción o nombre del venue
    const tourKeywords = ['world tour', 'tour', 'live', 'on tour'];
    for (const title of titles) {
      const lowerTitle = title.toLowerCase();
      for (const keyword of tourKeywords) {
        if (lowerTitle.includes(keyword)) {
          // Extraer aproximadamente el nombre
          const parts = title.split('-');
          if (parts.length > 1) {
            return parts[1].trim();
          }
        }
      }
    }
    
    // Fallback: "{Artist} Tour {Year}"
    const year = events[0].date.getFullYear();
    return `${events[0].artistName} Tour ${year}`;
  }

  /**
   * Extraer regiones únicas de los eventos
   */
  private extractRegions(events: Event[]): string[] {
    const regionSet = new Set<string>();
    
    for (const event of events) {
      const country = event.venue.country;
      
      // Mapear países a regiones
      const region = this.mapCountryToRegion(country);
      regionSet.add(region);
    }
    
    return Array.from(regionSet);
  }

  /**
   * Extraer ciudades únicas
   */
  private extractCities(events: Event[]): string[] {
    const citySet = new Set<string>();
    
    for (const event of events) {
      citySet.add(event.venue.city);
    }
    
    return Array.from(citySet);
  }

  /**
   * Generar hash único para el tour (deduplicación)
   */
  private generateTourHash(artistId: string, events: Event[]): string {
    const eventIds = events
      .map(e => e._id.toString())
      .sort()
      .join(',');
    
    return crypto
      .createHash('sha256')
      .update(`${artistId}:${eventIds}`)
      .digest('hex');
  }

  /**
   * Encontrar substring común más largo en array de strings
   */
  private findCommonSubstring(strings: string[]): string | null {
    if (strings.length === 0) return null;
    if (strings.length === 1) return strings[0];
    
    let common = strings[0];
    
    for (let i = 1; i < strings.length; i++) {
      common = this.longestCommonSubstring(common, strings[i]);
      if (common.length === 0) break;
    }
    
    return common.length > 5 ? common : null;  // Mínimo 5 chars
  }

  private longestCommonSubstring(str1: string, str2: string): string {
    const m = str1.length;
    const n = str2.length;
    let maxLength = 0;
    let endIndex = 0;
    
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase()) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          if (dp[i][j] > maxLength) {
            maxLength = dp[i][j];
            endIndex = i;
          }
        }
      }
    }
    
    return str1.substring(endIndex - maxLength, endIndex);
  }

  /**
   * Calcular días entre dos fechas
   */
  private daysBetween(date1: Date, date2: Date): number {
    const diff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Mapear país a región geográfica
   */
  private mapCountryToRegion(country: string): string {
    const regionMap: { [key: string]: string } = {
      'US': 'North America',
      'CA': 'North America',
      'MX': 'North America',
      'GB': 'Europe',
      'FR': 'Europe',
      'DE': 'Europe',
      'ES': 'Europe',
      'IT': 'Europe',
      'NL': 'Europe',
      'AU': 'Oceania',
      'NZ': 'Oceania',
      'BR': 'South America',
      'AR': 'South America',
      'JP': 'Asia',
      'KR': 'Asia',
      // ... añadir más según necesidad
    };
    
    return regionMap[country] || 'Other';
  }
}
```

---

## Sistema de Notificaciones

### Notification Service Extension

```typescript
// Añadir a: backend/src/application/notification/notification.service.ts

import { TourAnnouncement } from '../tour/tour-detection.service';
import { TourRepository } from '../../infrastructure/repositories/tour.repository';

export class NotificationService {
  // ... existing code

  /**
   * Notificar tour announcement a followers del artista
   */
  async notifyTourAnnouncement(tour: TourAnnouncement): Promise<void> {
    const artist = await this.artistRepository.findById(tour.artistId);
    const followers = await this.followRepository.findFollowersByArtist(tour.artistId);

    console.log(`Notifying ${followers.length} followers about ${artist.name} tour`);

    for (const follow of followers) {
      const user = follow.user;
      
      // Verificar si algún evento del tour está cerca del usuario
      const nearbyEvents = await this.findTourEventsNearUser(tour, user);
      
      if (nearbyEvents.length === 0) {
        // No hay eventos cerca, skip
        continue;
      }

      // Crear notificación
      await this.notificationRepository.create({
        userId: user._id,
        type: 'tour_announcement',
        title: `🎸 ${artist.name} announces new tour!`,
        message: `${tour.tourName} - ${tour.eventCount} shows including ${nearbyEvents.length} near you`,
        data: {
          artistId: tour.artistId,
          artistName: artist.name,
          artistImage: artist.imageUrl,
          tourName: tour.tourName,
          nearbyEventIds: nearbyEvents.map(e => e._id.toString()),
          totalEvents: tour.eventCount,
          regions: tour.regions,
          dateRange: this.formatDateRange(tour.dates.start, tour.dates.end)
        },
        read: false,
        createdAt: new Date()
      });

      // Email destacado para tour announcements
      if (user.preferences.emailNotifications) {
        await this.emailService.sendTourAnnouncementEmail(
          user,
          artist,
          tour,
          nearbyEvents
        );
      }
    }

    // Guardar tour en DB para evitar duplicados
    await this.tourRepository.create({
      ...tour,
      notifiedAt: new Date()
    });

    console.log(`Tour announcement notifications sent`);
  }

  /**
   * Encontrar eventos del tour cerca del usuario
   */
  private async findTourEventsNearUser(
    tour: TourAnnouncement,
    user: User
  ): Promise<Event[]> {
    if (!user.location) {
      return [];
    }

    const events = await this.eventRepository.findManyByArtist(tour.artistId);
    const maxDistance = user.preferences.maxDistance || 100; // km

    return events.filter(event => {
      const distance = this.calculateDistance(
        user.location.coordinates,
        event.venue.location.coordinates
      );
      return distance <= maxDistance;
    });
  }

  /**
   * Formatear rango de fechas
   */
  private formatDateRange(start: Date, end: Date): string {
    const startStr = start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const endStr = end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${startStr} - ${endStr}`;
  }
}
```

### Background Worker Integration

```typescript
// Modificar: backend/src/infrastructure/workers/event-refresh.worker.ts

import { TourDetectionService } from '../../application/tour/tour-detection.service';

export class EventRefreshWorker {
  private tourDetection: TourDetectionService;

  async refreshEventsForArtist(artistId: string): Promise<void> {
    // ... existing event refresh logic
    
    // Después de refrescar eventos, detectar posibles tours
    const tour = await this.tourDetection.detectTourForArtist(artistId);
    
    if (tour) {
      console.log(`Detected tour: ${tour.tourName} for artist ${artistId}`);
      await this.notificationService.notifyTourAnnouncement(tour);
    }
  }
}
```

---

## Frontend UI

### Tour Announcement Card

```tsx
// Nuevo componente: frontend/components/tours/TourAnnouncementCard.tsx

interface TourAnnouncementProps {
  tour: {
    id: string;
    artistName: string;
    artistImage: string;
    tourName: string;
    eventCount: number;
    nearbyCount: number;
    dateRange: string;
    regions: string[];
  };
}

export function TourAnnouncementCard({ tour }: TourAnnouncementProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br 
                    from-orange/20 to-prussian-blue border-2 border-orange/40
                    hover:border-orange/60 transition-all duration-300">
      {/* Badge "NEW TOUR" */}
      <div className="absolute top-4 right-4 bg-orange text-night text-xs 
                      font-bold px-3 py-1.5 rounded-full uppercase tracking-wider
                      shadow-lg animate-pulse">
        New Tour
      </div>
      
      <div className="p-6">
        {/* Header con imagen del artista */}
        <div className="flex items-center gap-4 mb-4">
          <img 
            src={tour.artistImage} 
            alt={tour.artistName}
            className="w-16 h-16 rounded-[14px] object-cover ring-2 ring-orange/30"
          />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">{tour.artistName}</h3>
            <p className="text-orange font-medium">{tour.tourName}</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="text-alabaster/60">
            <span className="text-white font-medium">{tour.eventCount}</span> shows
            {' • '}
            <span className="text-orange font-medium">{tour.nearbyCount}</span> near you
          </div>
          <span className="text-alabaster/40">{tour.dateRange}</span>
        </div>
        
        {/* Regions */}
        <div className="flex gap-2 mb-4">
          {tour.regions.map(region => (
            <span 
              key={region}
              className="text-xs bg-alabaster/10 text-alabaster/70 px-2 py-1 rounded-[8px]"
            >
              {region}
            </span>
          ))}
        </div>
        
        {/* CTA */}
        <button className="mt-2 w-full bg-orange text-night font-bold py-3 
                           rounded-[12px] hover:bg-orange/90 transition-colors
                           shadow-lg shadow-orange/20">
          View Tour Dates
        </button>
      </div>
    </div>
  );
}
```

### Dashboard Integration

```tsx
// Modificar: frontend/app/dashboard/page.tsx

import { TourAnnouncementCard } from '@/components/tours/TourAnnouncementCard';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function DashboardPage() {
  const tourAnnouncements = await getTourAnnouncements();
  
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section>
        <h1 className="text-4xl font-bold text-white mb-2">Your Pulse</h1>
        <p className="text-alabaster/60">
          Stay updated on your favorite artists
        </p>
      </section>

      {/* Tour Announcements - Destacado arriba */}
      {tourAnnouncements.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🎤</span> Tour Announcements
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tourAnnouncements.map(tour => (
              <TourAnnouncementCard key={tour.id} tour={tour} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Upcoming Events</h2>
        {/* ... existing events */}
      </section>
    </div>
  );
}
```

### Tour Details Page

```tsx
// Nuevo archivo: frontend/app/dashboard/tours/[id]/page.tsx

import { TourDatesList } from '@/components/tours/TourDatesList';

export default async function TourDetailsPage({ params }: { params: { id: string } }) {
  const tour = await getTourDetails(params.id);
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <img 
            src={tour.artistImage}
            alt={tour.artistName}
            className="w-20 h-20 rounded-[16px] object-cover"
          />
          <div>
            <h1 className="text-3xl font-bold text-white">{tour.tourName}</h1>
            <p className="text-alabaster/60">{tour.artistName}</p>
          </div>
        </div>
        
        <div className="flex gap-4 text-sm text-alabaster/60">
          <span>{tour.eventCount} shows</span>
          <span>•</span>
          <span>{tour.dateRange}</span>
          <span>•</span>
          <span>{tour.regions.join(', ')}</span>
        </div>
      </div>

      {/* Tour Dates List */}
      <TourDatesList events={tour.events} />
    </div>
  );
}
```

```tsx
// Nuevo componente: frontend/components/tours/TourDatesList.tsx

interface TourDatesListProps {
  events: Event[];
}

export function TourDatesList({ events }: TourDatesListProps) {
  return (
    <div className="space-y-2">
      {events.map(event => (
        <div 
          key={event.id}
          className="bg-prussian-blue/50 rounded-[20px] p-4 flex items-center gap-4
                     hover:bg-prussian-blue/70 transition-colors"
        >
          {/* Date Badge */}
          <div className="bg-orange/10 border border-orange/30 rounded-[12px] p-3 text-center">
            <div className="text-orange font-bold text-sm">
              {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
            </div>
            <div className="text-white font-bold text-xl">
              {new Date(event.date).getDate()}
            </div>
          </div>
          
          {/* Event Info */}
          <div className="flex-1">
            <h3 className="text-white font-semibold">{event.venue.name}</h3>
            <p className="text-alabaster/60 text-sm">
              {event.venue.city}, {event.venue.country}
            </p>
          </div>
          
          {/* Distance */}
          {event.distance && (
            <span className="text-alabaster/40 text-sm">
              {event.distance} km away
            </span>
          )}
          
          {/* CTA */}
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-orange text-night font-medium px-4 py-2 rounded-[10px]
                       hover:bg-orange/90 transition-colors text-sm"
          >
            Get Tickets
          </a>
        </div>
      ))}
    </div>
  );
}
```

---

## Database Schema

### Tour Entity

```typescript
// Nuevo archivo: backend/src/domain/tour/tour.entity.ts

import { ObjectId } from 'mongodb';

export interface Tour {
  _id: ObjectId;
  artistId: ObjectId;
  artistName: string;
  tourName: string;
  
  dates: {
    start: Date;
    end: Date;
  };
  
  eventIds: ObjectId[];      // IDs de eventos del tour
  eventCount: number;
  
  regions: string[];         // ['North America', 'Europe']
  cities: string[];          // Ciudades visitadas
  
  hash: string;              // Para deduplicación
  
  announcedAt: Date;
  notifiedAt: Date;          // Cuándo se enviaron notificaciones
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Tour Repository

```typescript
// Nuevo archivo: backend/src/infrastructure/repositories/tour.repository.ts

import { Collection, ObjectId } from 'mongodb';
import { Tour } from '../../domain/tour/tour.entity';

export class TourRepository {
  private collection: Collection<Tour>;

  constructor(collection: Collection<Tour>) {
    this.collection = collection;
  }

  async create(tour: Omit<Tour, '_id' | 'createdAt' | 'updatedAt'>): Promise<Tour> {
    const now = new Date();
    const newTour: Tour = {
      _id: new ObjectId(),
      ...tour,
      createdAt: now,
      updatedAt: now
    };

    await this.collection.insertOne(newTour);
    return newTour;
  }

  async existsByHash(hash: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ hash });
    return count > 0;
  }

  async findByArtist(artistId: string): Promise<Tour[]> {
    return this.collection
      .find({ artistId: new ObjectId(artistId) })
      .sort({ announcedAt: -1 })
      .toArray();
  }

  async findRecent(limit: number = 10): Promise<Tour[]> {
    return this.collection
      .find()
      .sort({ announcedAt: -1 })
      .limit(limit)
      .toArray();
  }
}
```

### MongoDB Indexes

```javascript
// Añadir a: scripts/mongo-init.js

db.tours.createIndex({ artistId: 1, announcedAt: -1 });
db.tours.createIndex({ hash: 1 }, { unique: true });
db.tours.createIndex({ announcedAt: -1 });
db.tours.createIndex({ 'dates.start': 1 });
```

---

## Testing Strategy

### Unit Tests

```typescript
// backend/tests/unit/tour-detection.service.test.ts

describe('TourDetectionService', () => {
  describe('detectTourForArtist', () => {
    it('should detect tour with 5+ events in 60 days', async () => {
      const events = createMockEvents(6, 10); // 6 events, 10 días apart
      const tour = await service.detectTourForArtist('artist-id');
      
      expect(tour).toBeDefined();
      expect(tour?.eventCount).toBe(6);
    });

    it('should not detect tour with < 5 events', async () => {
      const events = createMockEvents(3, 10);
      const tour = await service.detectTourForArtist('artist-id');
      
      expect(tour).toBeNull();
    });

    it('should not detect tour with large gaps', async () => {
      const events = createMockEvents(6, 20); // 20 days apart (> 14)
      const tour = await service.detectTourForArtist('artist-id');
      
      expect(tour).toBeNull();
    });

    it('should infer tour name from event titles', () => {
      const events = [
        { title: 'Artist - World Tour 2026' },
        { title: 'Artist - World Tour 2026' }
      ];
      const name = service['inferTourName'](events);
      
      expect(name).toBe('World Tour 2026');
    });
  });
});
```

### Integration Tests

```typescript
// backend/tests/integration/tour-notification.test.ts

describe('Tour Notification Flow', () => {
  it('should notify followers when tour is detected', async () => {
    // Setup: Create artist with followers
    const artist = await createTestArtist();
    const users = await createTestUsers(3);
    await followArtist(users, artist);

    // Create tour-like events
    await createTourEvents(artist.id, 6);

    // Trigger detection
    await tourDetection.detectTourForArtist(artist.id);

    // Assert: Notifications created
    const notifications = await getNotificationsByType('tour_announcement');
    expect(notifications).toHaveLength(3);
  });
});
```

---

## Métricas de Éxito

| Métrica | Target |
|---------|--------|
| Tours detectados por mes | >50 |
| False positive rate | <10% |
| Notification click-through rate | >30% (mayor que new_concert) |
| Email open rate | >40% |
| Conversion to ticket purchase | >5% |

---

*Última actualización: Marzo 2, 2026*
