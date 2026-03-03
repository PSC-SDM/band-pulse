# Implementation Roadmap - Pendientes

> Plan de sprints para features nuevas (post-implementación base)

---

## Overview

La implementación base del proyecto (Fases 0-5 parcial) está completada. Este roadmap cubre las features nuevas pendientes.

### Sprints Restantes

```
┌─────────────────┬─────────────────┬─────────────────┬───────────────┐
│  Sprint 1       │  Sprint 2       │  Sprint 3       │  Sprint 4     │
│  ✅ COMPLETADO  │  Spotify OAuth  │  Tour Announce  │  Polish       │
│  UI Cleanup     │  ~22h           │  ~22h           │  ~22h         │
└─────────────────┴─────────────────┴─────────────────┴───────────────┘
```

---

## Sprint 1: Fundamentos UI - COMPLETADO

Items implementados:
- Skeleton components
- EmptyState components
- Alert unificado
- Hover effects simplificados
- Inputs unificados
- EventCard simplificada

---

## Sprint 2: Spotify OAuth (~22h)

**Objetivo**: OAuth con Spotify para auto-import de artistas

**Documento detallado**: [SPOTIFY_OAUTH.md](./SPOTIFY_OAUTH.md)

| # | Tarea | Prioridad | Esfuerzo |
|---|-------|-----------|----------|
| 2.1 | Crear SpotifyOAuthService | P0 | 4h |
| 2.2 | Endpoints /spotify/connect y /callback | P0 | 3h |
| 2.3 | Almacenar tokens encriptados | P0 | 2h |
| 2.4 | Worker de import inicial | P0 | 4h |
| 2.5 | Worker de sync periódico | P1 | 4h |
| 2.6 | UI SpotifyConnect | P0 | 3h |
| 2.7 | Integrar en settings/onboarding | P1 | 2h |

### Entregables

- [ ] OAuth flow completo funcional
- [ ] Tokens encriptados en MongoDB
- [ ] Import worker procesa artistas del usuario
- [ ] Sync worker ejecuta cada 24h
- [ ] UI de conexión en settings

---

## Sprint 3: Tour Announcements (~22h)

**Objetivo**: Detección y notificación de anuncios de giras

**Documento detallado**: [TOUR_ANNOUNCEMENTS.md](./TOUR_ANNOUNCEMENTS.md)

| # | Tarea | Prioridad | Esfuerzo |
|---|-------|-----------|----------|
| 3.1 | TourDetectionService | P0 | 6h |
| 3.2 | Tour entity y repository | P0 | 2h |
| 3.3 | Notificación de tours | P0 | 3h |
| 3.4 | Email template para tours | P1 | 2h |
| 3.5 | TourAnnouncementCard | P0 | 3h |
| 3.6 | Sección en dashboard | P0 | 2h |
| 3.7 | Página de tour details | P2 | 4h |

### Entregables

- [ ] Tour detection con heurística (5+ eventos en cluster)
- [ ] Notificaciones de tours enviadas a followers
- [ ] UI de tour announcements en dashboard
- [ ] Página de tour details

---

## Sprint 4: Polish & Testing (~22h)

| # | Tarea | Prioridad | Esfuerzo |
|---|-------|-----------|----------|
| 4.1 | Micro-interacciones FollowButton | P1 | 3h |
| 4.2 | Onboarding wizard | P2 | 6h |
| 4.3 | Tests E2E Spotify flow | P1 | 4h |
| 4.4 | Tests integración tours | P1 | 3h |
| 4.5 | Documentación API | P2 | 2h |
| 4.6 | Performance audit | P1 | 4h |

### Entregables

- [ ] Micro-interacciones implementadas
- [ ] Onboarding wizard (opcional)
- [ ] Tests E2E y de integración
- [ ] Lighthouse Performance > 90
- [ ] Documentación API

---

## Métricas Target

### UX
| Métrica | Actual | Target |
|---------|--------|--------|
| Time to first follow | ~120s | <30s |
| Onboarding completion | ~60% | >85% |
| Notification click-through | ~15% | >25% |
| Tour notification CTR | - | >30% |

### Technical
| Métrica | Target |
|---------|--------|
| Lighthouse Performance | >90 |
| First Contentful Paint | <1.5s |
| Time to Interactive | <3s |
| Bundle size (main) | <200KB |
