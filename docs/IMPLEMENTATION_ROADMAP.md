# Implementation Roadmap

> Plan de ejecución de 4 sprints (8 semanas) para implementar mejoras UI/UX y nuevas features

---

## Tabla de Contenidos

1. [Overview](#overview)
2. [Sprint 1: Fundamentos UI](#sprint-1-fundamentos-ui)
3. [Sprint 2: Spotify OAuth](#sprint-2-spotify-oauth)
4. [Sprint 3: Tour Announcements](#sprint-3-tour-announcements)
5. [Sprint 4: Polish & Testing](#sprint-4-polish--testing)
6. [Métricas de Éxito](#métricas-de-éxito)

---

## Overview

### Timeline Total

```
┌─────────────────────────────────────────────────────────────────────┐
│                        8 Semanas (4 Sprints)                        │
├─────────────────┬─────────────────┬─────────────────┬───────────────┤
│  Sprint 1       │  Sprint 2       │  Sprint 3       │  Sprint 4     │
│  UI Cleanup     │  Spotify OAuth  │  Tour Announce  │  Polish       │
│  ~15h           │  ~22h           │  ~22h           │  ~22h         │
└─────────────────┴─────────────────┴─────────────────┴───────────────┘
  Week 1-2         Week 3-4         Week 5-6         Week 7-8
```

### Esfuerzo Total Estimado

| Sprint | Horas | Prioridades |
|--------|-------|-------------|
| Sprint 1 | 15h | P0: 9h, P1: 4h, P2: 2h |
| Sprint 2 | 22h | P0: 16h, P1: 6h |
| Sprint 3 | 22h | P0: 14h, P1: 4h, P2: 4h |
| Sprint 4 | 22h | P1: 16h, P2: 6h |
| **Total** | **81h** | ~10 días de trabajo |

### Leyenda de Prioridades

- **P0** (Must Have): Requisitos críticos, afectan funcionalidad core
- **P1** (Should Have): Importantes, mejoran significativamente UX
- **P2** (Nice to Have): Opcionales, pueden postponerse si hay delays

---

## Sprint 1: Fundamentos UI

**Objetivo**: Establecer componentes base reutilizables y mejorar consistencia visual

**Duración**: 2 semanas (Semana 1-2)

### Tasks

| # | Tarea | Prioridad | Esfuerzo | Archivos |
|---|-------|-----------|----------|----------|
| 1.1 | Crear componente Skeleton | P0 | 2h | `components/ui/Skeleton.tsx` |
| 1.2 | Crear componente EmptyState | P0 | 2h | `components/ui/EmptyState.tsx` |
| 1.3 | Crear componente Alert unificado | P1 | 2h | `components/ui/Alert.tsx` |
| 1.4 | Simplificar hover effects | P0 | 3h | `ArtistCard.tsx`, `EventCard.tsx` |
| 1.5 | Unificar inputs login/register | P1 | 2h | `app/login/page.tsx`, `app/register/page.tsx` |
| 1.6 | Simplificar EventCard estructura | P0 | 4h | `components/Events/EventCard.tsx` |

**Subtotal**: 15h

### Detalles de Implementación

#### 1.1 Skeleton Component (P0, 2h)

```typescript
// Frontend: components/ui/Skeleton.tsx

export function ArtistCardSkeleton() { /* ... */ }
export function EventCardSkeleton() { /* ... */ }
export function NotificationSkeleton() { /* ... */ }
```

**Testing**:
- [ ] Visual test de cada variant
- [ ] Verificar animation pulse suave
- [ ] Test en dark mode

#### 1.4 Simplificar Hover Effects (P0, 3h)

**Cambios**:
```tsx
// ANTES
className="hover:-translate-y-1 hover:shadow-2xl hover:border-white/30"

// DESPUÉS
className="hover:border-white/20 transition-colors"
```

**Archivos a modificar**:
- `components/artists/ArtistCard.tsx`
- `components/Events/EventCard.tsx`
- `components/layout/Header.tsx` (nav links)

#### 1.6 Simplificar EventCard (P0, 4h)

**Cambios principales**:
1. Eliminar badge de fecha duplicado
2. Combinar venue + city en una línea
3. Reducir de 2 CTAs a 1
4. Eliminar gradient overlay decorativo

### Entregables Sprint 1

- [ ] 3 componentes UI nuevos en Storybook
- [ ] Hover effects simplificados en todos los cards
- [ ] Inputs unificados en login/register
- [ ] EventCard rediseñada
- [ ] Documentation actualizada en README

### Definition of Done

- [ ] Todos los tests pasan
- [ ] No hay warnings de accessibility
- [ ] Orange no excede 10% en ninguna vista
- [ ] Performance audit: Lighthouse > 85

---

## Sprint 2: Spotify OAuth

**Objetivo**: Implementar conexión OAuth con Spotify para auto-import de artistas

**Duración**: 2 semanas (Semana 3-4)

### Tasks

| # | Tarea | Prioridad | Esfuerzo | Archivos |
|---|-------|-----------|----------|----------|
| 2.1 | Crear SpotifyOAuthService | P0 | 4h | `infrastructure/auth/spotify-oauth.service.ts` |
| 2.2 | Endpoints /spotify/connect y /callback | P0 | 3h | `routes/auth.routes.ts` |
| 2.3 | Almacenar tokens encriptados | P0 | 2h | `user.entity.ts`, `user.repository.ts` |
| 2.4 | Worker de import inicial | P0 | 4h | `workers/spotify-import.worker.ts` |
| 2.5 | Worker de sync periódico | P1 | 4h | `workers/spotify-sync.worker.ts` |
| 2.6 | UI SpotifyConnect | P0 | 3h | `components/spotify/SpotifyConnect.tsx` |
| 2.7 | Integrar en onboarding | P1 | 2h | `app/register/page.tsx` |

**Subtotal**: 22h

### Detalles de Implementación

#### Phase 1: Backend OAuth (2.1-2.3, 9h)

**Setup inicial**:
```bash
# Registrar app en Spotify Developer Dashboard
# https://developer.spotify.com/dashboard

# Añadir a .env
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
SPOTIFY_REDIRECT_URI=https://yourdomain.com/auth/spotify/callback
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

**Endpoints nuevos**:
- `GET /auth/spotify/connect` - Inicia OAuth flow
- `GET /auth/spotify/callback` - Callback tras autorización
- `DELETE /auth/spotify/disconnect` - Desconectar
- `GET /auth/spotify/status` - Estado de conexión

#### Phase 2: Workers (2.4-2.5, 8h)

**Import Worker** (ejecuta una vez tras conexión):
1. Obtener artistas de Spotify (followed + top)
2. Crear/actualizar en MongoDB
3. Auto-follow todos los artistas
4. Notificar al usuario

**Sync Worker** (ejecuta cada 24h):
1. Para cada usuario con Spotify conectado
2. Obtener artistas actuales de Spotify
3. Detectar nuevos follows
4. Auto-follow nuevos artistas
5. Log estadísticas

#### Phase 3: Frontend (2.6-2.7, 5h)

**SpotifyConnect Component**:
- Estados: disconnected, connecting, importing, connected, error
- Mostrar progreso de import
- Botón de disconnect
- Contador de artistas importados

### Testing Sprint 2

```typescript
// Tests críticos

describe('Spotify OAuth Flow', () => {
  it('should complete full OAuth flow', async () => {
    // 1. Iniciar conexión
    const { authUrl } = await GET('/auth/spotify/connect');
    expect(authUrl).toContain('spotify.com/authorize');
    
    // 2. Mock callback
    await GET(`/auth/spotify/callback?code=xxx&state=yyy`);
    
    // 3. Verificar tokens guardados encriptados
    const user = await getUser();
    expect(user.spotifyTokens).toBeDefined();
    
    // 4. Verificar import triggered
    const importJob = await getQueue('artist-import');
    expect(importJob.userId).toBe(user.id);
  });

  it('should refresh expired tokens', async () => {
    // Mock token expirado
    const user = await createUserWithExpiredToken();
    
    // Trigger sync
    await spotifySyncWorker.syncUserArtists(user.id);
    
    // Verificar token refreshed
    const updatedUser = await getUser(user.id);
    expect(updatedUser.spotifyTokens.expiresAt).toBeGreaterThan(Date.now());
  });
});
```

### Entregables Sprint 2

- [ ] OAuth flow completo funcional
- [ ] Tokens encriptados en MongoDB
- [ ] Import worker funcional
- [ ] Sync worker con scheduler
- [ ] UI de conexión integrada en settings
- [ ] Tests E2E del flujo completo
- [ ] Documentation de Spotify API integration

### Definition of Done

- [ ] OAuth flow completo (connect → callback → import)
- [ ] Tokens se encriptan antes de guardar
- [ ] Token refresh automático funciona
- [ ] Import worker procesa >50 artistas sin errores
- [ ] Sync worker ejecuta cada 24h sin fallos
- [ ] UI muestra estados correctamente
- [ ] Tests E2E pasan al 100%

---

## Sprint 3: Tour Announcements

**Objetivo**: Implementar detección y notificación de anuncios de giras

**Duración**: 2 semanas (Semana 5-6)

### Tasks

| # | Tarea | Prioridad | Esfuerzo | Archivos |
|---|-------|-----------|----------|----------|
| 3.1 | TourDetectionService | P0 | 6h | `application/tour/tour-detection.service.ts` |
| 3.2 | Tour entity y repository | P0 | 2h | `domain/tour/`, `repositories/tour.repository.ts` |
| 3.3 | Notificación de tours | P0 | 3h | `notification.service.ts` |
| 3.4 | Email template para tours | P1 | 2h | `email/templates/tour-announcement.html` |
| 3.5 | TourAnnouncementCard | P0 | 3h | `components/tours/TourAnnouncementCard.tsx` |
| 3.6 | Sección en dashboard | P0 | 2h | `app/dashboard/page.tsx` |
| 3.7 | Página de tour details | P2 | 4h | `app/dashboard/tours/[id]/page.tsx` |

**Subtotal**: 22h

### Detalles de Implementación

#### Phase 1: Detección (3.1-3.2, 8h)

**Heurística**:
- 5+ eventos en 60 días
- Máximo 14 días entre shows
- Genera hash para deduplicación

**Algoritmo de clustering**:
```typescript
// Agrupar eventos por proximidad temporal
clusterEventsByProximity(events: Event[]): Event[][] {
  // Ventana deslizante con gap máximo de 14 días
}
```

**Tour name inference**:
1. Extraer substring común de títulos
2. Buscar keyword "tour"
3. Fallback: "{Artist} Tour {Year}"

#### Phase 2: Notificaciones (3.3-3.4, 5h)

**Lógica**:
```typescript
async notifyTourAnnouncement(tour: TourAnnouncement) {
  // 1. Obtener followers del artista
  // 2. Para cada follower:
  //    - Verificar si hay eventos cerca
  //    - Si hay, crear notificación
  //    - Enviar email si opt-in
  // 3. Guardar tour en DB (evitar duplicados)
}
```

**Email template**:
- Hero image del artista
- Tour name destacado
- Lista de fechas cercanas (max 5)
- CTA: "View All Dates"

#### Phase 3: UI (3.5-3.7, 9h)

**TourAnnouncementCard**:
- Card destacada con gradient orange
- Badge "NEW TOUR" animado
- Stats: total shows + nearby shows
- Regions como tags
- CTA prominente

**Dashboard integration**:
- Sección arriba (mayor prioridad que eventos individuales)
- Grid 2 columnas en desktop
- Empty state si no hay tours

**Tour details page**:
- Header con artista info
- Lista cronológica de eventos
- Badge de distancia por evento
- Link a tickets

### Testing Sprint 3

```typescript
describe('Tour Detection', () => {
  it('should detect tour with 5+ clustered events', async () => {
    const events = createTourEvents(6, 10); // 6 events, 10 days apart
    const tour = await tourDetection.detectTourForArtist('artist-id');
    
    expect(tour).toBeDefined();
    expect(tour.eventCount).toBe(6);
    expect(tour.tourName).toContain('Tour');
  });

  it('should not create duplicate notifications', async () => {
    const tour = createTourAnnouncement();
    
    await notificationService.notifyTourAnnouncement(tour);
    await notificationService.notifyTourAnnouncement(tour); // Duplicate
    
    const notifications = await getNotificationsByTour(tour.id);
    expect(notifications.length).toBe(1); // Solo una
  });
});
```

### Entregables Sprint 3

- [ ] Tour detection service funcional
- [ ] Notificaciones de tours enviadas a followers
- [ ] Email template diseñado y enviado
- [ ] UI de tour announcements en dashboard
- [ ] Página de tour details
- [ ] Tests unitarios y de integración
- [ ] MongoDB indexes para tours

### Definition of Done

- [ ] Detecta tours con 5+ eventos correctamente
- [ ] No crea notificaciones duplicadas (hash works)
- [ ] Notifica solo a usuarios con eventos nearby
- [ ] Email se ve bien en Gmail, Outlook, Apple Mail
- [ ] UI card destaca visualmente sobre eventos normales
- [ ] Tour details page muestra todos los eventos
- [ ] Tests pasan al 100%

---

## Sprint 4: Polish & Testing

**Objetivo**: Pulir detalles, testing exhaustivo, documentación, performance

**Duración**: 2 semanas (Semana 7-8)

### Tasks

| # | Tarea | Prioridad | Esfuerzo | Archivos |
|---|-------|-----------|----------|----------|
| 4.1 | Micro-interacciones FollowButton | P1 | 3h | `components/artists/FollowButton.tsx` |
| 4.2 | Onboarding wizard | P2 | 6h | `components/onboarding/` |
| 4.3 | Tests E2E Spotify flow | P1 | 4h | `tests/e2e/spotify.spec.ts` |
| 4.4 | Tests integración tours | P1 | 3h | `tests/integration/tour-detection.test.ts` |
| 4.5 | Documentación API | P2 | 2h | `docs/API.md` |
| 4.6 | Performance audit | P1 | 4h | - |

**Subtotal**: 22h

### Detalles de Implementación

#### 4.1 Micro-interacciones (P1, 3h)

**Follow Button enhancements**:
- Animación pulse al seguir (scale 1 → 1.1 → 1)
- Haptic feedback en mobile (`navigator.vibrate(50)`)
- Optimistic UI update
- Undo toast si error

**CSS animations**:
```css
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

#### 4.2 Onboarding Wizard (P2, 6h)

**3 pasos**:
1. **Connect Spotify** - Auto-import artistas
2. **Set Location** - Para eventos cercanos
3. **Notification Preferences** - Email, frecuencia

**Features**:
- Progress bar visual
- Skip buttons
- Navegación back/next
- Save state en cada paso

#### 4.6 Performance Audit (P1, 4h)

**Checklist**:
- [ ] Lighthouse Performance > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Lazy load images
- [ ] Code splitting por ruta
- [ ] Bundle size < 200KB (main)

**Optimizaciones esperadas**:
- Dynamic imports para modals
- Image optimization (Next.js Image)
- React.memo en componentes pesados
- Debounce en search inputs

### Testing Strategy

#### E2E Tests (Playwright)

```typescript
// tests/e2e/spotify.spec.ts

test('complete Spotify OAuth flow', async ({ page }) => {
  await page.goto('/dashboard/settings');
  
  await page.click('text=Connect Spotify');
  await page.waitForURL('**/accounts.spotify.com/**');
  
  // Mock Spotify authorization
  await mockSpotifyAuth(page);
  
  await page.waitForURL('**/dashboard?spotify=connected');
  expect(await page.textContent('.toast')).toContain('Spotify connected');
});
```

#### Integration Tests

```typescript
// tests/integration/tour-detection.test.ts

describe('Tour Detection Integration', () => {
  it('should detect and notify tour end-to-end', async () => {
    // 1. Create test artist
    const artist = await createTestArtist();
    
    // 2. Create tour-like events
    await seedTourEvents(artist.id, 6);
    
    // 3. Run detection
    const tour = await tourDetection.detectTourForArtist(artist.id);
    
    // 4. Verify tour created
    expect(tour).toBeDefined();
    
    // 5. Verify notifications sent
    const notifications = await getNotifications({ type: 'tour_announcement' });
    expect(notifications.length).toBeGreaterThan(0);
  });
});
```

### Documentation (4.5, 2h)

**docs/API.md**:
- Endpoints de Spotify OAuth
- Endpoints de Tours
- Authentication headers
- Rate limits
- ejemplos con curl

### Entregables Sprint 4

- [ ] Micro-interacciones implementadas
- [ ] Onboarding wizard funcional (opcional)
- [ ] Suite completa de tests E2E
- [ ] Integration tests para tours
- [ ] API documentation
- [ ] Performance optimizations aplicadas
- [ ] Lighthouse score > 90

### Definition of Done

- [ ] Todos los tests (unit + integration + E2E) pasan
- [ ] Code coverage > 80%
- [ ] No accessibility warnings
- [ ] Lighthouse Performance > 90
- [ ] No console errors en producción
- [ ] Documentation completa y actualizada

---

## Métricas de Éxito

### UX Metrics

| Métrica | Baseline | Sprint 2 Target | Sprint 4 Target |
|---------|----------|-----------------|-----------------|
| Time to first follow | ~120s | <30s | <20s |
| Onboarding completion | ~60% | >75% | >85% |
| Daily active users | 100 | 120 (+20%) | 140 (+40%) |
| Notification click-through | ~15% | >20% | >25% |
| Tour notification CTR | - | - | >30% |

### Technical Metrics

| Métrica | Sprint 1 Target | Sprint 4 Target |
|---------|-----------------|-----------------|
| Lighthouse Performance | >85 | >90 |
| First Contentful Paint | <2s | <1.5s |
| Time to Interactive | <4s | <3s |
| Cumulative Layout Shift | <0.15 | <0.1 |
| Bundle size (main) | <250KB | <200KB |

### Business Metrics

| Métrica | Sprint 2 Target | Sprint 4 Target |
|---------|-----------------|-----------------|
| Spotify connection rate | >60% | >70% |
| Average artists per user | >10 | >15 |
| Email open rate (tours) | - | >40% |
| Ticket purchase conversion | - | >5% |

---

## Risk Management

### Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Spotify API rate limits | Media | Alto | Implementar queue + backoff exponencial |
| Token refresh failures | Media | Medio | Retry logic + alertas |
| Tour false positives | Alta | Medio | Tune heurística con feedback |
| Performance regression | Baja | Alto | Lighthouse CI en cada PR |
| Email deliverability | Media | Medio | Usar SendGrid con buen sender score |

### Contingency Plan

Si hay delays:
1. **Priorizar P0 tasks** - Postponer P2
2. **Reducir scope** - Sprint 4 puede ser más pequeño
3. **Simplificar** - Onboarding wizard es nice-to-have

---

## Post-Launch

### Week 9-10: Monitoring & Iteration

- [ ] Setup Sentry error tracking
- [ ] Configure analytics (Mixpanel/Amplitude)
- [ ] Monitor Spotify API rates
- [ ] Collect user feedback
- [ ] Tune tour detection heurística
- [ ] A/B test tour notification copy

### Future Enhancements (Q2 2026)

- [ ] Bandsintown API integration
- [ ] Apple Music integration
- [ ] Push notifications (PWA)
- [ ] Ticket price tracking
- [ ] Artist merch store integration
- [ ] Social features (share concerts con amigos)

---

## Apéndice: Sprint Ceremonies

### Daily Standup (15 min)

1. ¿Qué hice ayer?
2. ¿Qué haré hoy?
3. ¿Hay blockers?

### Sprint Planning (2h al inicio de cada sprint)

1. Review tasks del sprint
2. Estimate esfuerzo
3. Assign tasks
4. Define Definition of Done

### Sprint Review (1h al final de sprint)

1. Demo de features implementadas
2. Collect feedback
3. Update roadmap si necesario

### Sprint Retrospective (1h al final de sprint)

1. ¿Qué fue bien?
2. ¿Qué puede mejorar?
3. Action items para próximo sprint

---

*Última actualización: Marzo 2, 2026*
*Total estimado: 81 horas (~10 días de trabajo)*
