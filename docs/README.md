# BandPulse - Índice de Fases de Implementación

Esta carpeta contiene la documentación detallada de cada fase de implementación del proyecto BandPulse.

---

## 📋 Resumen de Fases

| Fase | Nombre | Duración | Descripción |
|------|--------|----------|-------------|
| [0](./FASE_0_SETUP.md) | Setup e Infraestructura | 1 semana | Configuración inicial del proyecto, estructura de carpetas, Docker, MongoDB |
| [1](./FASE_1_AUTENTICACION.md) | Autenticación y Usuario | 2 semanas | OAuth con Google, JWT, gestión de usuarios |
| [2](./FASE_2_UBICACION.md) | Selección de Ubicación | 1.5 semanas | Mapa interactivo con Leaflet, chincheta draggable, radio de búsqueda |
| [3](./FASE_3_ARTISTAS.md) | Búsqueda y Seguimiento | 2 semanas | Búsqueda con Spotify API, sistema de caché lazy-loading, follows |
| [4](./FASE_4_EVENTOS.md) | Descubrimiento de Eventos | 3 semanas | Integración Bandsintown, workers periódicos, filtros geoespaciales |
| [5](./FASE_5_NOTIFICACIONES.md) | Sistema de Notificaciones | 2 semanas | Notificaciones in-app, recordatorios, detección de cambios |
| [6](./FASE_6_SCRAPING.md) | Web Scraping | 2 semanas | Scrapers de festivales (Primavera Sound, FIB, etc.) |
| [7](./FASE_7_LANZAMIENTO.md) | Refinamiento y Lanzamiento | 2 semanas | Testing, optimización, seguridad, despliegue en VPS |

**Tiempo total estimado:** 15.5 semanas (~4 meses)

---

## 🎯 Cómo usar esta documentación

### Para Desarrolladores

1. **Lee la fase completa** antes de empezar a codificar
2. **Sigue el orden** de las tareas dentro de cada fase
3. **Marca los checkboxes** conforme completes entregables
4. **Adapta el código** a las necesidades específicas del proyecto

### Para Project Managers

1. Usa las estimaciones de tiempo para planificación
2. Los entregables son hitos verificables
3. Cada fase es relativamente independiente
4. Puedes paralelizar frontend/backend si tienes equipo

---

## 🔑 Conceptos Clave

### Lazy-Loading y Caché

La estrategia principal del proyecto es **economizar peticiones a APIs externas**:

```
Usuario busca "Metallica"
  ↓
¿Existe en BBDD y es reciente (< 7 días)?
  ├─ SÍ → Servir desde caché (rápido, gratis)
  └─ NO → Consultar API externa → Guardar en BBDD
```

**Ventajas:**
- Reduce costos de APIs
- Mejora performance
- Funciona offline para datos cacheados
- Escalable sin límites de rate

### Arquitectura de Workers

El sistema usa **workers periódicos** para mantener datos actualizados:

- **Event Sync Worker:** Cada 6 horas busca nuevos eventos
- **Notification Worker:** Cada hora detecta cambios y envía notificaciones
- **Scraper Worker:** Diariamente scrapea festivales
- **Reminder Worker:** Diariamente envía recordatorios

### Queries Geoespaciales

MongoDB con índices `2dsphere` permite buscar eventos cerca del usuario:

```javascript
db.events.find({
  'venue.location': {
    $near: {
      $geometry: { type: 'Point', coordinates: [lng, lat] },
      $maxDistance: 50000 // 50 km
    }
  }
})
```

---

## 📦 Stack Tecnológico Completo

### Backend
- Node.js 20 LTS + Express + TypeScript
- MongoDB (driver nativo, sin ORM)
- Passport.js (OAuth)
- node-cron (scheduled jobs)
- cheerio (web scraping)
- winston (logging)

### Frontend
- Next.js 14 (App Router)
- React + TypeScript
- Leaflet (mapas)
- NextAuth (autenticación)
- TailwindCSS (estilos)
- Tanstack Query (data fetching)

### Infraestructura
- VPS propio (Ubuntu)
- Nginx (reverse proxy)
- PM2 (process manager)
- MongoDB self-hosted
- Let's Encrypt (SSL)

### APIs Externas
- Spotify API (búsqueda de artistas)
- Bandsintown API (eventos)
- Google OAuth (autenticación)
- OpenStreetMap (mapas)

---

## 🚀 Inicio Rápido

### 1. Clonar y configurar

```bash
git clone <repository>
cd band-pulse

# Configurar variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# Editar con tus credenciales
nano backend/.env
nano frontend/.env.local
```

### 2. Iniciar desarrollo

```bash
# Iniciar MongoDB con Docker
docker-compose up -d

# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### 3. Acceder

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- MongoDB: mongodb://localhost:27017

---

## 📚 Recursos Adicionales

### Documentación Oficial

- [Next.js Docs](https://nextjs.org/docs)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)
- [Leaflet Docs](https://leafletjs.com/)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Bandsintown API](https://www.bandsintown.com/api/overview)

### Tutoriales Recomendados

- OAuth 2.0 flow con Passport.js
- MongoDB geospatial queries
- Web scraping ético con cheerio
- Next.js App Router y Server Components

---

## 🤝 Contribución

Si estás trabajando en equipo:

1. Crea una rama por fase: `git checkout -b fase-1-auth`
2. Commit frecuente con mensajes descriptivos
3. Pull request al completar entregables
4. Code review antes de merge a `main`

---

## 📞 Soporte

Para dudas sobre una fase específica, consulta:

1. El archivo de la fase correspondiente
2. Los comentarios en el código de ejemplo
3. La documentación oficial de las librerías

---

**Última actualización:** Febrero 2026

**Versión:** 1.0
