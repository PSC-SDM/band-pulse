# BandPulse - Estrategia de Implementación

## Estado del Proyecto

### Implementado

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Setup e Infraestructura | ✅ | Monorepo, TypeScript, MongoDB, Docker |
| Autenticación | ✅ | Google OAuth, email/password, JWT, NextAuth |
| Ubicación | ✅ | Leaflet maps, pin draggable, radio, GeoJSON |
| Artistas | ✅ | MusicBrainz (búsqueda) + Spotify (enriquecimiento), follows, caché |
| Eventos | ✅ | Ticketmaster API, geospatial queries, Your Pulse, Explore |
| Notificaciones (parcial) | ⚠️ | In-app funcional, email stub, workers parciales |
| UI/UX base | ✅ | Dark theme, Skeletons, EmptyState, Alert, responsive |

### Pendiente

| Módulo | Documento | Descripción |
|--------|-----------|-------------|
| Email notifications | [FASE_5](./docs/FASE_5_NOTIFICACIONES.md) | Envío real de emails, activar workers |
| Web Scraping | [FASE_6](./docs/FASE_6_SCRAPING.md) | Scrapers de festivales europeos |
| Lanzamiento | [FASE_7](./docs/FASE_7_LANZAMIENTO.md) | Testing, optimización, deploy VPS |
| Spotify OAuth | [SPOTIFY_OAUTH](./docs/SPOTIFY_OAUTH.md) | Auto-import artistas del usuario |
| Tour Announcements | [TOUR_ANNOUNCEMENTS](./docs/TOUR_ANNOUNCEMENTS.md) | Detección y notificación de giras |
| Mejoras UI/UX | [UI_IMPROVEMENTS](./docs/UI_IMPROVEMENTS.md) | Onboarding wizard, micro-interacciones |

---

## Arquitectura Actual

```
┌─────────────┐      HTTPS/REST      ┌──────────────┐
│   Frontend  │ ───────────────────> │   Backend    │
│  (Next.js   │                      │  (Express +  │
│   16 + React│ <─────────────────── │   Clean Arch)│
│   18)       │      JSON            │              │
└─────────────┘                      └───────┬──────┘
                                             │
                                     ┌───────▼──────┐
                                     │   MongoDB    │
                                     └──────────────┘
                                             ▲
                                     ┌───────┴──────────┐
                                     │  APIs Externas   │
                                     │  - MusicBrainz   │
                                     │  - Spotify       │
                                     │  - Ticketmaster  │
                                     └──────────────────┘
```

### Backend: Clean Architecture

```
backend/src/
├── domain/            # Entidades (user, artist, event, follow, notification)
├── application/       # Servicios de negocio
├── infrastructure/    # DB, APIs externas, email, workers
├── interfaces/        # HTTP controllers, routes, DTOs, validators
└── shared/            # Utilidades, config, logging
```

## Stack Tecnológico Actual

### Frontend
- **Next.js 16** (App Router) + React 18
- **NextAuth 4** - OAuth + Credentials
- **TanStack React Query 5** - Data fetching
- **Zustand 4** - State management
- **Leaflet + React-Leaflet** - Mapas
- **Tailwind CSS 3** - Estilos
- **Motion 11** - Animaciones
- **TypeScript 5**

### Backend
- **Express 4** + TypeScript
- **MongoDB 6** (driver nativo, sin ORM)
- **Passport.js** - OAuth
- **JWT** - Tokens de sesión
- **Zod** - Validación
- **Helmet** - Seguridad
- **ngeohash** - Geospatial hashing

### APIs Externas
- **MusicBrainz** - Búsqueda de artistas (fuente canónica, 1 req/sec)
- **Spotify** - Enriquecimiento (Client Credentials: imágenes, géneros, popularidad)
- **Ticketmaster** - Descubrimiento de eventos (5 req/sec, caché con TTL)

### Infraestructura (planeada)
- VPS propio (Ubuntu) con Nginx + PM2 + MongoDB + SSL

---

## Modelo de Datos Actual

### Colecciones MongoDB

- **users** - Perfil, ubicación (GeoJSON 2dsphere), preferencias de notificación
- **artists** - MusicBrainz + Spotify, aliases, related artists, caché con TTL
- **events** - Ticketmaster, venue con GeoJSON 2dsphere, inventoryStatus
- **follows** - Relación usuario → artista (unique compound index)
- **notifications** - In-app (new_concert, concert_reminder, tour_announcement)

---

## Próximos Pasos

Ver [Implementation Roadmap](./docs/IMPLEMENTATION_ROADMAP.md) para el plan detallado de sprints.

1. **Completar notificaciones** - Email real + workers activos
2. **Spotify OAuth** - Auto-import de artistas del usuario
3. **Tour Announcements** - Detección automática de giras
4. **Web Scraping** - Festivales europeos
5. **Lanzamiento** - Testing, optimización, deploy VPS

---

**Última actualización:** Marzo 2026
