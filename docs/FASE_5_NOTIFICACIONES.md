# Fase 5: Sistema de Notificaciones

**Duración estimada:** 2 semanas

## Objetivo

Implementar sistema de notificaciones in-app que alerte a los usuarios sobre:
- Nuevos conciertos anunciados de artistas seguidos
- Recordatorios de conciertos próximos
- Nuevos tours en su región

---

## Tareas Backend

### 1. Repositorio de Notificaciones

#### src/repositories/notification.repository.ts

```typescript
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

export interface Notification {
  _id?: ObjectId;
  userId: ObjectId;
  eventId?: ObjectId;
  artistId: ObjectId;
  type: 'new-concert' | 'tour-announcement' | 'reminder';
  title: string;
  message: string;
  read: boolean;
  sentAt: Date;
  createdAt: Date;
}

export class NotificationRepository {
  private get collection() {
    return getDatabase().collection<Notification>('notifications');
  }

  async create(data: Omit<Notification, '_id' | 'createdAt'>): Promise<Notification> {
    const notification: Notification = {
      ...data,
      createdAt: new Date(),
    };

    const result = await this.collection.insertOne(notification);
    return { ...notification, _id: result.insertedId };
  }

  async findByUser(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const query: any = { userId: new ObjectId(userId) };
    if (unreadOnly) {
      query.read = false;
    }

    return this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: new ObjectId(notificationId) },
      { $set: { read: true } }
    );

    return result.modifiedCount > 0;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.collection.updateMany(
      { userId: new ObjectId(userId), read: false },
      { $set: { read: true } }
    );

    return result.modifiedCount;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.collection.countDocuments({
      userId: new ObjectId(userId),
      read: false,
    });
  }
}
```

### 2. Servicio de Notificaciones

#### src/services/notification.service.ts

```typescript
import { NotificationRepository } from '../repositories/notification.repository';
import { UserRepository } from '../repositories/user.repository';
import { FollowRepository } from '../repositories/follow.repository';
import { EventRepository, Event } from '../repositories/event.repository';
import { ArtistRepository } from '../repositories/artist.repository';
import { logger } from '../utils/logger';

export class NotificationService {
  constructor(
    private notificationRepository: NotificationRepository,
    private userRepository: UserRepository,
    private followRepository: FollowRepository,
    private eventRepository: EventRepository,
    private artistRepository: ArtistRepository
  ) {}

  async notifyNewConcert(eventId: string): Promise<void> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) return;

    // Obtener todos los usuarios que siguen este artista
    const followers = await this.followRepository.getFollowersByArtist(
      event.artistId.toString()
    );

    logger.info(`Notifying ${followers.length} users about new concert: ${event.title}`);

    for (const follow of followers) {
      if (!follow.notificationsEnabled) continue;

      const user = await this.userRepository.findById(follow.userId.toString());
      if (!user || !user.location) continue;

      // Verificar si el evento está dentro del radio del usuario
      const events = await this.eventRepository.findNearLocation(
        user.location.coordinates[0],
        user.location.coordinates[1],
        user.radiusKm || 50,
        [event.artistId.toString()]
      );

      if (events.some((e) => e._id?.toString() === eventId)) {
        await this.notificationRepository.create({
          userId: follow.userId,
          eventId: event._id,
          artistId: event.artistId,
          type: 'new-concert',
          title: `New concert: ${event.artistName}`,
          message: `${event.artistName} will perform at ${event.venue.name} in ${event.venue.city} on ${event.date.toLocaleDateString()}`,
          read: false,
          sentAt: new Date(),
        });
      }
    }
  }

  async sendConcertReminders(): Promise<void> {
    logger.info('🔔 Checking for concert reminders');

    // Obtener todos los usuarios
    const users = await this.userRepository.findAll();

    for (const user of users) {
      const daysBeforeConcert = user.notificationPreferences?.daysBeforeConcert || 3;
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + daysBeforeConcert);

      // Obtener artistas seguidos
      const artistIds = await this.followRepository.getFollowedArtistIds(user._id!.toString());

      if (artistIds.length === 0) continue;

      // Buscar eventos próximos
      const upcomingEvents = await this.eventRepository.findUpcomingInDateRange(
        artistIds,
        new Date(),
        reminderDate
      );

      for (const event of upcomingEvents) {
        // Verificar si ya se envió recordatorio
        const existingNotification = await this.notificationRepository.findOne({
          userId: user._id,
          eventId: event._id,
          type: 'reminder',
        });

        if (existingNotification) continue;

        // Crear notificación de recordatorio
        await this.notificationRepository.create({
          userId: user._id!,
          eventId: event._id,
          artistId: event.artistId,
          type: 'reminder',
          title: `Concert reminder: ${event.artistName}`,
          message: `Don't forget! ${event.artistName} performs in ${daysBeforeConcert} days at ${event.venue.name}`,
          read: false,
          sentAt: new Date(),
        });
      }
    }

    logger.info('✅ Concert reminders sent');
  }
}
```

### 3. Worker de Detección de Cambios

#### src/workers/notification.worker.ts

```typescript
import { NotificationService } from '../services/notification.service';
import { EventRepository } from '../repositories/event.repository';
import { logger } from '../utils/logger';

export class NotificationWorker {
  constructor(
    private notificationService: NotificationService,
    private eventRepository: EventRepository
  ) {}

  async detectNewEvents(): Promise<void> {
    logger.info('🔍 Detecting new events');

    // Obtener eventos creados en las últimas 24 horas
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const newEvents = await this.eventRepository.findCreatedAfter(yesterday);

    logger.info(`Found ${newEvents.length} new events`);

    for (const event of newEvents) {
      await this.notificationService.notifyNewConcert(event._id!.toString());
    }
  }

  async sendReminders(): Promise<void> {
    await this.notificationService.sendConcertReminders();
  }
}
```

### 4. Actualizar Scheduler

#### src/workers/scheduler.ts (actualización)

```typescript
import cron from 'node-cron';
import { EventSyncWorker } from './event-sync.worker';
import { NotificationWorker } from './notification.worker';
import { NotificationService } from '../services/notification.service';
// ... imports de repositories ...
import { logger } from '../utils/logger';

export function startScheduler() {
  // ... código existente EventSyncWorker ...

  // Notification Worker
  const notificationService = new NotificationService(
    notificationRepository,
    userRepository,
    followRepository,
    eventRepository,
    artistRepository
  );
  const notificationWorker = new NotificationWorker(notificationService, eventRepository);

  // Detectar nuevos eventos cada hora
  cron.schedule('0 * * * *', () => {
    logger.info('⏰ Cron job: Detecting new events');
    notificationWorker.detectNewEvents();
  });

  // Enviar recordatorios cada día a las 9 AM
  cron.schedule('0 9 * * *', () => {
    logger.info('⏰ Cron job: Sending concert reminders');
    notificationWorker.sendReminders();
  });

  logger.info('📅 Notification scheduler started');
}
```

### 5. Routes de Notificaciones

#### src/routes/notifications.routes.ts

```typescript
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { NotificationRepository } from '../repositories/notification.repository';

const router = Router();
const notificationRepository = new NotificationRepository();

// Obtener todas las notificaciones del usuario
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationRepository.findByUser(
      req.user!.userId,
      unreadOnly
    );

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener contador de no leídas
router.get('/unread-count', authenticate, async (req: AuthRequest, res) => {
  try {
    const count = await notificationRepository.getUnreadCount(req.user!.userId);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Marcar notificación como leída
router.patch('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const success = await notificationRepository.markAsRead(req.params.id);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Marcar todas como leídas
router.patch('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    const count = await notificationRepository.markAllAsRead(req.user!.userId);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as notificationsRoutes };
```

---

## Tareas Frontend

### 1. Componente NotificationBell

#### components/Notifications/NotificationBell.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // cada minuto
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    const response = await fetch('/api/notifications/unread-count');
    const data = await response.json();
    setCount(data.count);
  };

  const fetchNotifications = async () => {
    const response = await fetch('/api/notifications');
    const data = await response.json();
    setNotifications(data);
  };

  const handleOpen = async () => {
    setOpen(!open);
    if (!open) {
      await fetchNotifications();
    }
  };

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setCount((prev) => Math.max(0, prev - 1));
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'PATCH' });
    setCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {count > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold text-lg">Notifications</h3>
            {notifications.some((n) => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => markAsRead(notification._id)}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-sm">{notification.title}</h4>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notification.sentAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. Preferencias de Notificaciones

#### app/dashboard/settings/notifications/page.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState({
    newConcerts: true,
    tourAnnouncements: true,
    concertReminders: true,
    daysBeforeConcert: 3,
  });

  useEffect(() => {
    async function fetchPreferences() {
      const response = await fetch('/api/user/me');
      const data = await response.json();
      if (data.notificationPreferences) {
        setPreferences(data.notificationPreferences);
      }
    }

    fetchPreferences();
  }, []);

  const handleSave = async () => {
    await fetch('/api/user/notification-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });

    alert('Preferences saved!');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="text-3xl font-bold mb-8">Notification Settings</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">New Concerts</h3>
              <p className="text-sm text-gray-600">
                Get notified when artists you follow announce new concerts
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.newConcerts}
              onChange={(e) =>
                setPreferences({ ...preferences, newConcerts: e.target.checked })
              }
              className="w-5 h-5"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Tour Announcements</h3>
              <p className="text-sm text-gray-600">
                Get notified about new tours in your region
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.tourAnnouncements}
              onChange={(e) =>
                setPreferences({ ...preferences, tourAnnouncements: e.target.checked })
              }
              className="w-5 h-5"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Concert Reminders</h3>
              <p className="text-sm text-gray-600">
                Remind me before upcoming concerts
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.concertReminders}
              onChange={(e) =>
                setPreferences({ ...preferences, concertReminders: e.target.checked })
              }
              className="w-5 h-5"
            />
          </div>

          {preferences.concertReminders && (
            <div>
              <label className="block font-semibold mb-2">
                Remind me {preferences.daysBeforeConcert} days before
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={preferences.daysBeforeConcert}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    daysBeforeConcert: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Añadir Bell al Layout

#### app/dashboard/layout.tsx

```typescript
import NotificationBell from '@/components/Notifications/NotificationBell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">BandPulse</h1>
          <NotificationBell />
        </div>
      </nav>
      {children}
    </div>
  );
}
```

---

## Entregables

- ✅ Notificaciones de nuevos conciertos
- ✅ Recordatorios antes de conciertos
- ✅ Bell icon con contador de no leídas
- ✅ Panel de notificaciones
- ✅ Configuración de preferencias de notificaciones
- ✅ Workers automáticos (cada hora y diarios)

---

## Siguiente Fase

➡️ **[Fase 6: Web Scraping (Festivales)](./FASE_6_SCRAPING.md)**
