import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and, count, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { notifications, users } from '../db/schema';
import { auth } from '../middleware/auth';
import { AppContext } from '../types';

export const notificationsRoutes = new Hono<AppContext>();

// Require auth for all notification routes
notificationsRoutes.use('/*', auth);

// Get notifications for current user
notificationsRoutes.get('/', async (c) => {
    const db = c.get('db');
    const user = c.get('user')!;

    try {
        const { limit = '20', unreadOnly = 'false' } = c.req.query();
        const limitNum = Math.min(parseInt(limit) || 20, 100);

        // If authenticated via wallet, find the real user record to get their notifications
        let userIds = [user.id];
        if (user.walletAddress) {
            const realUser = await db.query.users.findFirst({
                where: eq(users.walletAddress, user.walletAddress),
                columns: { id: true },
            });
            if (realUser && realUser.id !== user.id) {
                userIds.push(realUser.id);
            }
        }

        // Query by any matching user ID
        const userCondition = userIds.length > 1
            ? or(...userIds.map(id => eq(notifications.userId, id)))
            : eq(notifications.userId, user.id);

        const conditions: any[] = [userCondition];
        if (unreadOnly === 'true') {
            conditions.push(eq(notifications.isRead, false));
        }

        const notificationsList = await db.select()
            .from(notifications)
            .where(and(...conditions))
            .orderBy(desc(notifications.createdAt))
            .limit(limitNum);

        // Get unread count
        const unreadCount = await db.select({ count: count() })
            .from(notifications)
            .where(and(userCondition as any, eq(notifications.isRead, false)));

        return c.json({
            success: true,
            data: notificationsList,
            unreadCount: unreadCount[0]?.count || 0,
        });
    } catch (error: any) {
        console.error('Get notifications error:', error);
        return c.json({ success: false, error: 'Failed to get notifications' }, 500);
    }
});

// Mark notification as read
notificationsRoutes.put('/:id/read', async (c) => {
    const db = c.get('db');
    const user = c.get('user')!;
    const { id } = c.req.param();

    try {
        await db.update(notifications)
            .set({ isRead: true })
            .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));

        return c.json({ success: true });
    } catch (error: any) {
        console.error('Mark notification read error:', error);
        return c.json({ success: false, error: 'Failed to mark notification as read' }, 500);
    }
});

// Mark all notifications as read
notificationsRoutes.put('/read-all', async (c) => {
    const db = c.get('db');
    const user = c.get('user')!;

    try {
        await db.update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.userId, user.id));

        return c.json({ success: true });
    } catch (error: any) {
        console.error('Mark all read error:', error);
        return c.json({ success: false, error: 'Failed to mark all as read' }, 500);
    }
});

// Helper function to create notification (used by other routes)
export async function createNotification(
    db: any,
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: any
) {
    try {
        await db.insert(notifications).values({
            id: nanoid(),
            userId,
            type,
            title,
            message,
            data: data ? JSON.stringify(data) : null,
            isRead: false,
            createdAt: new Date().toISOString(),
        });
        return true;
    } catch (error) {
        console.error('Create notification error:', error);
        return false;
    }
}

// Admin: Send notification to a user
const sendNotificationSchema = z.object({
    userId: z.string(),
    type: z.string(),
    title: z.string().min(1).max(100),
    message: z.string().min(1).max(500),
    data: z.any().optional(),
});

notificationsRoutes.post('/admin/send', zValidator('json', sendNotificationSchema), async (c) => {
    const db = c.get('db');
    const data = c.req.valid('json');

    try {
        const success = await createNotification(
            db,
            data.userId,
            data.type,
            data.title,
            data.message,
            data.data
        );

        if (success) {
            return c.json({ success: true, message: 'Notification sent' });
        } else {
            return c.json({ success: false, error: 'Failed to send notification' }, 500);
        }
    } catch (error: any) {
        console.error('Admin send notification error:', error);
        return c.json({ success: false, error: 'Failed to send notification' }, 500);
    }
});
