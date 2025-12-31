import { Hono } from 'hono';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppContext } from '../types';
import { blogPosts, users } from '../db/schema';
import { optionalAuth } from '../middleware/auth';

export const blogRoutes = new Hono<AppContext>();

// Admin wallet addresses (same as in auth middleware)
const ADMIN_WALLETS = [
    '9B7SLBvupwfUGxYfxmK1VRWx6BtbEinRrx5u973JquKj',
    'CJpMo2ANF1Q614szsj9jU7qkaWM8RMTTgF3AtKM7Lpw',
    '4Gw23RWwuam8DeRyjXxMNmccaH6f1u82jMDkVJxQ4SGR',
    'GJrjFmeqSvLwDdRJiQFoYXUiRQgF95bE9NddZfEsJQvz',
];

// Helper to check if user is admin (by role or wallet)
function isAdmin(c: any): boolean {
    const user = c.get('user');
    const walletAddress = c.req.header('X-Wallet-Address');

    // Check by user role
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
        return true;
    }

    // Check by wallet address in user object
    if (user?.walletAddress && ADMIN_WALLETS.includes(user.walletAddress)) {
        return true;
    }

    // Check by wallet header
    if (walletAddress && ADMIN_WALLETS.includes(walletAddress)) {
        return true;
    }

    return false;
}

// Get admin user ID (for authorId)
function getAdminUserId(c: any): string {
    const user = c.get('user');
    const walletAddress = c.req.header('X-Wallet-Address');
    return user?.id || walletAddress || 'admin';
}

// Apply optional auth to all routes
blogRoutes.use('*', optionalAuth);

// Get all published blog posts (public)
blogRoutes.get('/', async (c) => {
    const db = c.get('db');

    const posts = await db.query.blogPosts.findMany({
        where: eq(blogPosts.isPublished, true),
        orderBy: [desc(blogPosts.createdAt)],
        with: {
            author: {
                columns: { id: true, username: true }
            }
        }
    });

    return c.json({ success: true, data: posts });
});

// Get single blog post (public)
blogRoutes.get('/:id', async (c) => {
    const db = c.get('db');
    const { id } = c.req.param();

    const post = await db.query.blogPosts.findFirst({
        where: and(eq(blogPosts.id, id), eq(blogPosts.isPublished, true)),
        with: {
            author: {
                columns: { id: true, username: true }
            }
        }
    });

    if (!post) {
        return c.json({ success: false, error: 'Post not found' }, 404);
    }

    return c.json({ success: true, data: post });
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

const createPostSchema = z.object({
    title: z.string().min(1).max(255),
    excerpt: z.string().max(500).optional(),
    content: z.string().min(1),
    imageUrl: z.string().optional().nullable().transform(val => val === '' ? null : val),
    category: z.string().default('announcement'),
    isPublished: z.boolean().default(false),
});

// Get all posts (admin - includes drafts)
blogRoutes.get('/admin/all', async (c) => {
    if (!isAdmin(c)) {
        return c.json({ success: false, error: 'Unauthorized' }, 403);
    }

    const db = c.get('db');
    const posts = await db.query.blogPosts.findMany({
        orderBy: [desc(blogPosts.createdAt)],
        with: {
            author: {
                columns: { id: true, username: true }
            }
        }
    });

    return c.json({ success: true, data: posts });
});

// Create blog post (admin)
blogRoutes.post('/admin/create', zValidator('json', createPostSchema), async (c) => {
    if (!isAdmin(c)) {
        return c.json({ success: false, error: 'Unauthorized' }, 403);
    }

    const db = c.get('db');
    const data = c.req.valid('json');

    const post = await db.insert(blogPosts).values({
        id: nanoid(),
        title: data.title,
        excerpt: data.excerpt || data.content.substring(0, 150) + '...',
        content: data.content,
        imageUrl: data.imageUrl || null,
        category: data.category,
        isPublished: data.isPublished,
        authorId: getAdminUserId(c),
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();

    return c.json({ success: true, data: post[0] });
});

// Update blog post (admin)
blogRoutes.put('/admin/:id', zValidator('json', createPostSchema.partial()), async (c) => {
    if (!isAdmin(c)) {
        return c.json({ success: false, error: 'Unauthorized' }, 403);
    }

    const db = c.get('db');
    const { id } = c.req.param();
    const data = c.req.valid('json');

    const updated = await db.update(blogPosts)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, id))
        .returning();

    if (!updated.length) {
        return c.json({ success: false, error: 'Post not found' }, 404);
    }

    return c.json({ success: true, data: updated[0] });
});

// Delete blog post (admin)
blogRoutes.delete('/admin/:id', async (c) => {
    if (!isAdmin(c)) {
        return c.json({ success: false, error: 'Unauthorized' }, 403);
    }

    const db = c.get('db');
    const { id } = c.req.param();

    await db.delete(blogPosts).where(eq(blogPosts.id, id));

    return c.json({ success: true, message: 'Post deleted' });
});
