import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { AppContext } from '../types';
import { eventMessages, events } from '../db/schema';

export const chatRoutes = new Hono<AppContext>();

// Get messages for an event
chatRoutes.get('/:eventId', async (c) => {
    const db = c.get('db');
    const { eventId } = c.req.param();

    try {
        // Check if event exists
        const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
        });

        if (!event) {
            return c.json({ success: false, error: 'Event not found' }, 404);
        }

        // Get messages (latest 100)
        const messages = await db
            .select()
            .from(eventMessages)
            .where(eq(eventMessages.eventId, eventId))
            .orderBy(desc(eventMessages.createdAt))
            .limit(100);

        // Reverse to show oldest first
        messages.reverse();

        return c.json({
            success: true,
            data: {
                event: {
                    id: event.id,
                    title: event.title,
                    status: event.status,
                },
                messages: messages.map(m => ({
                    id: m.id,
                    walletAddress: m.walletAddress,
                    message: m.message,
                    createdAt: m.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return c.json({ success: false, error: 'Failed to fetch messages' }, 500);
    }
});

// Post a new message
const postMessageSchema = z.object({
    walletAddress: z.string().min(32).max(64),
    message: z.string().min(1).max(500).trim(),
});

chatRoutes.post('/:eventId', zValidator('json', postMessageSchema), async (c) => {
    const db = c.get('db');
    const { eventId } = c.req.param();
    const { walletAddress, message } = c.req.valid('json');

    try {
        // Check if event exists and is active
        const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
        });

        if (!event) {
            return c.json({ success: false, error: 'Event not found' }, 404);
        }

        // Only allow chat on open/upcoming events
        if (!['open', 'upcoming', 'locked'].includes(event.status || '')) {
            return c.json({ success: false, error: 'Chat is closed for this event' }, 400);
        }

        // Create message
        const newMessage = {
            id: nanoid(),
            eventId,
            walletAddress,
            message,
            createdAt: new Date(),
        };

        await db.insert(eventMessages).values(newMessage);

        return c.json({
            success: true,
            data: {
                id: newMessage.id,
                walletAddress: newMessage.walletAddress,
                message: newMessage.message,
                createdAt: newMessage.createdAt,
            },
        });
    } catch (error) {
        console.error('Error posting message:', error);
        return c.json({ success: false, error: 'Failed to post message' }, 500);
    }
});

// Delete all messages for an event (admin only or auto-cleanup)
chatRoutes.delete('/:eventId', async (c) => {
    const db = c.get('db');
    const { eventId } = c.req.param();

    try {
        await db.delete(eventMessages).where(eq(eventMessages.eventId, eventId));
        return c.json({ success: true, message: 'Messages deleted' });
    } catch (error) {
        console.error('Error deleting messages:', error);
        return c.json({ success: false, error: 'Failed to delete messages' }, 500);
    }
});
