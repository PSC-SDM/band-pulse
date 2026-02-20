import { z } from 'zod';

export const updateLocationSchema = z.object({
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    radiusKm: z.number().min(1).max(500),
});

export const updateNotificationPreferencesSchema = z.object({
    newConcerts: z.boolean().optional(),
    tourAnnouncements: z.boolean().optional(),
    concertReminders: z.boolean().optional(),
    daysBeforeConcert: z.number().int().min(1).max(30).optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one preference field must be provided',
});
