# BandPulse - Estrategia de Implementación

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Modelo de Datos](#modelo-de-datos)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Fases de Implementación](#fases-de-implementación)
6. [Integraciones y APIs](#integraciones-y-apis)
7. [Despliegue e Infraestructura](#despliegue-e-infraestructura)

---

## Arquitectura General

### Visión Global

```
┌─────────────┐      HTTPS/REST      ┌──────────────┐
│             │ ───────────────────> │              │
│   Frontend  │                      │   Backend    │
│   (Next.js) │ <─────────────────── │   (Node.js)  │
│             │      JSON/WebSocket  │              │
└─────────────┘                      └───────┬──────┘
                                             │
                                             │
                                     ┌───────▼──────┐
                                     │   MongoDB    │
                                     │   Database   │
                                     └──────────────┘
                                             ▲
                                             │
                                     ┌───────┴──────────┐
                                     │  Data Ingestion  │
                                     │  - APIs          │
                                     │  - Scrapers      │
                                     └──────────────────┘
```

### Principios Arquitectónicos

- **Separación de responsabilidades**: Frontend y backend completamente independientes
- **API-first**: El backend expone una API RESTful clara
- **Lazy-loading y caché**: Los datos se obtienen bajo demanda y se cachean en BBDD
- **Cache-first strategy**: Si los datos existen y son recientes (< 1 semana/mes), se sirven desde BBDD
- **Economía de peticiones**: Minimizar llamadas a APIs externas mediante caché inteligente
- **Escalabilidad horizontal**: Componentes stateless donde sea posible
- **Seguridad**: OAuth 2.0, HTTPS, validación de datos
- **Monitoreo pasivo**: Sistema de workers para actualización periódica

---

## Stack Tecnológico

### Frontend: **Next.js 14+ (App Router)**

**Librerías clave:**
- `next-auth` - OAuth y autenticación
- `mapbox-gl` / `leaflet` + `react-leaflet` - Mapas interactivos
- `swr` o `tanstack-query` - Data fetching y caché
- `zustand` o `jotai` - State management ligero
- `tailwindcss` - Estilos

### Backend: **Node.js + Express**

**Estructura:**
```
Node.js 20 LTS
├── Express.js (API REST)
├── TypeScript
├── JWT (tokens de sesión)
└── Módulos:
    ├── Authentication Service
    ├── Artist Service
    ├── Event Service
    ├── Notification Service
    └── Data Ingestion Workers
```

**Librerías clave:**
- `express` - Framework web
- `passport` + `passport-google-oauth20` / `passport-spotify` - OAuth
- `jsonwebtoken` - Manejo de tokens
- `mongodb` (driver nativo) - Sin ORM como solicitado
- `node-cron` o `bull` - Scheduled jobs para scraping
- `axios` - HTTP client para APIs externas
- `cheerio` - Web scraping
- `zod` - Validación de schemas
- `helmet` - Seguridad HTTP headers
- `cors` - CORS configuration
- `winston` - Logging

### Base de Datos: **MongoDB**

**Driver:** MongoDB Node.js Driver nativo (sin Mongoose ni ORM)

### Infraestructura

- **Hosting**: VPS propio (Frontend + Backend + MongoDB)
- **Reverse Proxy**: Nginx (para servir ambos servicios)
- **Base de Datos**: MongoDB self-hosted en VPS
- **SSL**: Let's Encrypt (Certbot)
- **Process Manager**: PM2 (para Node.js)
- **Monitoreo**: PM2 monitoring + logs

---

## Modelo de Datos

### Colecciones MongoDB

#### 1. `users`

```javascript
{
  _id: ObjectId,
  email: String,
  name: String,
  avatar: String,
  oauthProvider: String, // 'google', 'spotify', etc.
  oauthId: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude] // GeoJSON
  },
  radiusKm: Number, // Radio de búsqueda en km
  notificationPreferences: {
    newConcerts: Boolean,
    tourAnnouncements: Boolean,
    concertReminders: Boolean,
    daysBeforeConcert: Number
  },
  createdAt: Date,
  updatedAt: Date
}

// Índices:
// - email (unique)
// - location (2dsphere)
```

#### 2. `artists`

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String, // URL-friendly
  externalIds: {
    spotify: String,
    musicbrainz: String,
    bandsintown: String,
    songkick: String
  },
  imageUrl: String,
  genres: [String],
  verified: Boolean,
  metadata: {
    popularity: Number,
    followerCount: Number
  },
  lastFetchedAt: Date, // Última vez que se obtuvieron datos de APIs externas
  fetchSource: String, // 'spotify', 'bandsintown', etc.
  createdAt: Date,
  updatedAt: Date
}

// Índices:
// - slug (unique)
// - name (text index para búsqueda)
// - externalIds.* (sparse)
// - lastFetchedAt (para cache invalidation)
```

#### 3. `events`

```javascript
{
  _id: ObjectId,
  artistId: ObjectId, // ref a artists
  artistName: String, // desnormalizado para performance
  title: String,
  date: Date,
  endDate: Date, // para festivales multi-día
  venue: {
    name: String,
    address: String,
    city: String,
    country: String,
    location: {
      type: "Point",
      coordinates: [longitude, latitude]
    }
  },
  eventType: String, // 'concert', 'festival', 'tour-stop'
  status: String, // 'announced', 'on-sale', 'sold-out', 'cancelled'
  ticketUrl: String,
  dataSource: String, // 'bandsintown', 'songkick', 'scraped-festival-x'
  externalId: String,
  scrapedData: Object, // metadata adicional del scraping
  createdAt: Date,
  updatedAt: Date,
  lastChecked: Date
}

// Índices:
// - artistId
// - date
// - venue.location (2dsphere)
// - status
// - compound: { artistId: 1, date: 1 }
```

#### 4. `follows`

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  artistId: ObjectId,
  followedAt: Date,
  notificationsEnabled: Boolean
}

// Índices:
// - compound unique: { userId: 1, artistId: 1 }
// - artistId (para queries inversas)
```

#### 5. `notifications`

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  eventId: ObjectId,
  artistId: ObjectId,
  type: String, // 'new-concert', 'tour-announcement', 'reminder'
  title: String,
  message: String,
  read: Boolean,
  sentAt: Date,
  createdAt: Date
}

// Índices:
// - userId
// - compound: { userId: 1, read: 1, createdAt: -1 }
```

---

## Estructura del Proyecto

### Monorepo vs Multi-repo

**Recomendación: Monorepo** con estructura clara

```
band-pulse/
├── README.md
├── IMPLEMENTATION_STRATEGY.md
├── .gitignore
├── docker-compose.yml (desarrollo local)
│
├── frontend/                 # Next.js App
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── app/             # App Router
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── artists/
│   │   │   ├── events/
│   │   │   └── dashboard/
│   │   ├── components/
│   │   │   ├── ui/          # Componentes reutilizables
│   │   │   ├── Map/
│   │   │   ├── ArtistCard/
│   │   │   └── EventList/
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   ├── auth.ts
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   ├── types/
│   │   └── styles/
│   └── public/
│
├── backend/                  # Node.js API
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts         # Entry point
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── oauth.ts
│   │   │   └── env.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── artists.routes.ts
│   │   │   ├── events.routes.ts
│   │   │   ├── users.routes.ts
│   │   │   └── notifications.routes.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── artist.service.ts
│   │   │   ├── event.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── geolocation.service.ts
│   │   ├── repositories/    # Capa de acceso a MongoDB
│   │   │   ├── user.repository.ts
│   │   │   ├── artist.repository.ts
│   │   │   └── event.repository.ts
│   │   ├── workers/
│   │   │   ├── event-sync.worker.ts
│   │   │   ├── scraper.worker.ts
│   │   │   └── notification.worker.ts
│   │   ├── integrations/    # APIs externas
│   │   │   ├── bandsintown.ts
│   │   │   ├── songkick.ts
│   │   │   └── scrapers/
│   │   │       └── festival-scraper.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── types/
│   │   └── utils/
│   └── tests/
│
└── shared/                   # (Opcional) Tipos compartidos
    └── types/
        ├── user.types.ts
        ├── artist.types.ts
        └── event.types.ts
```

---

## Fases de Implementación

La implementación se divide en **7 fases** con documentación detallada individual. Cada fase incluye código completo, configuración paso a paso, y criterios de aceptación claros.

### 📁 [Ver documentación completa de todas las fases](./docs/)

| Fase | Documento | Duración | Objetivo Principal |
|------|-----------|----------|-------------------|
| 0 | [Setup e Infraestructura](./docs/FASE_0_SETUP.md) | 1 semana | Monorepo, Docker, MongoDB, índices geoespaciales |
| 1 | [Autenticación y Usuario](./docs/FASE_1_AUTENTICACION.md) | 2 semanas | OAuth Google, JWT, gestión de usuarios |
| 2 | [Selección de Ubicación](./docs/FASE_2_UBICACION.md) | 1.5 semanas | Mapa interactivo, pin draggable, radio de búsqueda |
| 3 | [Búsqueda y Seguimiento](./docs/FASE_3_ARTISTAS.md) | 2 semanas | Spotify API, **caché lazy-loading**, follows |
| 4 | [Descubrimiento de Eventos](./docs/FASE_4_EVENTOS.md) | 3 semanas | Bandsintown, workers, filtros geoespaciales |
| 5 | [Sistema de Notificaciones](./docs/FASE_5_NOTIFICACIONES.md) | 2 semanas | Notificaciones in-app, recordatorios automáticos |
| 6 | [Web Scraping](./docs/FASE_6_SCRAPING.md) | 2 semanas | Scrapers de festivales europeos |
| 7 | [Lanzamiento](./docs/FASE_7_LANZAMIENTO.md) | 2 semanas | Testing, optimización, despliegue VPS |

**Tiempo total estimado:** ~15.5 semanas (4 meses)

### Características Clave por Fase

- **Fase 3:** Implementación del sistema de **caché lazy-loading** (economía de peticiones a APIs)
- **Fase 4:** Workers periódicos para sincronización automática de eventos
- **Fase 6:** Web scraping ético con rate limiting y manejo de errores
- **Fase 7:** Despliegue completo en VPS con Nginx, PM2 y SSL

---

## Integraciones y APIs

### APIs de Música y Eventos

#### 1. **Bandsintown API**
- **Uso**: Eventos de artistas
- **Ventajas**: Gratuito hasta cierto límite, buena cobertura
- **Datos**: Fechas, venues, ubicaciones
- **Docs**: https://www.bandsintown.com/api

#### 2. **Songkick API**
- **Uso**: Eventos adicionales, mayor cobertura en Europa
- **Nota**: Requiere aplicación para API key
- **Docs**: https://www.songkick.com/developer

#### 3. **Spotify API**
- **Uso**: Búsqueda de artistas, imágenes, popularidad
- **Auth**: Client credentials OAuth
- **Docs**: https://developer.spotify.com/documentation/web-api

#### 4. **Last.fm API** (Opcional)
- **Uso**: Datos adicionales de artistas
- **Docs**: https://www.last.fm/api

### OAuth Providers

1. **Google OAuth 2.0** (prioritario)
2. **Spotify OAuth** (recomendado - permite acceso a gustos musicales)
3. **GitHub OAuth** (opcional)

### Servicios de Mapas

**Recomendación: Mapbox**
- Mejor experiencia de usuario
- Queries geoespaciales en cliente
- Personalización visual
- 50,000 cargas gratis/mes


---

## Despliegue e Infraestructura

### Arquitectura de Despliegue en VPS

```
VPS (Ubuntu 22.04)
├── Nginx (Reverse Proxy + SSL)
│   ├── Port 80/443 → Frontend (Next.js en puerto 3000)
│   └── /api → Backend (Node.js en puerto 3001)
│
├── Frontend: Next.js standalone build
│   └── PM2: ecosystem.config.js
│
├── Backend: Node.js + Express
│   └── PM2: ecosystem.config.js
│
└── MongoDB (localhost:27017)
    └── Data: /var/lib/mongodb
```

### Configuración de Desarrollo

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: bandpulse
      MONGO_INITDB_ROOT_PASSWORD: dev_password
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://bandpulse:dev_password@mongodb:27017/bandpulse
      - JWT_SECRET=dev_secret
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next

volumes:
  mongo_data:
```

### Despliegue a VPS

#### 1. Preparación del Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Instalar PM2
sudo npm install -g pm2

# Instalar Nginx
sudo apt install -y nginx

# Instalar Certbot para SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Configuración de MongoDB

```bash
# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Crear usuario de base de datos
mongosh
> use admin
> db.createUser({
    user: "bandpulse_admin",
    pwd: "<STRONG_PASSWORD>",
    roles: ["readWriteAnyDatabase"]
  })
> use bandpulse
> db.createUser({
    user: "bandpulse_app",
    pwd: "<APP_PASSWORD>",
    roles: ["readWrite"]
  })
```

#### 3. PM2 Ecosystem Config

```javascript
// ecosystem.config.js (raíz del proyecto)
module.exports = {
  apps: [
    {
      name: 'bandpulse-backend',
      cwd: './backend',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'bandpulse-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

#### 4. Nginx Configuration

```nginx
# /etc/nginx/sites-available/bandpulse
server {
    listen 80;
    server_name bandpulse.com www.bandpulse.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

#### 5. Despliegue

```bash
# En el VPS
cd /var/www/bandpulse

# Pull código
git pull origin main

# Instalar dependencias y build
cd backend && npm ci && npm run build
cd ../frontend && npm ci && npm run build

# Restart con PM2
pm2 restart ecosystem.config.js
pm2 save

# Configurar SSL
sudo certbot --nginx -d bandpulse.com -d www.bandpulse.com
```

### Variables de Entorno (VPS)

```bash
# backend/.env.production
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://bandpulse_app:<PASSWORD>@localhost:27017/bandpulse

JWT_SECRET=<STRONG_SECRET>
JWT_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=<ID>
GOOGLE_CLIENT_SECRET=<SECRET>
GOOGLE_CALLBACK_URL=https://bandpulse.com/api/auth/google/callback

# APIs Externas
BANDSINTOWN_API_KEY=<KEY>
SPOTIFY_CLIENT_ID=<ID>
SPOTIFY_CLIENT_SECRET=<SECRET>

# Cache TTL
ARTIST_CACHE_TTL=604800 # 7 días en segundos
EVENT_CACHE_TTL=86400   # 1 día

FRONTEND_URL=https://bandpulse.com
CORS_ORIGINS=https://bandpulse.com
```

```bash
# frontend/.env.production
NEXT_PUBLIC_API_URL=https://bandpulse.com/api
NEXTAUTH_URL=https://bandpulse.com
NEXTAUTH_SECRET=<SECRET>
```

### Estrategia de Caché y Lazy-Loading

#### Flujo de Búsqueda de Artistas

```javascript
// Pseudocódigo del servicio de artistas
async function searchArtist(name) {
  // 1. Buscar en BBDD primero
  const cachedArtist = await db.artists.findOne({ 
    name: new RegExp(name, 'i'),
    lastFetchedAt: { $gte: new Date(Date.now() - ARTIST_CACHE_TTL) }
  });
  
  if (cachedArtist) {
    return cachedArtist; // Cache hit
  }
  
  // 2. Si no existe o está desactualizado, buscar en API externa
  const spotifyData = await spotifyAPI.searchArtist(name);
  
  // 3. Persistir en BBDD
  const artist = await db.artists.updateOne(
    { 'externalIds.spotify': spotifyData.id },
    { 
      $set: {
        name: spotifyData.name,
        imageUrl: spotifyData.images[0]?.url,
        genres: spotifyData.genres,
        lastFetchedAt: new Date(),
        fetchSource: 'spotify',
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );
  
  return artist;
}
```

#### Cache Invalidation Rules

- **Artistas**: Cache válido por 7 días
- **Eventos**: Cache válido por 1 día
- **Seguimientos (follows)**: Sin caché, siempre fresh
- **Notificaciones**: Sin caché

---

## Próximos Pasos

1. **Validar stack y arquitectura** con el equipo
2. **Registrar aplicaciones OAuth** (Google, Spotify)
3. **Obtener API keys** de Bandsintown, Spotify
4. **Preparar VPS** si aún no está disponible
5. **➡️ Iniciar [Fase 0: Setup](./docs/FASE_0_SETUP.md)**

---

## Recursos y Referencias

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)
- [Bandsintown API Docs](https://www.bandsintown.com/api)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- [OAuth 2.0 Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

**Última actualización:** Febrero 2026
