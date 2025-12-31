import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';
import { nanoid } from 'nanoid';
import { createDb } from './db';
import { AppContext, Env } from './types';

// Routes
import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import ticketsRoutes from './routes/tickets';
import adminRoutes from './routes/admin';
import referralsRoutes from './routes/referrals';
import { sportsApi } from './routes/sports';
import { chatRoutes } from './routes/chat';
import { notificationsRoutes } from './routes/notifications';
import { blogRoutes } from './routes/blog';
import { newsRoutes } from './routes/news';
import { uploadRoutes } from './routes/upload';

const app = new Hono<AppContext>();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Request ID
app.use('*', async (c, next) => {
  c.set('requestId', nanoid());
  await next();
});

// CORS - Allow all origins for maximum browser compatibility
app.use('*', cors({
  origin: '*',  // Allow all origins - needed for mobile/Web3 browsers
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Wallet-Address'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: false,  // Must be false when origin is '*'
}));

// Security headers
app.use('*', secureHeaders());

// Logger (dev only)
app.use('*', logger());

// Database middleware
app.use('*', async (c, next) => {
  const db = createDb(c.env.DB);
  c.set('db', db);
  await next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'BetPot API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/events', eventsRoutes);
app.route('/api/tickets', ticketsRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/referrals', referralsRoutes);
app.route('/api/sports', sportsApi);
app.route('/api/chat', chatRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/blog', blogRoutes);
app.route('/api/news', newsRoutes);
app.route('/api/upload', uploadRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.onError((err, c) => {
  console.error(`Error [${c.get('requestId')}]:`, err);

  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: err.message,
      requestId: c.get('requestId'),
    }, err.status);
  }

  return c.json({
    success: false,
    error: 'Internal server error',
    requestId: c.get('requestId'),
  }, 500);
});

app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
    path: c.req.path,
  }, 404);
});

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  fetch: app.fetch,

  // Scheduled handler - runs every 5 minutes to auto-lock events
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('Running scheduled task:', event.cron);

    // Initialize database
    const { drizzle } = await import('drizzle-orm/d1');
    const { events, tickets, notifications } = await import('./db/schema');
    const { eq, and, lte, or, sql } = await import('drizzle-orm');

    const db = drizzle(env.DB);
    const now = new Date();

    try {
      // 1. AUTO-OPEN: Find scheduled events that should now be open (startTime has passed)
      const eventsToOpen = await db.select()
        .from(events)
        .where(and(
          eq(events.status, 'upcoming'),
          lte(events.startTime, now)
        ));

      console.log(`Found ${eventsToOpen.length} scheduled events to auto-open`);

      for (const event of eventsToOpen) {
        await db.update(events)
          .set({ status: 'open', updatedAt: now })
          .where(eq(events.id, event.id));

        console.log(`Opened event: ${event.title}`);
      }

      // 2. AUTO-LOCK: Find events that should be locked (past lockTime, still open)
      const eventsToLock = await db.select()
        .from(events)
        .where(and(
          or(eq(events.status, 'open'), eq(events.status, 'upcoming')),
          lte(events.lockTime, now)
        ));

      console.log(`Found ${eventsToLock.length} events to auto-lock`);

      for (const event of eventsToLock) {
        // Lock the event
        await db.update(events)
          .set({ status: 'locked', updatedAt: now })
          .where(eq(events.id, event.id));

        console.log(`Locked event: ${event.title}`);

        // Get all users who bet on this event
        const eventTickets = await db.select({ userId: tickets.userId })
          .from(tickets)
          .where(eq(tickets.eventId, event.id));

        const uniqueUserIds = [...new Set(eventTickets.map(t => t.userId))];

        // Send notifications
        for (const userId of uniqueUserIds) {
          await db.insert(notifications).values({
            id: crypto.randomUUID(),
            userId,
            type: 'event_ending',
            title: 'Betting Closed',
            message: `Betting is now closed for "${event.title}". Results coming soon!`,
            data: JSON.stringify({ eventId: event.id }),
            isRead: false,
          });
        }

        console.log(`Sent notifications to ${uniqueUserIds.length} users for event: ${event.title}`);
      }

      // 3. AUTO-RESOLVE CHECK: Find locked events where eventTime has passed (match should be finished)
      // Events immediately appear in Resolve tab - admin resolves them manually

      const eventsToResolve = await db.select()
        .from(events)
        .where(and(
          eq(events.status, 'locked'),
          lte(events.eventTime, now)
        ));

      console.log(`Found ${eventsToResolve.length} events to auto-resolve`);

      for (const event of eventsToResolve) {
        try {
          // Only auto-resolve sports events with proper title format
          if (!event.title || !event.title.includes(' vs ')) {
            console.log(`Skipping event ${event.title} - not a sports match format`);
            continue;
          }

          // Fetch match result from API-Sports
          const apiKey = env.API_SPORTS_KEY;
          // Parse team names from title

          // Parse team names from title
          const teamMatch = event.title.match(/(.+?)\s+vs\.?\s+(.+)/i);
          if (!teamMatch) {
            console.log(`Could not parse teams from: ${event.title}`);
            continue;
          }

          const searchHome = teamMatch[1].trim().toLowerCase();
          const searchAway = teamMatch[2].trim().toLowerCase();

          // Search finished matches from today and yesterday
          const today = new Date().toISOString().split('T')[0];
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          let matchResult = null;

          // Try today's fixtures
          const todayResponse = await fetch(
            `https://v3.football.api-sports.io/fixtures?date=${today}`,
            { headers: { 'x-apisports-key': apiKey } }
          );

          if (todayResponse.ok) {
            const todayData: any = await todayResponse.json();
            const fixtures = todayData.response || [];

            matchResult = fixtures.find((f: any) => {
              if (f.fixture.status.long !== 'Match Finished') return false;
              const home = f.teams.home.name.toLowerCase();
              const away = f.teams.away.name.toLowerCase();
              return (home.includes(searchHome) || searchHome.includes(home.split(' ')[0])) &&
                (away.includes(searchAway) || searchAway.includes(away.split(' ')[0]));
            });
          }

          // Try yesterday if not found
          if (!matchResult) {
            const yesterdayResponse = await fetch(
              `https://v3.football.api-sports.io/fixtures?date=${yesterday}`,
              { headers: { 'x-apisports-key': apiKey } }
            );

            if (yesterdayResponse.ok) {
              const yesterdayData: any = await yesterdayResponse.json();
              const fixtures = yesterdayData.response || [];

              matchResult = fixtures.find((f: any) => {
                if (f.fixture.status.long !== 'Match Finished') return false;
                const home = f.teams.home.name.toLowerCase();
                const away = f.teams.away.name.toLowerCase();
                return (home.includes(searchHome) || searchHome.includes(home.split(' ')[0])) &&
                  (away.includes(searchAway) || searchAway.includes(away.split(' ')[0]));
              });
            }
          }

          if (!matchResult) {
            console.log(`Match result not found yet for: ${event.title}`);
            continue;
          }

          // Determine winner
          const homeScore = matchResult.goals.home ?? 0;
          const awayScore = matchResult.goals.away ?? 0;
          let winnerType = 'draw';
          if (homeScore > awayScore) winnerType = 'home';
          else if (awayScore > homeScore) winnerType = 'away';

          // Find the winning option
          const { eventOptions: eventOptionsTable } = await import('./db/schema');
          const eventOpts = await db.select().from(eventOptionsTable)
            .where(eq(eventOptionsTable.eventId, event.id));

          const winningOption = eventOpts.find(opt => {
            const optLabel = opt.label?.toLowerCase() || '';
            const optType = (opt as any).type?.toLowerCase() || '';

            if (winnerType === 'home') {
              return optType === 'home' || optLabel.includes(searchHome);
            } else if (winnerType === 'away') {
              return optType === 'away' || optLabel.includes(searchAway);
            } else {
              return optType === 'draw' || optLabel.toLowerCase() === 'draw';
            }
          });

          if (!winningOption) {
            console.log(`Could not find winning option for ${event.title}, winner: ${winnerType}`);
            continue;
          }

          // Get total pool for payout calculation
          const totalPool = eventOpts.reduce((sum, opt) => sum + (opt.poolAmount || 0), 0);
          const winningPool = winningOption.poolAmount || 0;
          const winningTickets = winningOption.ticketsSold || 0;

          if (winningTickets === 0 || winningPool === 0) {
            // No winning tickets - just mark as resolved
            await db.update(events)
              .set({
                status: 'resolved',
                winningOption: winningOption.optionId,
                resolvedAt: now,
                updatedAt: now,
              })
              .where(eq(events.id, event.id));
            console.log(`Auto-resolved ${event.title} (no winners) - Result: ${homeScore}-${awayScore}`);
            continue;
          }

          // Calculate payout per ticket (proportional share of pool)
          const platformFee = totalPool * 0.01; // 1% platform fee
          const payoutPool = totalPool - platformFee;
          const payoutPerTicket = payoutPool / winningTickets;

          // Update winning tickets
          await db.update(tickets)
            .set({
              status: 'won',
              payoutAmount: payoutPerTicket,
              payoutSolAmount: payoutPerTicket, // Using SOL directly
              updatedAt: now,
            })
            .where(and(
              eq(tickets.eventId, event.id),
              eq(tickets.optionId, winningOption.id)
            ));

          // Update losing tickets
          await db.update(tickets)
            .set({
              status: 'lost',
              updatedAt: now,
            })
            .where(and(
              eq(tickets.eventId, event.id),
              sql`${tickets.optionId} != ${winningOption.id}`
            ));

          // Update event status to resolved
          await db.update(events)
            .set({
              status: 'resolved',
              winningOption: winningOption.optionId,
              resolvedAt: now,
              updatedAt: now,
            })
            .where(eq(events.id, event.id));

          console.log(`Auto-resolved ${event.title} - Result: ${homeScore}-${awayScore}, Winner: ${winningOption.label}, Payout: ${payoutPerTicket.toFixed(4)} SOL per ticket`);

          // Notify winning bettors
          const winningBettors = await db.select({ userId: tickets.userId })
            .from(tickets)
            .where(and(
              eq(tickets.eventId, event.id),
              eq(tickets.status, 'won')
            ));

          for (const bettor of winningBettors) {
            await db.insert(notifications).values({
              id: crypto.randomUUID(),
              userId: bettor.userId,
              type: 'ticket_won',
              title: 'You Won!',
              message: `Your bet on "${winningOption.label}" in "${event.title}" won! You can claim ${payoutPerTicket.toFixed(4)} SOL.`,
              data: JSON.stringify({ eventId: event.id, payout: payoutPerTicket }),
              isRead: false,
            });
          }

        } catch (resolveError) {
          console.error(`Error auto-resolving ${event.title}:`, resolveError);
        }
      }

      // 4. STALE PROCESSING CLEANUP: Reset tickets stuck in 'processing' for too long
      // This handles cases where payout failed mid-way and ticket got stuck
      const { CONFIG } = await import('./config');
      const staleThreshold = new Date(now.getTime() - CONFIG.PROCESSING_TIMEOUT_MINUTES * 60 * 1000);

      // Find tickets that have been in 'processing' state for too long
      const staleTickets = await db.select()
        .from(tickets)
        .where(and(
          eq(tickets.status, 'processing'),
          lte(tickets.updatedAt, staleThreshold)
        ));

      if (staleTickets.length > 0) {
        console.log(`Found ${staleTickets.length} stale processing tickets to reset`);

        // Reset them back to 'won' or 'refunded' based on their payout amount
        // We assume if they have a payout amount, they were 'won', otherwise 'refunded'
        for (const ticket of staleTickets) {
          const originalStatus = (ticket.payoutAmount || 0) > 0 ? 'won' : 'refunded';
          await db.update(tickets)
            .set({ status: originalStatus, updatedAt: now })
            .where(eq(tickets.id, ticket.id));
          console.log(`Reset stale ticket ${ticket.id} from 'processing' to '${originalStatus}'`);
        }
      }

      console.log('Scheduled task completed successfully');
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  },
};

// Durable Object for real-time event updates (optional)
export class EventsDurableObject {
  private state: DurableObjectState;
  private connections: Set<WebSocket> = new Set();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/websocket') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected websocket', { status: 400 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleWebSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    if (url.pathname === '/broadcast') {
      const data = await request.json();
      this.broadcast(data);
      return new Response('OK');
    }

    return new Response('Not found', { status: 404 });
  }

  handleWebSocket(ws: WebSocket) {
    ws.accept();
    this.connections.add(ws);

    ws.addEventListener('close', () => {
      this.connections.delete(ws);
    });

    ws.addEventListener('error', () => {
      this.connections.delete(ws);
    });
  }

  broadcast(data: unknown) {
    const message = JSON.stringify(data);
    for (const ws of this.connections) {
      try {
        ws.send(message);
      } catch {
        this.connections.delete(ws);
      }
    }
  }
}
