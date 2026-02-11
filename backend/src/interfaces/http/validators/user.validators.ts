import { z } from 'zod';

export const updateLocationSchema = z.object({
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    radiusKm: z.number().min(1).max(500),
});
