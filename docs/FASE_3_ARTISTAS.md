# Fase 3: Búsqueda y Seguimiento de Artistas

**Duración estimada:** 2 semanas

## Objetivo

Implementar búsqueda de artistas mediante APIs externas (Spotify), sistema de caché lazy-loading, y funcionalidad de seguir/dejar de seguir artistas.

---

## Estrategia de Caché (Lazy-Loading)

**Principio:** Solo se consultan APIs externas cuando:
1. El artista no existe en BBDD, O
2. Los datos tienen más de 7 días (configurable)

**Flujo:**
```
Usuario busca "Metallica"
  ↓
¿Existe en BBDD y lastFetchedAt < 7 días?
  ├─ SÍ → Devolver datos de BBDD (cache hit)
  └─ NO → Consultar Spotify API
              ↓
           Guardar en BBDD
              ↓
           Devolver datos
```

---

## Tareas Backend

### 1. Instalación de Dependencias

```bash
cd backend
npm install axios
```

### 2. Configuración Spotify API

#### Obtener credenciales

1. Ir a [Spotify for Developers](https://developer.spotify.com/dashboard)
2. Crear aplicación "BandPulse"
3. Obtener Client ID y Client Secret

#### Actualizar .env

```bash
# backend/.env
SPOTIFY_CLIENT_ID=tu_spotify_client_id
SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret
```

### 3. Integración con Spotify

#### src/integrations/spotify.ts

```typescript
import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; height: number; width: number }[];
  genres: string[];
  popularity: number;
  followers: { total: number };
}

class SpotifyClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await axios.post<SpotifyTokenResponse>(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
            ).toString('base64')}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000 - 60000; // -1 min margen

      return this.accessToken;
    } catch (error) {
      logger.error('Error getting Spotify token:', error);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  async searchArtists(query: string, limit: number = 10): Promise<SpotifyArtist[]> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          q: query,
          type: 'artist',
          limit,
        },
      });

      return response.data.artists.items;
    } catch (error) {
      logger.error('Error searching Spotify artists:', error);
      throw new Error('Failed to search artists');
    }
  }

  async getArtistById(id: string): Promise<SpotifyArtist> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get(`https://api.spotify.com/v1/artists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting Spotify artist:', error);
      throw new Error('Failed to get artist');
    }
  }
}

export const spotifyClient = new SpotifyClient();
```

### 4. Repositorio de Artistas

#### src/repositories/artist.repository.ts

```typescript
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { env } from '../config/env';

export interface Artist {
  _id?: ObjectId;
  name: string;
  slug: string;
  externalIds: {
    spotify?: string;
  };
  imageUrl?: string;
  genres: string[];
  verified: boolean;
  metadata: {
    popularity: number;
    followerCount: number;
  };
  lastFetchedAt: Date;
  fetchSource: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ArtistRepository {
  private get collection() {
    return getDatabase().collection<Artist>('artists');
  }

  async findBySpotifyId(spotifyId: string): Promise<Artist | null> {
    return this.collection.findOne({ 'externalIds.spotify': spotifyId });
  }

  async findById(id: string): Promise<Artist | null> {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async search(query: string, limit: number = 20): Promise<Artist[]> {
    return this.collection
      .find({ $text: { $search: query } })
      .limit(limit)
      .toArray();
  }

  async upsertFromSpotify(spotifyData: any): Promise<Artist> {
    const now = new Date();
    const slug = this.generateSlug(spotifyData.name);

    const artist: Partial<Artist> = {
      name: spotifyData.name,
      slug,
      externalIds: { spotify: spotifyData.id },
      imageUrl: spotifyData.images[0]?.url,
      genres: spotifyData.genres || [],
      verified: true,
      metadata: {
        popularity: spotifyData.popularity || 0,
        followerCount: spotifyData.followers?.total || 0,
      },
      lastFetchedAt: now,
      fetchSource: 'spotify',
      updatedAt: now,
    };

    const result = await this.collection.findOneAndUpdate(
      { 'externalIds.spotify': spotifyData.id },
      {
        $set: artist,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: 'after' }
    );

    return result!;
  }

  async isCacheValid(artist: Artist): boolean {
    const cacheAge = Date.now() - artist.lastFetchedAt.getTime();
    return cacheAge < env.ARTIST_CACHE_TTL * 1000;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
```

### 5. Servicio de Artistas (con Lazy-Loading)

#### src/services/artist.service.ts

```typescript
import { ArtistRepository, Artist } from '../repositories/artist.repository';
import { spotifyClient } from '../integrations/spotify';
import { logger } from '../utils/logger';

export class ArtistService {
  constructor(private artistRepository: ArtistRepository) {}

  async searchArtists(query: string): Promise<Artist[]> {
    // 1. Buscar primero en BBDD
    const cachedArtists = await this.artistRepository.search(query, 10);

    // 2. Filtrar solo artistas con caché válido
    const validCached = cachedArtists.filter((artist) =>
      this.artistRepository.isCacheValid(artist)
    );

    if (validCached.length > 0) {
      logger.info(`Cache hit: ${validCached.length} artists for query "${query}"`);
      return validCached;
    }

    // 3. Si no hay caché válido, buscar en Spotify
    logger.info(`Cache miss: Fetching from Spotify for query "${query}"`);
    const spotifyResults = await spotifyClient.searchArtists(query, 10);

    // 4. Guardar en BBDD
    const artists = await Promise.all(
      spotifyResults.map((spotifyArtist) =>
        this.artistRepository.upsertFromSpotify(spotifyArtist)
      )
    );

    return artists;
  }

  async getArtistById(artistId: string): Promise<Artist | null> {
    const artist = await this.artistRepository.findById(artistId);

    if (!artist) return null;

    // Si el caché es inválido, refrescar desde Spotify
    if (!this.artistRepository.isCacheValid(artist) && artist.externalIds.spotify) {
      logger.info(`Refreshing artist ${artistId} from Spotify`);
      const spotifyData = await spotifyClient.getArtistById(artist.externalIds.spotify);
      return this.artistRepository.upsertFromSpotify(spotifyData);
    }

    return artist;
  }
}
```

### 6. Repositorio de Follows

#### src/repositories/follow.repository.ts

```typescript
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

export interface Follow {
  _id?: ObjectId;
  userId: ObjectId;
  artistId: ObjectId;
  followedAt: Date;
  notificationsEnabled: boolean;
}

export class FollowRepository {
  private get collection() {
    return getDatabase().collection<Follow>('follows');
  }

  async follow(userId: string, artistId: string): Promise<Follow> {
    const follow: Follow = {
      userId: new ObjectId(userId),
      artistId: new ObjectId(artistId),
      followedAt: new Date(),
      notificationsEnabled: true,
    };

    await this.collection.insertOne(follow);
    return follow;
  }

  async unfollow(userId: string, artistId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({
      userId: new ObjectId(userId),
      artistId: new ObjectId(artistId),
    });

    return result.deletedCount > 0;
  }

  async isFollowing(userId: string, artistId: string): Promise<boolean> {
    const count = await this.collection.countDocuments({
      userId: new ObjectId(userId),
      artistId: new ObjectId(artistId),
    });

    return count > 0;
  }

  async getFollowedArtistIds(userId: string): Promise<string[]> {
    const follows = await this.collection
      .find({ userId: new ObjectId(userId) })
      .toArray();

    return follows.map((f) => f.artistId.toString());
  }
}
```

### 7. Routes

#### src/routes/artists.routes.ts

```typescript
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { ArtistService } from '../services/artist.service';
import { ArtistRepository } from '../repositories/artist.repository';
import { FollowRepository } from '../repositories/follow.repository';

const router = Router();
const artistRepository = new ArtistRepository();
const artistService = new ArtistService(artistRepository);
const followRepository = new FollowRepository();

// Buscar artistas
router.get('/search', authenticate, async (req: AuthRequest, res) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const artists = await artistService.searchArtists(query);
    res.json(artists);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener artista por ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const artist = await artistService.getArtistById(req.params.id);

    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    // Verificar si el usuario sigue al artista
    const isFollowing = await followRepository.isFollowing(
      req.user!.userId,
      req.params.id
    );

    res.json({ ...artist, isFollowing });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seguir artista
router.post('/:id/follow', authenticate, async (req: AuthRequest, res) => {
  try {
    const artist = await artistRepository.findById(req.params.id);
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    const follow = await followRepository.follow(req.user!.userId, req.params.id);
    res.json({ success: true, follow });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dejar de seguir artista
router.delete('/:id/follow', authenticate, async (req: AuthRequest, res) => {
  try {
    const success = await followRepository.unfollow(req.user!.userId, req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Follow not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener artistas seguidos
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const artistIds = await followRepository.getFollowedArtistIds(req.user!.userId);
    
    const artists = await Promise.all(
      artistIds.map((id) => artistRepository.findById(id))
    );

    res.json(artists.filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as artistsRoutes };
```

#### Actualizar src/index.ts

```typescript
// ... imports existentes ...
import { artistsRoutes } from './routes/artists.routes';

// ... middleware ...

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/artists', artistsRoutes); // 👈 Nueva ruta

// ... resto del código ...
```

---

## Tareas Frontend

### 1. Componente de Búsqueda

#### components/ArtistSearch/SearchBar.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface Artist {
  _id: string;
  name: string;
  imageUrl?: string;
  genres: string[];
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    async function search() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/artists/search?q=${encodeURIComponent(debouncedQuery)}`
        );
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Error searching artists:', error);
      } finally {
        setLoading(false);
      }
    }

    search();
  }, [debouncedQuery]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for an artist..."
        className="w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500"
      />

      {loading && (
        <div className="absolute right-3 top-3">
          <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full" />
        </div>
      )}

      {results.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map((artist) => (
            <a
              key={artist._id}
              href={`/dashboard/artists/${artist._id}`}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 transition"
            >
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  🎵
                </div>
              )}
              <div>
                <div className="font-semibold">{artist.name}</div>
                <div className="text-sm text-gray-500">
                  {artist.genres.slice(0, 2).join(', ')}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### hooks/useDebounce.ts

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### 2. Página de Artista

#### app/dashboard/artists/[id]/page.tsx

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function ArtistPage() {
  const params = useParams();
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    async function fetchArtist() {
      const response = await fetch(`/api/artists/${params.id}`);
      const data = await response.json();
      setArtist(data);
      setFollowing(data.isFollowing);
      setLoading(false);
    }

    fetchArtist();
  }, [params.id]);

  const toggleFollow = async () => {
    const method = following ? 'DELETE' : 'POST';
    const response = await fetch(`/api/artists/${params.id}/follow`, { method });

    if (response.ok) {
      setFollowing(!following);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!artist) return <div>Artist not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="relative h-64 bg-gradient-to-br from-purple-600 to-blue-500">
            {artist.imageUrl && (
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">{artist.name}</h1>
                <div className="flex gap-2 mb-4">
                  {artist.genres.slice(0, 3).map((genre: string) => (
                    <span
                      key={genre}
                      className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
                <p className="text-gray-600">
                  {artist.metadata.followerCount.toLocaleString()} followers on Spotify
                </p>
              </div>

              <button
                onClick={toggleFollow}
                className={`px-6 py-3 rounded-lg font-semibold transition ${
                  following
                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            </div>

            {/* Eventos (próxima fase) */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Upcoming Concerts</h2>
              <p className="text-gray-500">No concerts found yet...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. API Routes Frontend

#### app/api/artists/search/route.ts

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get('q');

  const response = await fetch(`${API_URL}/artists/search?q=${query}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  const data = await response.json();
  return NextResponse.json(data);
}
```

---

## Entregables

- ✅ Búsqueda de artistas funcional con autocomplete
- ✅ Sistema de caché lazy-loading (7 días TTL)
- ✅ Usuario puede seguir/dejar de seguir artistas
- ✅ Página de perfil de artista
- ✅ Lista de artistas seguidos
- ✅ Datos persistidos en MongoDB

---

## Siguiente Fase

➡️ **[Fase 4: Descubrimiento de Eventos](./FASE_4_EVENTOS.md)**
