# Spotify OAuth Integration

> Plan completo de implementación de OAuth con Spotify para auto-import de artistas

---

## Tabla de Contenidos

1. [Comparación: Seated vs Band-Pulse](#comparación-seated-vs-band-pulse)
2. [Flujo OAuth Propuesto](#flujo-oauth-propuesto)
3. [Implementación Backend](#implementación-backend)
4. [Implementación Frontend](#implementación-frontend)
5. [Background Sync Worker](#background-sync-worker)
6. [Security & Best Practices](#security--best-practices)

---

## Comparación: Seated vs Band-Pulse

### Flujo Visual Comparativo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SEATED (OAuth Flow)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Usuario ──► "Connect Spotify" ──► OAuth Consent ──► Access Token       │
│                                                           │             │
│                                     ┌─────────────────────┘             │
│                                     ▼                                   │
│                          Spotify API (user library)                     │
│                                     │                                   │
│                    ┌────────────────┼────────────────┐                  │
│                    ▼                ▼                ▼                  │
│              Top Artists    Followed Artists    Saved Tracks            │
│                    │                │                │                  │
│                    └────────────────┼────────────────┘                  │
│                                     ▼                                   │
│                         Auto-import al registro                         │
│                                     │                                   │
│              ┌──────────────────────┼──────────────────────┐            │
│              ▼                      ▼                      ▼            │
│       Seguir artistas        Crear alertas          Sync periódico      │
│       automáticamente        de conciertos          (nuevos follows)    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    BAND-PULSE ACTUAL (Client Credentials)               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Usuario ──► Búsqueda manual ──► Spotify Search API ──► Resultados      │
│                                                              │          │
│                                                              ▼          │
│                                                     Usuario elige       │
│                                                     manualmente         │
│                                                                         │
│  ❌ Sin acceso a biblioteca del usuario                                 │
│  ❌ Sin auto-import de artistas                                         │
│  ❌ Sin sync periódico                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Ventajas de OAuth

| Aspecto | Band-Pulse Actual | Con OAuth |
|---------|-------------------|-----------|
| **Time to first follow** | ~120s (búsqueda manual) | <30s (auto-import) |
| **Onboarding friction** | Alta (requiere trabajo) | Baja (un click) |
| **Descubrimiento** | Solo búsqueda activa | Pasivo + automático |
| **Retention** | Usuario debe volver a seguir | Sync automático |
| **Engagement** | Usuario busca cada artista | Artistas aparecen solos |

### Por qué Seated es Mejor

1. **Fricción cero**: Usuario conecta Spotify una vez, artistas aparecen solos
2. **Descubrimiento pasivo**: Detecta nuevos follows en Spotify automáticamente
3. **Datos ricos**: Acceso a top artists por tiempo de escucha
4. **Retention**: Usuario no tiene que "trabajar" para configurar alertas

---

## Flujo OAuth Propuesto

### Diagrama de Secuencia

```
Usuario          Frontend       Backend        Spotify API      Redis       MongoDB
  │                │              │                │             │            │
  │  [Connect      │              │                │             │            │
  │   Spotify]     │              │                │             │            │
  │───────────────►│              │                │             │            │
  │                │              │                │             │            │
  │                │  GET /auth/  │                │             │            │
  │                │  spotify/    │                │             │            │
  │                │  connect     │                │             │            │
  │                │─────────────►│                │             │            │
  │                │              │                │             │            │
  │                │              │  Generate state│             │            │
  │                │              │  (random UUID) │             │            │
  │                │              │────────────────┤             │            │
  │                │              │                │             │            │
  │                │              │  Store state + userId        │            │
  │                │              │──────────────────────────────►│            │
  │                │              │                │             │            │
  │                │   authUrl    │                │             │            │
  │                │◄─────────────│                │             │            │
  │                │              │                │             │            │
  │  Redirect to   │              │                │             │            │
  │  Spotify Auth  │              │                │             │            │
  │◄───────────────│              │                │             │            │
  │                │              │                │             │            │
  │  [User grants  │              │                │             │            │
  │   permissions] │              │                │             │            │
  │                │              │                │             │            │
  │  Redirect to   │              │                │             │            │
  │  /callback     │              │                │             │            │
  │  ?code=xxx     │              │                │             │            │
  │  &state=yyy    │              │                │             │            │
  │────────────────┼─────────────►│                │             │            │
  │                │              │                │             │            │
  │                │              │  Validate state│             │            │
  │                │              │◄───────────────────────────────           │
  │                │              │                │             │            │
  │                │              │  Exchange code │             │            │
  │                │              │  for tokens    │             │            │
  │                │              │───────────────►│             │            │
  │                │              │                │             │            │
  │                │              │  Access Token  │             │            │
  │                │              │  Refresh Token │             │            │
  │                │              │◄───────────────│             │            │
  │                │              │                │             │            │
  │                │              │  Encrypt & save tokens       │            │
  │                │              │──────────────────────────────────────────►│
  │                │              │                │             │            │
  │                │              │  Queue artist import job     │            │
  │                │              │──────────────────────────────►│            │
  │                │              │                │             │            │
  │  Redirect to   │              │                │             │            │
  │  dashboard     │              │                │             │            │
  │◄───────────────┴──────────────│                │             │            │
  │                                                                            │
  │  [Background Worker starts]                                               │
  │                                                                            │
  │                                   Get user    │             │            │
  │                                   artists     │             │            │
  │                                  ────────────►│             │            │
  │                                                                            │
  │                                   Artist list │             │            │
  │                                  ◄────────────│             │            │
  │                                                                            │
  │                                   Create/update artists      │            │
  │                                  ────────────────────────────────────────►│
  │                                                                            │
  │                                   Auto-follow │             │            │
  │                                  ────────────────────────────────────────►│
```

### Estados de Conexión

```tsx
type SpotifyConnectionState = 
  | 'disconnected'    // No conectado
  | 'connecting'      // Autorizando en Spotify
  | 'importing'       // Importando artistas
  | 'connected'       // Conectado y sincronizado
  | 'error';          // Error en algún paso
```

---

## Implementación Backend

### Fase 1: Spotify OAuth Service

```typescript
// Nuevo archivo: backend/src/infrastructure/auth/spotify-oauth.service.ts

import SpotifyWebApi from 'spotify-web-api-node';
import crypto from 'crypto';

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SpotifyArtist {
  spotifyId: string;
  name: string;
  imageUrl?: string;
  genres: string[];
  popularity: number;
  followerCount?: number;
}

export class SpotifyOAuthService {
  private spotify: SpotifyWebApi;
  
  constructor() {
    this.spotify = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI!
    });
  }

  /**
   * Generar URL de autorización de Spotify
   * @param state - Token CSRF único
   */
  getAuthUrl(state: string): string {
    const scopes = [
      'user-follow-read',      // Artistas seguidos
      'user-top-read',         // Top artists por listening time
      'user-library-read'      // Saved tracks (para extraer artistas)
    ];
    
    return this.spotify.createAuthorizeURL(scopes, state);
  }

  /**
   * Intercambiar authorization code por tokens
   */
  async exchangeCode(code: string): Promise<SpotifyTokens> {
    try {
      const data = await this.spotify.authorizationCodeGrant(code);
      
      return {
        accessToken: data.body.access_token,
        refreshToken: data.body.refresh_token,
        expiresAt: Date.now() + (data.body.expires_in * 1000)
      };
    } catch (error) {
      throw new Error(`Failed to exchange Spotify code: ${error.message}`);
    }
  }

  /**
   * Refrescar access token usando refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
    try {
      this.spotify.setRefreshToken(refreshToken);
      const data = await this.spotify.refreshAccessToken();
      
      return {
        accessToken: data.body.access_token,
        refreshToken: refreshToken, // Spotify no devuelve nuevo refresh token
        expiresAt: Date.now() + (data.body.expires_in * 1000)
      };
    } catch (error) {
      throw new Error(`Failed to refresh Spotify token: ${error.message}`);
    }
  }

  /**
   * Obtener artistas del usuario desde múltiples fuentes
   */
  async getUserArtists(accessToken: string): Promise<SpotifyArtist[]> {
    this.spotify.setAccessToken(accessToken);
    
    try {
      // Obtener datos de múltiples endpoints en paralelo
      const [followed, topShort, topMedium, topLong] = await Promise.all([
        this.getFollowedArtists(),
        this.getTopArtists('short_term'),   // Último mes
        this.getTopArtists('medium_term'),  // Últimos 6 meses
        this.getTopArtists('long_term')     // Todo el tiempo
      ]);

      // Merge y deduplicate usando Map
      const artistMap = new Map<string, SpotifyArtist>();
      
      const allArtists = [
        ...followed,
        ...topShort,
        ...topMedium,
        ...topLong
      ];

      allArtists.forEach(artist => {
        if (!artistMap.has(artist.spotifyId)) {
          artistMap.set(artist.spotifyId, artist);
        }
      });

      return Array.from(artistMap.values());
    } catch (error) {
      throw new Error(`Failed to get user artists: ${error.message}`);
    }
  }

  /**
   * Obtener artistas seguidos por el usuario
   */
  private async getFollowedArtists(): Promise<SpotifyArtist[]> {
    const artists: SpotifyArtist[] = [];
    let after: string | undefined;
    
    try {
      do {
        const response = await this.spotify.getFollowedArtists({ 
          limit: 50, 
          after 
        });
        
        const items = response.body.artists.items;
        artists.push(...items.map(this.mapSpotifyArtist));
        
        after = response.body.artists.cursors?.after;
      } while (after);
      
      return artists;
    } catch (error) {
      console.error('Failed to get followed artists:', error);
      return [];
    }
  }

  /**
   * Obtener top artists del usuario por periodo
   */
  private async getTopArtists(timeRange: 'short_term' | 'medium_term' | 'long_term'): Promise<SpotifyArtist[]> {
    try {
      const response = await this.spotify.getMyTopArtists({ 
        limit: 50, 
        time_range: timeRange 
      });
      
      return response.body.items.map(this.mapSpotifyArtist);
    } catch (error) {
      console.error(`Failed to get top artists (${timeRange}):`, error);
      return [];
    }
  }

  /**
   * Mapper: Spotify API Artist → Domain Artist
   */
  private mapSpotifyArtist(artist: any): SpotifyArtist {
    return {
      spotifyId: artist.id,
      name: artist.name,
      imageUrl: artist.images[0]?.url,
      genres: artist.genres || [],
      popularity: artist.popularity || 0,
      followerCount: artist.followers?.total
    };
  }
}
```

### Fase 2: Endpoints HTTP

```typescript
// Añadir a: backend/src/interfaces/http/routes/auth.routes.ts

import { Router } from 'express';
import { SpotifyOAuthService } from '../../infrastructure/auth/spotify-oauth.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { RedisClient } from '../../infrastructure/cache/redis.client';
import { UserService } from '../../application/user/user.service';
import { ArtistImportQueue } from '../../infrastructure/queues/artist-import.queue';

const router = Router();
const spotifyOAuth = new SpotifyOAuthService();
const redis = new RedisClient();
const userService = new UserService();
const importQueue = new ArtistImportQueue();

/**
 * GET /auth/spotify/connect
 * Inicia el flujo OAuth de Spotify
 */
router.get('/spotify/connect', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const state = crypto.randomUUID();
    
    // Guardar state en Redis con TTL de 10 minutos
    await redis.set(`spotify:state:${state}`, userId, 600);
    
    const authUrl = spotifyOAuth.getAuthUrl(state);
    
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate Spotify connection' });
  }
});

/**
 * GET /auth/spotify/callback
 * Callback de Spotify tras autorización
 */
router.get('/spotify/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    // Usuario canceló la autorización
    if (error) {
      return res.redirect('/dashboard?spotify=cancelled');
    }
    
    if (!code || !state) {
      return res.redirect('/dashboard?spotify=error');
    }
    
    // Validar state (prevenir CSRF)
    const userId = await redis.get(`spotify:state:${state}`);
    if (!userId) {
      return res.redirect('/dashboard?spotify=invalid');
    }
    
    // Eliminar state usado
    await redis.del(`spotify:state:${state}`);
    
    // Intercambiar code por tokens
    const tokens = await spotifyOAuth.exchangeCode(code as string);
    
    // Guardar tokens encriptados en MongoDB
    await userService.saveSpotifyTokens(userId, tokens);
    
    // Encolar job de import de artistas (async)
    await importQueue.add({ userId });
    
    // Redirect al dashboard con success
    res.redirect('/dashboard?spotify=connected');
  } catch (error) {
    console.error('Spotify callback error:', error);
    res.redirect('/dashboard?spotify=error');
  }
});

/**
 * DELETE /auth/spotify/disconnect
 * Desconectar cuenta de Spotify
 */
router.delete('/spotify/disconnect', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await userService.removeSpotifyTokens(userId);
    
    res.json({ message: 'Spotify disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect Spotify' });
  }
});

/**
 * GET /auth/spotify/status
 * Estado de conexión con Spotify
 */
router.get('/spotify/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userService.findById(userId);
    
    const isConnected = !!user.spotifyTokens?.accessToken;
    const importStatus = await importQueue.getStatus(userId);
    
    res.json({ 
      connected: isConnected,
      importing: importStatus === 'active',
      artistCount: user.followedArtistsCount || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Spotify status' });
  }
});

export default router;
```

### Fase 3: User Entity Extension

```typescript
// Modificar: backend/src/domain/user/user.entity.ts

export interface User {
  _id: ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  
  // Añadir campos de Spotify
  spotifyTokens?: {
    accessToken: string;        // Encriptado
    refreshToken: string;       // Encriptado
    expiresAt: number;
  };
  spotifyConnectedAt?: Date;
  lastSpotifySync?: Date;
  
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  preferences: {
    emailNotifications: boolean;
    daysBeforeConcert: number;
    maxDistance: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Fase 4: Token Encryption

```typescript
// Nuevo archivo: backend/src/shared/utils/encryption.util.ts

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export class EncryptionUtil {
  /**
   * Encriptar texto sensible (tokens)
   */
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Formato: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Desencriptar texto
   */
  static decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

---

## Implementación Frontend

### UI de Conexión

```tsx
// Nuevo componente: frontend/components/spotify/SpotifyConnect.tsx

'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface SpotifyStatus {
  connected: boolean;
  importing: boolean;
  artistCount: number;
}

export function SpotifyConnect() {
  const [status, setStatus] = useState<SpotifyStatus>({
    connected: false,
    importing: false,
    artistCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await apiClient.get<SpotifyStatus>('/auth/spotify/status');
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch Spotify status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const { authUrl } = await apiClient.get<{ authUrl: string }>('/auth/spotify/connect');
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to connect Spotify:', error);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Spotify?')) return;
    
    try {
      await apiClient.delete('/auth/spotify/disconnect');
      setStatus({ connected: false, importing: false, artistCount: 0 });
    } catch (error) {
      console.error('Failed to disconnect Spotify:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-prussian-blue/50 rounded-[20px] p-6 animate-pulse">
        <div className="h-16 bg-alabaster/10 rounded" />
      </div>
    );
  }

  if (status.importing) {
    return (
      <div className="bg-[#1DB954]/10 border border-[#1DB954]/30 rounded-[20px] p-6">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#1DB954]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <div>
            <p className="text-white font-medium">Importing from Spotify...</p>
            <p className="text-alabaster/60 text-sm">
              This may take a minute
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status.connected) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-[20px] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SpotifyIcon className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-white font-medium">Spotify Connected</p>
              <p className="text-alabaster/60 text-sm">
                {status.artistCount} artists imported
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-sm text-alabaster/40 hover:text-alabaster/60 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-3 bg-[#1DB954] text-white 
                 font-medium px-6 py-4 rounded-[20px] w-full
                 hover:bg-[#1ed760] transition-colors group"
    >
      <SpotifyIcon className="w-6 h-6" />
      <span>Connect Spotify</span>
      <span className="ml-auto text-white/60 text-sm group-hover:text-white/80">
        Auto-import your artists →
      </span>
    </button>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}
```

### Integración en Settings

```tsx
// Modificar: frontend/app/dashboard/settings/page.tsx

import { SpotifyConnect } from '@/components/spotify/SpotifyConnect';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-white">Settings</h1>
      
      {/* Sección Spotify */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">
          Music Integration
        </h2>
        <SpotifyConnect />
        <p className="text-sm text-alabaster/60 mt-2">
          Connect your Spotify account to automatically import your favorite artists 
          and get concert notifications.
        </p>
      </section>
      
      {/* Otras secciones... */}
    </div>
  );
}
```

---

## Background Sync Worker

### Worker de Sync Periódico

```typescript
// Nuevo archivo: backend/src/infrastructure/workers/spotify-sync.worker.ts

import { SpotifyOAuthService } from '../auth/spotify-oauth.service';
import { UserRepository } from '../repositories/user.repository';
import { ArtistService } from '../../application/artist/artist.service';
import { FollowService } from '../../application/follow/follow.service';
import { FollowRepository } from '../repositories/follow.repository';
import { EncryptionUtil } from '../../shared/utils/encryption.util';

export class SpotifySyncWorker {
  constructor(
    private spotifyOAuth: SpotifyOAuthService,
    private userRepository: UserRepository,
    private artistService: ArtistService,
    private followService: FollowService,
    private followRepository: FollowRepository
  ) {}

  /**
   * Sincronizar artistas de un usuario desde Spotify
   * Ejecutar cada 24h via scheduler
   */
  async syncUserArtists(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      
      if (!user.spotifyTokens) {
        console.log(`User ${userId} has no Spotify tokens`);
        return;
      }

      // Obtener access token válido
      const validToken = await this.ensureValidToken(user);
      
      // Obtener artistas actuales de Spotify
      const spotifyArtists = await this.spotifyOAuth.getUserArtists(validToken);
      console.log(`Found ${spotifyArtists.length} artists from Spotify for user ${userId}`);
      
      // Obtener follows actuales en Band-Pulse
      const currentFollows = await this.followRepository.findByUser(userId);
      const currentSpotifyIds = new Set(
        currentFollows
          .map(f => f.artist.spotifyId)
          .filter(id => id !== undefined)
      );
      
      // Detectar artistas nuevos en Spotify
      const newArtists = spotifyArtists.filter(a => !currentSpotifyIds.has(a.spotifyId));
      
      if (newArtists.length === 0) {
        console.log(`No new artists to sync for user ${userId}`);
        await this.userRepository.updateLastSpotifySync(userId);
        return;
      }

      // Auto-follow nuevos artistas
      for (const spotifyArtist of newArtists) {
        try {
          // Crear o actualizar artista en DB
          const artist = await this.artistService.findOrCreateFromSpotify(spotifyArtist);
          
          // Crear follow
          await this.followService.follow(userId, artist._id.toString());
          
          console.log(`Auto-followed ${artist.name} for user ${userId}`);
        } catch (error) {
          console.error(`Failed to auto-follow artist ${spotifyArtist.name}:`, error);
        }
      }

      // Actualizar timestamp de sync
      await this.userRepository.updateLastSpotifySync(userId);
      
      console.log(`Successfully synced ${newArtists.length} new artists for user ${userId}`);
    } catch (error) {
      console.error(`Spotify sync failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Asegurar que el access token sea válido
   * Refrescar si está expirado
   */
  private async ensureValidToken(user: any): Promise<string> {
    const tokens = user.spotifyTokens;
    const now = Date.now();
    
    // Token todavía válido (con 5 min de buffer)
    if (tokens.expiresAt > now + (5 * 60 * 1000)) {
      return EncryptionUtil.decrypt(tokens.accessToken);
    }

    // Token expirado, refrescar
    console.log(`Refreshing Spotify token for user ${user._id}`);
    
    const refreshToken = EncryptionUtil.decrypt(tokens.refreshToken);
    const newTokens = await this.spotifyOAuth.refreshAccessToken(refreshToken);
    
    // Guardar nuevos tokens
    await this.userRepository.updateSpotifyTokens(user._id.toString(), newTokens);
    
    return newTokens.accessToken;
  }

  /**
   * Ejecutar sync para todos los usuarios con Spotify conectado
   * Llamar desde scheduler diario
   */
  async syncAllUsers(): Promise<void> {
    const users = await this.userRepository.findWithSpotifyConnected();
    
    console.log(`Starting Spotify sync for ${users.length} users`);
    
    for (const user of users) {
      try {
        await this.syncUserArtists(user._id.toString());
      } catch (error) {
        console.error(`Failed to sync user ${user._id}:`, error);
        // Continuar con el siguiente usuario
      }
    }
    
    console.log(`Completed Spotify sync for all users`);
  }
}
```

### Scheduler Configuration

```typescript
// Modificar: backend/src/infrastructure/scheduler.ts

import { SpotifySyncWorker } from './workers/spotify-sync.worker';

export class Scheduler {
  private spotifySyncWorker: SpotifySyncWorker;

  constructor() {
    // ... otros workers
    this.spotifySyncWorker = new SpotifySyncWorker(/* dependencies */);
  }

  start() {
    // ... otros schedules

    // Sync Spotify cada 24h a las 3 AM
    cron.schedule('0 3 * * *', async () => {
      console.log('Starting daily Spotify sync...');
      try {
        await this.spotifySyncWorker.syncAllUsers();
      } catch (error) {
        console.error('Daily Spotify sync failed:', error);
      }
    });
  }
}
```

---

## Security & Best Practices

### Variables de Entorno

```bash
# .env

# Spotify OAuth
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://yourdomain.com/auth/spotify/callback

# Encryption (generar con: openssl rand -hex 32)
ENCRYPTION_KEY=your_32_byte_hex_key
```

### Registro en Spotify Developer Dashboard

1. Ir a https://developer.spotify.com/dashboard
2. Crear nueva app
3. Añadir redirect URI: `https://yourdomain.com/auth/spotify/callback`
4. Copiar Client ID y Client Secret

### Rate Limiting

```typescript
// Añadir rate limiting a endpoints OAuth

import rateLimit from 'express-rate-limit';

const spotifyConnectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos máximo
  message: 'Too many connection attempts, please try again later'
});

router.get('/spotify/connect', spotifyConnectLimiter, authMiddleware, async (req, res) => {
  // ...
});
```

### CSRF Protection

El flujo usa `state` parameter para prevenir CSRF:
1. Generar UUID random al iniciar auth
2. Guardar en Redis con userId
3. Validar que el state del callback coincida
4. Eliminar state tras uso (single-use)

### Token Security

- ✅ Tokens encriptados en database (AES-256-GCM)
- ✅ Never log tokens
- ✅ Usar HTTPS en producción
- ✅ Refresh tokens antes de expirar
- ✅ Permitir al usuario revocar acceso

---

## Métricas de Éxito

| Métrica | Target |
|---------|--------|
| % usuarios que conectan Spotify en onboarding | >70% |
| Time to first follow (con Spotify) | <30s |
| Artists importados por usuario (promedio) | >15 |
| Sync success rate | >95% |
| Token refresh success rate | >99% |

---

*Última actualización: Marzo 2, 2026*
