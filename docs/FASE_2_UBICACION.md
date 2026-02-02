# Fase 2: Selección de Ubicación

**Duración estimada:** 1.5 semanas

## Objetivo

Permitir al usuario seleccionar su ubicación en un mapa interactivo mediante una chincheta (pin) y definir su radio de búsqueda.

---

## Stack de Mapas

**Opción elegida: Leaflet + React-Leaflet**
- ✅ Completamente gratuito
- ✅ Open Source
- ✅ Ligero y rápido
- ✅ Compatible con OpenStreetMap

*(Alternativa: Mapbox - mejor UX pero limitado a 50k cargas/mes)*

---

## Tareas Frontend

### 1. Instalación de Dependencias

```bash
cd frontend
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

### 2. Setup CSS de Leaflet

#### app/globals.css

```css
/* ... código existente ... */

/* Leaflet CSS */
@import 'leaflet/dist/leaflet.css';

/* Fix para iconos de Leaflet en Next.js */
.leaflet-default-icon-path {
  background-image: url('https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png');
}
```

### 3. Componente de Mapa

#### components/Map/LocationPicker.tsx

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para iconos en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationPickerProps {
  initialPosition?: [number, number]; // [lat, lng]
  initialRadius?: number; // en km
  onLocationChange: (lat: number, lng: number, radius: number) => void;
}

function DraggableMarker({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number]; 
  onPositionChange: (pos: [number, number]) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const newPos = marker.getLatLng();
        onPositionChange([newPos.lat, newPos.lng]);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

export default function LocationPicker({
  initialPosition = [40.4168, -3.7038], // Madrid por defecto
  initialRadius = 50,
  onLocationChange,
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>(initialPosition);
  const [radius, setRadius] = useState(initialRadius);

  useEffect(() => {
    onLocationChange(position[0], position[1], radius);
  }, [position, radius, onLocationChange]);

  const handlePositionChange = (newPos: [number, number]) => {
    setPosition(newPos);
  };

  return (
    <div className="space-y-4">
      {/* Mapa */}
      <div className="relative h-[500px] w-full rounded-lg overflow-hidden shadow-lg">
        <MapContainer
          center={position}
          zoom={10}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Marcador draggable */}
          <DraggableMarker 
            position={position} 
            onPositionChange={handlePositionChange}
          />
          
          {/* Círculo de radio */}
          <Circle
            center={position}
            radius={radius * 1000} // convertir km a metros
            pathOptions={{
              color: '#8b5cf6',
              fillColor: '#8b5cf6',
              fillOpacity: 0.2,
            }}
          />
        </MapContainer>
      </div>

      {/* Controles */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Radius: {radius} km
          </label>
          <input
            type="range"
            min="5"
            max="500"
            step="5"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5 km</span>
            <span>500 km</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Latitude</label>
            <input
              type="number"
              value={position[0].toFixed(6)}
              readOnly
              className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Longitude</label>
            <input
              type="number"
              value={position[1].toFixed(6)}
              readOnly
              className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50"
            />
          </div>
        </div>

        <p className="text-sm text-gray-600 italic">
          💡 Drag the pin to change your location
        </p>
      </div>
    </div>
  );
}
```

### 4. Página de Configuración de Ubicación

#### app/dashboard/settings/location/page.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Importar dinámicamente para evitar SSR issues
const LocationPicker = dynamic(
  () => import('@/components/Map/LocationPicker'),
  { ssr: false, loading: () => <p>Loading map...</p> }
);

export default function LocationSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Cargar datos actuales del usuario
    async function fetchUserData() {
      const response = await fetch('/api/user/me');
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    }

    if (status === 'authenticated') {
      fetchUserData();
    }
  }, [status]);

  const handleLocationChange = async (lat: number, lng: number, radius: number) => {
    // Guardar temporalmente sin hacer request en cada cambio
    setUserData((prev: any) => ({
      ...prev,
      location: { type: 'Point', coordinates: [lng, lat] },
      radiusKm: radius,
    }));
  };

  const handleSave = async () => {
    if (!userData) return;

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/user/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          longitude: userData.location.coordinates[0],
          latitude: userData.location.coordinates[1],
          radiusKm: userData.radiusKm,
        }),
      });

      if (response.ok) {
        setMessage('✅ Location saved successfully!');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setMessage('❌ Error saving location');
      }
    } catch (error) {
      setMessage('❌ Error saving location');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || !userData) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const currentPosition: [number, number] = userData.location
    ? [userData.location.coordinates[1], userData.location.coordinates[0]]
    : [40.4168, -3.7038]; // Madrid por defecto

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Set Your Location</h1>
          <p className="mt-2 text-gray-600">
            Choose your location and search radius to discover concerts near you
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <LocationPicker
            initialPosition={currentPosition}
            initialRadius={userData.radiusKm || 50}
            onLocationChange={handleLocationChange}
          />

          {message && (
            <div className={`mt-4 p-3 rounded-lg ${
              message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Location'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5. API Route para actualizar ubicación

#### app/api/user/me/route.ts

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### app/api/user/location/route.ts

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    const response = await fetch(`${API_URL}/users/me/location`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 6. Añadir link en Dashboard

#### app/dashboard/page.tsx (actualización)

```typescript
// ... código existente ...

<main className="mx-auto max-w-7xl px-4 py-8">
  <h2 className="text-2xl font-bold mb-4">Welcome, {session?.user?.name}!</h2>
  
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {/* Card de ubicación */}
    <a 
      href="/dashboard/settings/location"
      className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Set Location</h3>
      </div>
      <p className="text-gray-600 text-sm">Choose your location and search radius</p>
    </a>

    {/* Más cards aquí... */}
  </div>
</main>
```

---

## Tareas Backend

El endpoint ya está implementado en Fase 1:
- ✅ `PATCH /api/users/me/location`

### Verificar índice geoespacial

```bash
mongosh bandpulse
> db.users.getIndexes()
# Debe existir: { location: "2dsphere" }
```

---

## Testing

### 1. Test funcional

1. Login en la aplicación
2. Ir a `/dashboard/settings/location`
3. Arrastrar el pin a una nueva ubicación
4. Ajustar el slider de radio
5. Click en "Save Location"
6. Verificar que se guarda correctamente

### 2. Test backend

```bash
# Verificar que la ubicación se guardó con GeoJSON correcto
mongosh bandpulse
> db.users.findOne({ email: "tu@email.com" })

# Debe tener:
# location: { type: "Point", coordinates: [lng, lat] }
# radiusKm: <número>
```

### 3. Test de queries geoespaciales

```bash
mongosh bandpulse
> db.users.find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [-3.7038, 40.4168] },
        $maxDistance: 50000  // 50 km en metros
      }
    }
  })
```

---

## Mejoras Opcionales

### Geolocalización automática

```typescript
// Añadir botón "Use my current location"
function useCurrentLocation(onSuccess: (lat: number, lng: number) => void) {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSuccess(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  }
}
```

### Búsqueda de ciudades

```typescript
// Integrar Nominatim (OpenStreetMap) para buscar ciudades
async function searchCity(query: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5`
  );
  return response.json();
}
```

---

## Entregables

- ✅ Usuario puede seleccionar ubicación con chincheta draggable
- ✅ Usuario puede definir radio de búsqueda (5-500 km)
- ✅ Visualización del área de búsqueda en el mapa
- ✅ Datos guardados en MongoDB con formato GeoJSON
- ✅ Índice 2dsphere creado para queries geoespaciales

---

## Siguiente Fase

➡️ **[Fase 3: Búsqueda y Seguimiento de Artistas](./FASE_3_ARTISTAS.md)**
