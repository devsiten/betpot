import { z } from 'zod';

// ============================================================================
// EVENT VALIDATION SCHEMAS
// ============================================================================

export const createEventSchema = z.object({
    title: z.string().min(3).max(200).regex(/^[\w\s\-\.\,\'\"]+$/i, 'Title contains invalid characters'),
    description: z.string().max(2000).optional(),
    category: z.enum(['crypto', 'politics', 'sports', 'entertainment', 'other']),
    eventTime: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)),
    imageUrl: z.string().url().optional().or(z.literal('')),
    options: z.array(z.object({
        optionId: z.string().regex(/^[A-Z]$/),
        label: z.string().min(1).max(100),
    })).min(2).max(10),
    isJackpot: z.boolean().optional(),
    featured: z.boolean().optional(),
});

export const updateEventSchema = createEventSchema.partial();

export const resolveEventSchema = z.object({
    winningOptionId: z.string().regex(/^[A-Z]$/, 'Winning option must be a single letter A-Z'),
});

export const lockEventSchema = z.object({
    eventId: z.string().uuid().or(z.string().min(10)),
});

// ============================================================================
// TICKET VALIDATION SCHEMAS
// ============================================================================

export const purchaseTicketSchema = z.object({
    eventId: z.string().min(10),
    optionId: z.string().regex(/^[A-Z]$/),
    quantity: z.number().int().min(1).max(100),
    walletAddress: z.string().min(32).max(64).regex(/^[A-Za-z0-9]+$/, 'Invalid wallet address'),
    chain: z.enum(['solana', 'ethereum', 'polygon']).optional().default('solana'),
    purchaseTx: z.string().min(20).max(128),
    solAmount: z.number().positive().optional(),
});

// ============================================================================
// ADMIN ACTION SCHEMAS
// ============================================================================

export const cancelEventSchema = z.object({
    reason: z.string().min(5).max(500).optional(),
});

export const createFromExternalSchema = z.object({
    externalId: z.string().min(1),
    source: z.enum(['odds-api', 'polymarket', 'api-sports', 'manual']),
    title: z.string().min(3).max(200),
    category: z.enum(['crypto', 'politics', 'sports', 'entertainment', 'other']),
    eventTime: z.string(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    options: z.array(z.object({
        optionId: z.string(),
        label: z.string(),
    })).min(2),
    isJackpot: z.boolean().optional(),
    startTime: z.string().optional(),
    status: z.enum(['open', 'upcoming', 'locked', 'resolved', 'cancelled']).optional(),
});

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const eventFiltersSchema = paginationSchema.extend({
    status: z.enum(['open', 'upcoming', 'locked', 'resolved', 'cancelled']).optional(),
    category: z.enum(['crypto', 'politics', 'sports', 'entertainment', 'other']).optional(),
    search: z.string().max(100).optional(),
});

// ============================================================================
// HELPER: Validate and return or throw
// ============================================================================

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Validation failed: ${errors}`);
    }
    return result.data;
}
