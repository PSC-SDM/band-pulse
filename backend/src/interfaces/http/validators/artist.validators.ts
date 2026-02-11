import { z } from 'zod';

export const searchQuerySchema = z.object({
    q: z.string().min(2, 'Query must be at least 2 characters').max(100),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).optional(),
});

export const artistIdParamSchema = z.object({
    id: z.string().min(1, 'Artist ID is required'),
});
