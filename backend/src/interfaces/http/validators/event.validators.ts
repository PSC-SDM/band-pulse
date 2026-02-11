import { z } from 'zod';

export const artistIdParamSchema = z.object({
    artistId: z.string().min(1, 'Artist ID is required'),
});

export const eventIdParamSchema = z.object({
    eventId: z.string().min(1, 'Event ID is required'),
});

export const searchEventsQuerySchema = z.object({
    lng: z.string().transform(Number).pipe(z.number().min(-180).max(180)),
    lat: z.string().transform(Number).pipe(z.number().min(-90).max(90)),
    radiusKm: z.string().transform(Number).pipe(z.number().min(1).max(5000)),
});
