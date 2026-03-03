# Fase 5: Sistema de Notificaciones - Pendientes

## Estado Actual

Ya implementado:
- Notificaciones in-app (crear, listar, marcar como leídas)
- NotificationBell con contador de no leídas
- Preferencias de notificaciones (tipos, timing, VIP filter)
- Endpoints REST completos (`/api/notifications`)
- Modelo de datos y repositorio en MongoDB

---

## Pendiente

### 1. Activar envío real de emails

El `EmailService` existe como stub. Falta:

- Integrar con un proveedor de email (SendGrid, Resend, etc.)
- Crear templates HTML para:
  - `new_concert` - Nuevo concierto de artista seguido
  - `concert_reminder` - Recordatorio X días antes del concierto
  - `tour_announcement` - Anuncio de gira (ver [TOUR_ANNOUNCEMENTS.md](./TOUR_ANNOUNCEMENTS.md))
- Respetar las preferencias del usuario (`notificationPreferences.emailNotifications`)

### 2. Activar workers de notificación en background

El scheduler (`infrastructure/scheduler.ts`) está inicializado pero los jobs de notificación no están completamente activos:

- **Detección de nuevos eventos**: Tras el event sync, detectar eventos nuevos y notificar a followers con eventos en su radio
- **Recordatorios de conciertos**: Job diario que busca eventos dentro de los próximos N días (según `daysBeforeConcert` del usuario) y envía recordatorio si no se ha enviado ya
- **Deduplicación**: Verificar que no se envíen notificaciones duplicadas para el mismo evento/usuario

### 3. Tour Announcement trigger

Ver documento completo: [TOUR_ANNOUNCEMENTS.md](./TOUR_ANNOUNCEMENTS.md)

El tipo `tour_announcement` existe en el enum de notificaciones pero no hay lógica de detección. Requiere implementar el `TourDetectionService` para detectar patrones de gira (5+ eventos en cluster temporal).

---

## Archivos relevantes

- `backend/src/application/notification/notification.service.ts`
- `backend/src/infrastructure/email/email.service.ts` (stub)
- `backend/src/infrastructure/scheduler.ts`
- `backend/src/infrastructure/workers/`
- `frontend/components/notifications/NotificationBell.tsx`
