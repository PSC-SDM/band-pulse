# Band-Pulse - Mejoras Pendientes UI/UX

> Mejoras basadas en análisis comparativo con Seated.com

---

## Pendientes

### 1. Spotify OAuth Integration

Ver documento completo: [SPOTIFY_OAUTH.md](./SPOTIFY_OAUTH.md)

**Problema actual**: Band-Pulse usa Client Credentials de Spotify (solo búsqueda). No accede a la biblioteca del usuario.

**Mejora**: Implementar OAuth para auto-importar artistas seguidos del usuario en Spotify.

**Beneficios esperados**:
- Reducir time to first follow de ~120s a <30s
- Incrementar onboarding completion de ~60% a >85%

---

### 2. Tour Announcements

Ver documento completo: [TOUR_ANNOUNCEMENTS.md](./TOUR_ANNOUNCEMENTS.md)

**Problema actual**: El tipo `tour_announcement` existe en el código pero no hay lógica de detección.

**Mejora**: Detectar automáticamente giras (5+ eventos en cluster) y notificar con UI destacada.

---

### 3. Onboarding Wizard

Crear wizard de 3 pasos para nuevos usuarios:

```
Step 1: Connect Spotify → Importar artistas automáticamente
Step 2: Set Location → Para eventos cercanos
Step 3: Notification Prefs → Configurar alertas
```

**Archivos nuevos**:
- `frontend/components/onboarding/OnboardingWizard.tsx`
- `frontend/components/onboarding/StepSpotify.tsx`
- `frontend/components/onboarding/StepLocation.tsx`
- `frontend/components/onboarding/StepNotifications.tsx`

---

### 4. Micro-interacciones en FollowButton

Mejorar feedback visual al seguir/dejar de seguir:

- Animación pulse al seguir (scale 1 → 1.1 → 1)
- Haptic feedback en mobile (`navigator.vibrate(50)`)
- Optimistic UI update
- Toast de undo si hay error

---

### 5. Simplificar Footer

Reducir de 4 columnas a 2, eliminar links redundantes.

---

## Ya Implementado (referencia)

Estos items ya están hechos y no requieren más trabajo:

- Skeleton components (ArtistCardSkeleton, EventCardSkeleton)
- EmptyState component con iconos y CTAs
- Alert component unificado (error, warning, success, info)
- Simplificación de hover effects en cards
- Paleta de 5 colores restrictiva
- Tipografía tripartita (Space Mono, Instrument Sans, Archivo Black)
- Border radius hierarchy
- Z-index layers

---

## Principios de Diseño a Mantener

### Paleta de Colores
```
Night       #000000   Fondos secundarios
Prussian B. #14213D   Fondos primarios dark mode
White       #FFFFFF   Contenido, legibilidad
Alabaster   #E5E5E5   Separación, neutralidad
Orange      #FCA311   CTAs, notificaciones (≤10%)
```

### Tipografía
- **Display**: Space Mono (labels)
- **Body**: Instrument Sans (texto principal)
- **Accent**: Archivo Black (títulos)

### Border Radius
`32px → 28px → 20px → 14-16px → 10-12px → 8px`
