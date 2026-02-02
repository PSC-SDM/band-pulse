# Fase 1: Autenticación y Usuario

**Duración estimada:** 2 semanas

## Objetivo

Implementar el sistema de autenticación OAuth (Google) y la gestión básica de usuarios.

---

## Stack de Autenticación

- **Backend**: Passport.js + JWT
- **Frontend**: NextAuth.js
- **Provider**: Google OAuth 2.0 (extensible a otros)

---

## Tareas Backend

### 1. Instalación de Dependencias

```bash
cd backend
npm install passport passport-google-oauth20 jsonwebtoken
npm install -D @types/passport @types/passport-google-oauth20 @types/jsonwebtoken
```

### 2. Configuración OAuth

#### Obtener credenciales de Google

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto "BandPulse"
3. Habilitar "Google+ API"
4. Crear credenciales OAuth 2.0
5. Configurar URLs autorizadas:
   - **Desarrollo**: `http://localhost:3001/api/auth/google/callback`
   - **Producción**: `https://tudominio.com/api/auth/google/callback`

#### Actualizar .env

```bash
# backend/.env
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

### 3. Implementación Backend

#### src/config/oauth.ts

```typescript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env';
import { UserRepository } from '../repositories/user.repository';

const userRepository = new UserRepository();

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in profile'));
        }

        // Buscar o crear usuario
        let user = await userRepository.findByEmail(email);

        if (!user) {
          user = await userRepository.create({
            email,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
            oauthProvider: 'google',
            oauthId: profile.id,
          });
        }

        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

export { passport };
```

#### src/repositories/user.repository.ts

```typescript
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

export interface User {
  _id?: ObjectId;
  email: string;
  name: string;
  avatar?: string;
  oauthProvider: string;
  oauthId: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  radiusKm?: number;
  notificationPreferences?: {
    newConcerts: boolean;
    tourAnnouncements: boolean;
    concertReminders: boolean;
    daysBeforeConcert: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  private get collection() {
    return getDatabase().collection<User>('users');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.collection.findOne({ email });
  }

  async findById(id: string): Promise<User | null> {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async create(userData: Partial<User>): Promise<User> {
    const now = new Date();
    const user: User = {
      email: userData.email!,
      name: userData.name!,
      avatar: userData.avatar,
      oauthProvider: userData.oauthProvider!,
      oauthId: userData.oauthId!,
      notificationPreferences: {
        newConcerts: true,
        tourAnnouncements: true,
        concertReminders: true,
        daysBeforeConcert: 3,
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  async updateLocation(
    userId: string,
    longitude: number,
    latitude: number,
    radiusKm: number
  ): Promise<User | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          radiusKm,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }
}
```

#### src/utils/jwt.ts

```typescript
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JWTPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
}
```

#### src/middleware/auth.middleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

#### src/routes/auth.routes.ts

```typescript
import { Router } from 'express';
import { passport } from '../config/oauth';
import { generateToken } from '../utils/jwt';
import { env } from '../config/env';

const router = Router();

// Iniciar OAuth con Google
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// Callback de Google
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const user = req.user as any;

    // Generar JWT
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    // Redirigir al frontend con el token
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

export { router as authRoutes };
```

#### src/routes/users.routes.ts

```typescript
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { UserRepository } from '../repositories/user.repository';
import { z } from 'zod';

const router = Router();
const userRepository = new UserRepository();

// Obtener perfil del usuario actual
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await userRepository.findById(req.user!.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Actualizar ubicación del usuario
const updateLocationSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  radiusKm: z.number().min(1).max(500),
});

router.patch('/me/location', authenticate, async (req: AuthRequest, res) => {
  try {
    const { longitude, latitude, radiusKm } = updateLocationSchema.parse(req.body);

    const user = await userRepository.updateLocation(
      req.user!.userId,
      longitude,
      latitude,
      radiusKm
    );

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as usersRoutes };
```

#### Actualizar src/index.ts

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { passport } from './config/oauth';
import { authRoutes } from './routes/auth.routes';
import { usersRoutes } from './routes/users.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS.split(',') }));
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    await connectDatabase();
    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
```

---

## Tareas Frontend

### 1. Instalación de Dependencias

```bash
cd frontend
npm install next-auth
```

### 2. Configuración NextAuth

#### app/api/auth/[...nextauth]/route.ts

```typescript
import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // El backend maneja la creación/actualización del usuario
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        // Primera vez que se logea
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Obtener el token del backend
      const response = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user?.email }),
      });

      if (response.ok) {
        const data = await response.json();
        session.accessToken = data.token;
      }

      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

#### .env.local

```bash
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret
NEXTAUTH_SECRET=tu_secret_random_string
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. UI de Login

#### app/login/page.tsx

```typescript
'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-800">
          BandPulse
        </h1>
        <p className="mb-8 text-center text-gray-600">
          Never miss a concert again
        </p>

        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-white border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
```

### 4. Layout con Provider

#### app/layout.tsx

```typescript
import { SessionProvider } from './providers/session-provider';
import './globals.css';

export const metadata = {
  title: 'BandPulse',
  description: 'Never miss a concert again',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

#### app/providers/session-provider.tsx

```typescript
'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

### 5. Dashboard Protegido

#### app/dashboard/page.tsx

```typescript
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">BandPulse</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session?.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Welcome, {session?.user?.name}!</h2>
        <p className="text-gray-600">Dashboard content coming soon...</p>
      </main>
    </div>
  );
}
```

---

## Testing

### 1. Test Backend

```bash
# Terminal 1: Iniciar backend
cd backend
npm run dev

# Terminal 2: Test endpoints
# Iniciar flujo OAuth (abrirá el navegador)
open http://localhost:3001/api/auth/google

# Después de autenticarse, deberías ser redirigido al frontend con un token
```

### 2. Test Frontend

```bash
cd frontend
npm run dev

# Abrir http://localhost:3000/login
# Click en "Continue with Google"
# Deberías ser autenticado y redirigido a /dashboard
```

### 3. Test API con token

```bash
# Obtener token del navegador (localStorage o cookie)
TOKEN="tu_jwt_token_aqui"

# Test endpoint protegido
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/users/me
```

---

## Entregables

- ✅ Login funcional con Google OAuth
- ✅ Generación y validación de JWT
- ✅ Endpoint `/api/users/me` protegido
- ✅ Sesión persistente en frontend
- ✅ Página de dashboard protegida
- ✅ Logout funcional

---

## Siguiente Fase

➡️ **[Fase 2: Selección de Ubicación](./FASE_2_UBICACION.md)**
