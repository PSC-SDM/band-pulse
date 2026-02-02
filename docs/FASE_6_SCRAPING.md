# Fase 6: Web Scraping (Festivales)

**Duración estimada:** 2 semanas

## Objetivo

Implementar scrapers específicos para festivales de música que no están en APIs públicas, con enfoque en festivales europeos.

---

## Stack de Scraping

- **cheerio**: Parsing de HTML (jQuery-like)
- **axios**: HTTP requests
- **puppeteer** (opcional): Para sitios con JavaScript dinámico

---

## Tareas Backend

### 1. Instalación de Dependencias

```bash
cd backend
npm install cheerio axios
npm install -D @types/cheerio

# Opcional: para sitios con JS
npm install puppeteer
```

### 2. Base de Scraper

#### src/integrations/scrapers/base-scraper.ts

```typescript
import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../../utils/logger';

export interface ScrapedEvent {
  artistName: string;
  date: Date;
  endDate?: Date;
  venue: {
    name: string;
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  ticketUrl?: string;
  festivalName?: string;
}

export abstract class BaseScraper {
  protected abstract baseUrl: string;
  protected abstract festivalName: string;

  protected async fetchHtml(url: string): Promise<cheerio.CheerioAPI> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      return cheerio.load(response.data);
    } catch (error) {
      logger.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  abstract scrapeLineup(): Promise<ScrapedEvent[]>;
}
```

### 3. Scraper de Primavera Sound

#### src/integrations/scrapers/primavera-sound.scraper.ts

```typescript
import { BaseScraper, ScrapedEvent } from './base-scraper';
import { logger } from '../../utils/logger';

export class PrimaveraSoundScraper extends BaseScraper {
  protected baseUrl = 'https://www.primaverasound.com';
  protected festivalName = 'Primavera Sound Barcelona';

  async scrapeLineup(): Promise<ScrapedEvent[]> {
    logger.info('🎪 Scraping Primavera Sound lineup');

    try {
      const $ = await this.fetchHtml(`${this.baseUrl}/lineup`);
      const events: ScrapedEvent[] = [];

      // Selector específico de Primavera Sound (ajustar según estructura real)
      $('.artist-item').each((_, element) => {
        const artistName = $(element).find('.artist-name').text().trim();
        const dateStr = $(element).find('.artist-date').text().trim();
        
        if (!artistName) return;

        events.push({
          artistName,
          date: this.parseDate(dateStr),
          venue: {
            name: 'Parc del Fòrum',
            city: 'Barcelona',
            country: 'Spain',
            latitude: 41.4096,
            longitude: 2.2163,
          },
          ticketUrl: `${this.baseUrl}/tickets`,
          festivalName: this.festivalName,
        });
      });

      logger.info(`✅ Scraped ${events.length} artists from Primavera Sound`);
      return events;
    } catch (error) {
      logger.error('Error scraping Primavera Sound:', error);
      return [];
    }
  }

  private parseDate(dateStr: string): Date {
    // Lógica para parsear fechas del formato específico
    // Ejemplo: "30 May 2026" -> Date
    const year = new Date().getFullYear();
    return new Date(`${dateStr} ${year}`);
  }
}
```

### 4. Scraper de FIB (Festival Internacional de Benicàssim)

#### src/integrations/scrapers/fib.scraper.ts

```typescript
import { BaseScraper, ScrapedEvent } from './base-scraper';
import { logger } from '../../utils/logger';

export class FIBScraper extends BaseScraper {
  protected baseUrl = 'https://www.fiberfib.com';
  protected festivalName = 'FIB Benicàssim';

  async scrapeLineup(): Promise<ScrapedEvent[]> {
    logger.info('🎪 Scraping FIB lineup');

    try {
      const $ = await this.fetchHtml(`${this.baseUrl}/lineup`);
      const events: ScrapedEvent[] = [];

      // Selector específico (ajustar según estructura real)
      $('[data-artist]').each((_, element) => {
        const artistName = $(element).attr('data-artist-name');
        const day = $(element).attr('data-day');
        
        if (!artistName) return;

        events.push({
          artistName,
          date: this.parseFibDate(day || ''),
          venue: {
            name: 'Recinto FIB',
            city: 'Benicàssim',
            country: 'Spain',
            latitude: 40.0542,
            longitude: 0.0704,
          },
          ticketUrl: `${this.baseUrl}/tickets`,
          festivalName: this.festivalName,
        });
      });

      logger.info(`✅ Scraped ${events.length} artists from FIB`);
      return events;
    } catch (error) {
      logger.error('Error scraping FIB:', error);
      return [];
    }
  }

  private parseFibDate(day: string): Date {
    // FIB suele ser en julio
    const year = new Date().getFullYear();
    const dayNumber = parseInt(day) || 15;
    return new Date(year, 6, dayNumber); // Julio = mes 6
  }
}
```

### 5. Scraper Manager

#### src/services/scraper.service.ts

```typescript
import { EventRepository } from '../repositories/event.repository';
import { ArtistRepository } from '../repositories/artist.repository';
import { PrimaveraSoundScraper } from '../integrations/scrapers/primavera-sound.scraper';
import { FIBScraper } from '../integrations/scrapers/fib.scraper';
import { BaseScraper, ScrapedEvent } from '../integrations/scrapers/base-scraper';
import { logger } from '../utils/logger';

export class ScraperService {
  private scrapers: BaseScraper[];

  constructor(
    private eventRepository: EventRepository,
    private artistRepository: ArtistRepository
  ) {
    this.scrapers = [
      new PrimaveraSoundScraper(),
      new FIBScraper(),
      // Añadir más scrapers aquí
    ];
  }

  async scrapeAllFestivals(): Promise<void> {
    logger.info('🕷️ Starting festival scraping');

    for (const scraper of this.scrapers) {
      try {
        const events = await scraper.scrapeLineup();
        await this.processScrapedEvents(events);
        
        // Rate limiting: esperar entre scrapers
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        logger.error('Error in scraper:', error);
      }
    }

    logger.info('✅ Festival scraping completed');
  }

  private async processScrapedEvents(scrapedEvents: ScrapedEvent[]): Promise<void> {
    for (const scrapedEvent of scrapedEvents) {
      try {
        // 1. Buscar o crear artista
        let artist = await this.artistRepository.findByName(scrapedEvent.artistName);
        
        if (!artist) {
          // Intentar buscar en Spotify para enriquecer datos
          artist = await this.artistRepository.create({
            name: scrapedEvent.artistName,
            slug: this.generateSlug(scrapedEvent.artistName),
            genres: [],
            verified: false,
            metadata: { popularity: 0, followerCount: 0 },
            lastFetchedAt: new Date(),
            fetchSource: 'scraping',
          });
        }

        // 2. Crear evento
        await this.eventRepository.upsertFromScraper({
          artistId: artist._id!.toString(),
          artistName: artist.name,
          title: `${scrapedEvent.festivalName} - ${artist.name}`,
          date: scrapedEvent.date,
          endDate: scrapedEvent.endDate,
          venue: scrapedEvent.venue,
          eventType: 'festival',
          ticketUrl: scrapedEvent.ticketUrl,
          dataSource: 'scraped',
          festivalName: scrapedEvent.festivalName,
        });

        logger.info(`✅ Processed event: ${artist.name} at ${scrapedEvent.festivalName}`);
      } catch (error) {
        logger.error(`Error processing event for ${scrapedEvent.artistName}:`, error);
      }
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
```

### 6. Actualizar Event Repository

#### src/repositories/event.repository.ts (añadir método)

```typescript
async upsertFromScraper(data: any): Promise<Event> {
  const now = new Date();

  const event: Partial<Event> = {
    artistId: new ObjectId(data.artistId),
    artistName: data.artistName,
    title: data.title,
    date: data.date,
    endDate: data.endDate,
    venue: {
      name: data.venue.name,
      address: '',
      city: data.venue.city,
      country: data.venue.country,
      location: {
        type: 'Point',
        coordinates: [data.venue.longitude || 0, data.venue.latitude || 0],
      },
    },
    eventType: 'festival',
    status: 'announced',
    ticketUrl: data.ticketUrl,
    dataSource: 'scraped',
    externalId: `scraped-${data.festivalName}-${data.artistName}-${data.date.getTime()}`,
    scrapedData: { festivalName: data.festivalName },
    updatedAt: now,
    lastChecked: now,
  };

  const result = await this.collection.findOneAndUpdate(
    { externalId: event.externalId },
    {
      $set: event,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: 'after' }
  );

  return result!;
}
```

### 7. Worker de Scraping

#### src/workers/scraper.worker.ts

```typescript
import { ScraperService } from '../services/scraper.service';
import { EventRepository } from '../repositories/event.repository';
import { ArtistRepository } from '../repositories/artist.repository';
import { logger } from '../utils/logger';

export class ScraperWorker {
  private scraperService: ScraperService;

  constructor() {
    const eventRepository = new EventRepository();
    const artistRepository = new ArtistRepository();
    this.scraperService = new ScraperService(eventRepository, artistRepository);
  }

  async run(): Promise<void> {
    logger.info('🕷️ Scraper worker started');

    try {
      await this.scraperService.scrapeAllFestivals();
      logger.info('✅ Scraper worker completed');
    } catch (error) {
      logger.error('❌ Scraper worker failed:', error);
    }
  }
}
```

### 8. Actualizar Scheduler

#### src/workers/scheduler.ts (añadir)

```typescript
import { ScraperWorker } from './scraper.worker';

export function startScheduler() {
  // ... código existente ...

  // Scraper: ejecutar una vez al día a las 2 AM
  cron.schedule('0 2 * * *', () => {
    logger.info('⏰ Cron job: Running festival scrapers');
    const scraperWorker = new ScraperWorker();
    scraperWorker.run();
  });

  logger.info('📅 Scraper scheduler started: Daily at 2 AM');
}
```

### 9. Endpoint Manual de Scraping (desarrollo)

#### src/routes/admin.routes.ts

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { ScraperWorker } from '../workers/scraper.worker';

const router = Router();

// Solo para desarrollo/admin
router.post('/scrape-festivals', authenticate, async (req, res) => {
  try {
    const worker = new ScraperWorker();
    
    // Ejecutar en background
    worker.run().catch((error) => {
      console.error('Scraper error:', error);
    });

    res.json({ message: 'Scraping started in background' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as adminRoutes };
```

---

## Consideraciones Importantes

### 1. Rate Limiting

- Esperar entre requests (3-5 segundos)
- No sobrecargar servidores
- Respetar `robots.txt`

### 2. Manejo de Errores

- Reintentos con backoff exponencial
- Logging detallado
- Notificar fallos críticos

### 3. Cambios en la Estructura

Los scrapers pueden romperse si los sitios cambian su estructura HTML:

```typescript
// Buena práctica: múltiples selectores fallback
const artistName =
  $(element).find('.artist-name').text() ||
  $(element).find('[data-artist]').attr('data-artist') ||
  $(element).text();
```

### 4. Legal y Ético

- ✅ Scraping para uso personal/investigación
- ✅ Respetar frecuencia de requests
- ✅ User-Agent identificable
- ❌ No revender datos scrapeados
- ❌ No DDoS al servidor

---

## Testing

### 1. Test Manual de Scraper

```typescript
// test-scraper.ts
import { PrimaveraSoundScraper } from './src/integrations/scrapers/primavera-sound.scraper';

async function test() {
  const scraper = new PrimaveraSoundScraper();
  const events = await scraper.scrapeLineup();
  console.log(JSON.stringify(events, null, 2));
}

test();
```

```bash
npx tsx test-scraper.ts
```

### 2. Test de Procesamiento Completo

```bash
curl -X POST http://localhost:3001/api/admin/scrape-festivals \
  -H "Authorization: Bearer $TOKEN"

# Verificar en BBDD
mongosh bandpulse
> db.events.find({ dataSource: "scraped" }).pretty()
```

---

## Scrapers Adicionales Recomendados

### Festivales Europeos

1. **Mad Cool Festival** (Madrid)
2. **Rock am Ring** (Alemania)
3. **Glastonbury** (UK) - si tienen lineup público
4. **Tomorrowland** (Bélgica)
5. **Download Festival** (UK/Madrid)

### Template para Nuevo Scraper

```typescript
import { BaseScraper, ScrapedEvent } from './base-scraper';

export class NuevoFestivalScraper extends BaseScraper {
  protected baseUrl = 'https://www.festival.com';
  protected festivalName = 'Nombre del Festival';

  async scrapeLineup(): Promise<ScrapedEvent[]> {
    const $ = await this.fetchHtml(`${this.baseUrl}/lineup`);
    const events: ScrapedEvent[] = [];

    // 1. Analizar estructura HTML del sitio
    // 2. Extraer artistas y fechas
    // 3. Mapear a ScrapedEvent

    return events;
  }
}
```

---

## Entregables

- ✅ Al menos 3 scrapers de festivales europeos
- ✅ Sistema robusto de manejo de errores
- ✅ Worker automático diario
- ✅ Datos normalizados e integrados con artistas
- ✅ Eventos tipo "festival" diferenciados
- ✅ Rate limiting implementado

---

## Siguiente Fase

➡️ **[Fase 7: Refinamiento y Lanzamiento](./FASE_7_LANZAMIENTO.md)**
