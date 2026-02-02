# Fase 7: Refinamiento y Lanzamiento

**Duración estimada:** 2 semanas

## Objetivo

Preparar la aplicación para producción: testing, optimización, seguridad, SEO, y despliegue al VPS.

---

## Checklist de Lanzamiento

### 1. Testing

#### Backend

```bash
cd backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
};
```

**Tests críticos:**

```typescript
// src/__tests__/auth.test.ts
import request from 'supertest';
import { app } from '../index';

describe('Authentication', () => {
  it('should return 401 without token', async () => {
    const response = await request(app).get('/api/users/me');
    expect(response.status).toBe(401);
  });

  it('should return user with valid token', async () => {
    const token = 'valid_jwt_token';
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
  });
});
```

#### Frontend

```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

### 2. Optimización de Performance

#### Backend

**Índices de MongoDB:**

```javascript
// Verificar índices
db.users.getIndexes();
db.artists.getIndexes();
db.events.getIndexes();
db.follows.getIndexes();
db.notifications.getIndexes();

// Añadir índices faltantes si es necesario
db.events.createIndex({ date: 1, status: 1 });
db.notifications.createIndex({ userId: 1, createdAt: -1 });
```

**Caching con Redis (opcional pero recomendado):**

```bash
npm install redis
```

```typescript
// src/config/redis.ts
import { createClient } from 'redis';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

export async function connectRedis() {
  await redisClient.connect();
}

// Usar para cachear búsquedas de artistas frecuentes
export async function getCachedArtistSearch(query: string) {
  const cached = await redisClient.get(`search:${query}`);
  return cached ? JSON.parse(cached) : null;
}

export async function setCachedArtistSearch(query: string, data: any) {
  await redisClient.setEx(`search:${query}`, 3600, JSON.stringify(data)); // 1 hora
}
```

#### Frontend

**Next.js optimizations:**

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['i.scdn.co'], // Spotify images
    formats: ['image/avif', 'image/webp'],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};
```

**Lazy loading de componentes pesados:**

```typescript
import dynamic from 'next/dynamic';

const EventMap = dynamic(() => import('@/components/Events/EventMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});
```

### 3. Seguridad

#### Variables de Entorno en Producción

```bash
# backend/.env.production
NODE_ENV=production
PORT=3001

# Generar secrets fuertes
JWT_SECRET=$(openssl rand -base64 64)
NEXTAUTH_SECRET=$(openssl rand -base64 64)

# MongoDB con autenticación
MONGODB_URI=mongodb://user:strong_password@localhost:27017/bandpulse?authSource=admin

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100
```

#### Rate Limiting

```bash
npm install express-rate-limit
```

```typescript
// src/middleware/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: 'Too many requests from this IP',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Máximo 5 intentos de login
  skipSuccessfulRequests: true,
});

// En index.ts
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

#### Helmet y CORS

```typescript
// src/index.ts
import helmet from 'helmet';
import cors from 'cors';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGINS.split(','),
    credentials: true,
  })
);
```

### 4. SEO y Metadatos

#### app/layout.tsx

```typescript
export const metadata = {
  title: 'BandPulse - Never Miss a Concert Again',
  description:
    'Track your favorite artists and get notified about concerts near you. Discover live music events across Europe.',
  keywords: 'concerts, live music, tour dates, festival tickets, music events',
  openGraph: {
    title: 'BandPulse',
    description: 'Never miss a concert again',
    url: 'https://bandpulse.com',
    siteName: 'BandPulse',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BandPulse',
    description: 'Never miss a concert again',
  },
};
```

#### Sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://bandpulse.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://bandpulse.com/dashboard',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];
}
```

#### robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/'],
    },
    sitemap: 'https://bandpulse.com/sitemap.xml',
  };
}
```

### 5. Monitoreo y Logging

#### PM2 Ecosystem

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'bandpulse-backend',
      cwd: './backend',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
    },
    {
      name: 'bandpulse-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
    },
  ],
};
```

#### Health Check Endpoint

```typescript
// src/routes/health.routes.ts
import { Router } from 'express';
import { getDatabase } from '../config/database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Check database
    await getDatabase().admin().ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

export { router as healthRoutes };
```

### 6. Despliegue en VPS

#### Script de Despliegue

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment..."

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm ci --only=production
npm run build

echo "📦 Installing frontend dependencies..."
cd ../frontend
npm ci --only=production
npm run build

# 3. Restart services with PM2
echo "🔄 Restarting services..."
pm2 restart ecosystem.config.js --env production

# 4. Health check
echo "🏥 Running health check..."
sleep 5
curl -f http://localhost:3001/health || exit 1
curl -f http://localhost:3000 || exit 1

echo "✅ Deployment completed successfully!"
```

```bash
chmod +x deploy.sh
```

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/bandpulse
server {
    listen 80;
    server_name bandpulse.com www.bandpulse.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bandpulse.com www.bandpulse.com;

    ssl_certificate /etc/letsencrypt/live/bandpulse.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bandpulse.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # Static files cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
```

#### SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d bandpulse.com -d www.bandpulse.com

# Auto-renovación (ya configurado por defecto)
sudo certbot renew --dry-run
```

#### Backup Automático

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/bandpulse"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup MongoDB
mongodump --uri="mongodb://user:pass@localhost:27017/bandpulse" --out="$BACKUP_DIR/mongo_$DATE"

# Comprimir
tar -czf "$BACKUP_DIR/mongo_$DATE.tar.gz" "$BACKUP_DIR/mongo_$DATE"
rm -rf "$BACKUP_DIR/mongo_$DATE"

# Mantener solo últimos 7 días
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "✅ Backup completed: mongo_$DATE.tar.gz"
```

```bash
# Cron job: backup diario a las 3 AM
sudo crontab -e
0 3 * * * /path/to/backup.sh >> /var/log/bandpulse-backup.log 2>&1
```

### 7. Monitoreo Post-Lanzamiento

#### PM2 Monitoring

```bash
# Instalar PM2 Plus (opcional, tiene free tier)
pm2 link <secret_key> <public_key>

# O usar comandos locales
pm2 monit
pm2 logs
pm2 status
```

#### Logs

```bash
# Ver logs en tiempo real
pm2 logs bandpulse-backend --lines 100
pm2 logs bandpulse-frontend --lines 100

# Logs de Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 8. Documentación

#### README.md del repositorio

```markdown
# BandPulse

## Setup Development

\`\`\`bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start MongoDB (Docker)
docker-compose up -d

# Run backend
cd backend && npm run dev

# Run frontend
cd frontend && npm run dev
\`\`\`

## Deploy to Production

\`\`\`bash
./deploy.sh
\`\`\`

## Environment Variables

See `.env.example` files in backend/ and frontend/
```

#### API Documentation

Crear documentación con Swagger (opcional):

```bash
npm install swagger-ui-express swagger-jsdoc
```

---

## Checklist Final

### Pre-Lanzamiento

- [ ] Tests E2E pasando
- [ ] Todas las variables de entorno configuradas
- [ ] SSL certificado instalado
- [ ] Backups automáticos configurados
- [ ] Monitoring configurado
- [ ] Rate limiting activo
- [ ] CORS configurado correctamente
- [ ] SEO metadata completa
- [ ] Sitemap y robots.txt
- [ ] Performance optimizada (Lighthouse > 90)
- [ ] Seguridad (headers, HTTPS, etc.)

### Post-Lanzamiento

- [ ] Verificar health checks
- [ ] Monitorear logs por 24h
- [ ] Test de carga (opcional)
- [ ] Verificar workers ejecutándose
- [ ] Verificar notificaciones funcionando
- [ ] Analytics configurado (opcional)

---

## Entregables

- ✅ App desplegada en VPS con SSL
- ✅ Nginx configurado como reverse proxy
- ✅ PM2 gestionando procesos
- ✅ Backups automáticos
- ✅ Monitoring activo
- ✅ Documentación completa
- ✅ Tests implementados
- ✅ Optimización de performance
- ✅ SEO configurado

---

## Soporte Post-Lanzamiento

### Mantenimiento Rutinario

1. **Diario:** Revisar logs de errores
2. **Semanal:** Verificar backups, actualizar dependencias
3. **Mensual:** Análisis de performance, optimización de índices

### Escalabilidad Futura

Cuando la app crezca:
- Migrar a cluster de MongoDB (replica set)
- Añadir Redis para caché
- Separar workers en servidor dedicado
- CDN para assets estáticos (Cloudflare)
- Load balancer si es necesario

---

**🎉 ¡Felicidades! BandPulse está listo para lanzamiento.**
