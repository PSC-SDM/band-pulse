# Fase 0: Setup e Infraestructura

**Duración estimada:** 1 semana

## Objetivo

Establecer el entorno de desarrollo completo, la estructura del proyecto y las herramientas necesarias para comenzar la implementación.

---

## Tareas

### 1. Configuración del Repositorio

- [ ] Inicializar repositorio Git
- [ ] Crear estructura de monorepo
- [ ] Configurar `.gitignore`
- [ ] Crear `README.md` principal

### 2. Setup Backend (Node.js + Express)

#### Estructura inicial

```
backend/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── env.ts
│   │   └── cors.ts
│   ├── middleware/
│   │   └── error.middleware.ts
│   └── utils/
│       └── logger.ts
└── tests/
```

#### Dependencias principales

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongodb": "^6.3.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "nodemon": "^3.0.2"
  }
}
```

#### Scripts

```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### 3. Setup Frontend (Next.js)

#### Crear proyecto

```bash
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir
```

#### Estructura inicial

```
frontend/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── .env.local.example
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
├── lib/
│   ├── api-client.ts
│   └── utils.ts
└── types/
```

#### Dependencias adicionales

```json
{
  "dependencies": {
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.17.9",
    "zustand": "^4.4.7"
  }
}
```

### 4. Setup MongoDB

#### Opción A: Docker (Desarrollo)

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: bandpulse-mongo
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: bandpulse
      MONGO_INITDB_ROOT_PASSWORD: dev_password
      MONGO_INITDB_DATABASE: bandpulse
    volumes:
      - mongo_data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js

volumes:
  mongo_data:
```

#### Opción B: Local (Desarrollo)

```bash
# Linux
sudo apt install mongodb-org
sudo systemctl start mongod

# Crear usuario de desarrollo
mongosh
> use bandpulse
> db.createUser({
    user: "dev_user",
    pwd: "dev_password",
    roles: ["readWrite"]
  })
```

#### Script de inicialización de índices

```javascript
// scripts/mongo-init.js
db = db.getSiblingDB('bandpulse');

// Colección users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ location: "2dsphere" });

// Colección artists
db.artists.createIndex({ slug: 1 }, { unique: true });
db.artists.createIndex({ name: "text" });
db.artists.createIndex({ lastFetchedAt: 1 });

// Colección events
db.events.createIndex({ artistId: 1 });
db.events.createIndex({ date: 1 });
db.events.createIndex({ "venue.location": "2dsphere" });
db.events.createIndex({ artistId: 1, date: 1 });

// Colección follows
db.follows.createIndex({ userId: 1, artistId: 1 }, { unique: true });
db.follows.createIndex({ artistId: 1 });

// Colección notifications
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ userId: 1, read: 1, createdAt: -1 });

print('✅ Índices creados correctamente');
```

### 5. Configuración de TypeScript

#### Backend tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 6. Variables de Entorno

#### backend/.env.example

```bash
NODE_ENV=development
PORT=3001

# MongoDB
MONGODB_URI=mongodb://dev_user:dev_password@localhost:27017/bandpulse

# JWT (generar con: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Cache TTL (en segundos)
ARTIST_CACHE_TTL=604800  # 7 días
EVENT_CACHE_TTL=86400    # 1 día

# CORS
CORS_ORIGINS=http://localhost:3000

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

#### frontend/.env.local.example

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 7. Código Base Mínimo

#### backend/src/index.ts

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS.split(',') }));
app.use(express.json());

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
      logger.info(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
```

#### backend/src/config/database.ts

```typescript
import { MongoClient, Db } from 'mongodb';
import { env } from './env';
import { logger } from '../utils/logger';

let client: MongoClient;
let db: Db;

export async function connectDatabase(): Promise<Db> {
  if (db) return db;

  try {
    client = new MongoClient(env.MONGODB_URI);
    await client.connect();
    db = client.db();
    
    logger.info('✅ MongoDB connected successfully');
    return db;
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase first.');
  }
  return db;
}
```

#### backend/src/config/env.ts

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  MONGODB_URI: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ARTIST_CACHE_TTL: z.string().transform(Number).default('604800'),
  EVENT_CACHE_TTL: z.string().transform(Number).default('86400'),
  CORS_ORIGINS: z.string(),
  FRONTEND_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

#### backend/src/utils/logger.ts

```typescript
import winston from 'winston';
import { env } from '../config/env';

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});
```

### 8. Testing Inicial

```bash
# Backend
cd backend
npm install
npm run dev
# Debería correr en http://localhost:3001

# Test health check
curl http://localhost:3001/health

# Frontend
cd ../frontend
npm install
npm run dev
# Debería correr en http://localhost:3000
```

---

## Entregables

- ✅ Repositorio configurado con estructura monorepo
- ✅ Backend corriendo en puerto 3001
- ✅ Frontend corriendo en puerto 3000
- ✅ MongoDB conectado con índices creados
- ✅ Variables de entorno configuradas
- ✅ Docker Compose funcional para desarrollo
- ✅ Health check endpoint funcionando

---

## Siguiente Fase

➡️ **[Fase 1: Autenticación y Usuario](./FASE_1_AUTENTICACION.md)**

