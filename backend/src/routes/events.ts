import { Hono } from 'hono';
import { eq, desc, asc, and, or, gte, lte, sql, count } from 'drizzle-orm';
import { events, eventOptions, tickets } from '../db/schema';
import { optionalAuth } from '../middleware/auth';
import { AppContext } from '../types';

const eventsRoutes = new Hono<AppContext>();

eventsRoutes.use('*', optionalAuth);

// Get all active/upcoming events
eventsRoutes.get('/', async (c) => {
  const db = c.get('db');
  const { category, status, page = '1', limit = '20' } = c.req.query();

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [
    or(
      eq(events.status, 'upcoming'),
      eq(events.status, 'open'),
      eq(events.status, 'locked')
    ),
  ];

  if (category) {
    conditions.push(eq(events.category, category as any));
  }

  if (status && ['upcoming', 'open', 'locked'].includes(status)) {
    // Override status filter if specified
    conditions.length = 0;
    conditions.push(eq(events.status, status as any));
  }

  const whereClause = and(...conditions);

  const [eventsList, totalResult] = await Promise.all([
    db.query.events.findMany({
      where: whereClause,
      with: { options: true },
      orderBy: [asc(events.eventTime)],
      limit: limitNum,
      offset,
    }),
    db.select({ count: count() }).from(events).where(whereClause),
  ]);

  // Add ticket counts
  const eventsWithCounts = await Promise.all(
    eventsList.map(async (event) => {
      const ticketCount = await db.select({ count: count() })
        .from(tickets)
        .where(eq(tickets.eventId, event.id));

      const totalPool = event.options.reduce((sum, opt) => sum + (opt.poolAmount || 0), 0);

      return {
        ...event,
        ticketCount: ticketCount[0]?.count || 0,
        totalPool,
      };
    })
  );

  return c.json({
    success: true,
    data: eventsWithCounts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalResult[0]?.count || 0,
      pages: Math.ceil((totalResult[0]?.count || 0) / limitNum),
    },
  });
});

// Get single event by ID
eventsRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
    with: { options: true },
  });

  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  // Get ticket count
  const ticketCount = await db.select({ count: count() })
    .from(tickets)
    .where(eq(tickets.eventId, id));

  const totalPool = event.options.reduce((sum, opt) => sum + (opt.poolAmount || 0), 0);

  // Get user's tickets if authenticated
  const user = c.get('user');
  let userTickets: any[] = [];

  if (user) {
    userTickets = await db.query.tickets.findMany({
      where: and(eq(tickets.eventId, id), eq(tickets.userId, user.id)),
      orderBy: [desc(tickets.createdAt)],
    });
  }

  return c.json({
    success: true,
    data: {
      ...event,
      ticketCount: ticketCount[0]?.count || 0,
      totalPool,
      userTickets,
    },
  });
});

// Get resolved events (for history)
eventsRoutes.get('/history/resolved', async (c) => {
  const db = c.get('db');
  const { category, page = '1', limit = '20' } = c.req.query();

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(events.status, 'resolved')];
  if (category) conditions.push(eq(events.category, category as any));

  const whereClause = and(...conditions);

  const [eventsList, totalResult] = await Promise.all([
    db.query.events.findMany({
      where: whereClause,
      with: { options: true },
      orderBy: [desc(events.resolvedAt)],
      limit: limitNum,
      offset,
    }),
    db.select({ count: count() }).from(events).where(whereClause),
  ]);

  return c.json({
    success: true,
    data: eventsList,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalResult[0]?.count || 0,
      pages: Math.ceil((totalResult[0]?.count || 0) / limitNum),
    },
  });
});

// Get live pool stats for an event (for real-time updates)
eventsRoutes.get('/:id/pool', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();

  const options = await db.query.eventOptions.findMany({
    where: eq(eventOptions.eventId, id),
  });

  const totalPool = options.reduce((sum, opt) => sum + (opt.poolAmount || 0), 0);
  const totalTickets = options.reduce((sum, opt) => sum + (opt.ticketsSold || 0), 0);

  return c.json({
    success: true,
    data: {
      eventId: id,
      totalPool,
      totalTickets,
      options: options.map(opt => ({
        optionId: opt.optionId,
        label: opt.label,
        ticketsSold: opt.ticketsSold,
        ticketsRemaining: opt.ticketLimit - (opt.ticketsSold || 0),
        poolAmount: opt.poolAmount,
        percentage: totalPool > 0 ? ((opt.poolAmount || 0) / totalPool) * 100 : 0,
      })),
    },
  });
});

// Get all featured/jackpot events (public) - renamed from "jackpot" to avoid ad blocker keyword filters
eventsRoutes.get('/featured/active', async (c) => {
  const db = c.get('db');

  // Get ALL jackpot events (not just one)
  const jackpots = await db.query.events.findMany({
    where: and(
      eq(events.isJackpot, true),
      or(eq(events.status, 'open'), eq(events.status, 'upcoming'), eq(events.status, 'locked'))
    ),
    with: { options: true },
    orderBy: [asc(events.eventTime)],
  });

  if (jackpots.length === 0) {
    return c.json({ success: true, data: null, jackpots: [] });
  }

  // Get ticket counts and pools for all jackpots
  const jackpotsWithCounts = await Promise.all(
    jackpots.map(async (jackpot) => {
      const ticketCount = await db.select({ count: count() })
        .from(tickets)
        .where(eq(tickets.eventId, jackpot.id));

      const totalPool = jackpot.options.reduce((sum, opt) => sum + (opt.poolAmount || 0), 0);

      return {
        ...jackpot,
        ticketCount: ticketCount[0]?.count || 0,
        totalPool,
      };
    })
  );

  // Return first as "data" for backward compatibility, plus all jackpots
  return c.json({
    success: true,
    data: jackpotsWithCounts[0], // First jackpot for backward compatibility
    jackpots: jackpotsWithCounts, // All jackpots
  });
});

// Get jackpot results (resolved/cancelled) from last 3 days
eventsRoutes.get('/jackpot/results', async (c) => {
  const db = c.get('db');

  // Calculate 3 days ago
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Get resolved or cancelled jackpot events from last 3 days
  const results = await db.query.events.findMany({
    where: and(
      eq(events.isJackpot, true),
      or(eq(events.status, 'resolved'), eq(events.status, 'cancelled')),
      gte(events.resolvedAt, threeDaysAgo)
    ),
    with: { options: true },
    orderBy: [desc(events.resolvedAt)],
    limit: 20,
  });

  // Enrich with ticket counts
  const resultsWithCounts = await Promise.all(
    results.map(async (event) => {
      // Get winning option
      const winningOption = event.options.find(opt => opt.isWinner);

      // Count winning and losing tickets
      let winningTickets = 0;
      let losingTickets = 0;
      let totalPayout = 0;

      if (event.status === 'resolved' && winningOption) {
        const ticketStats = await db.select({
          status: tickets.status,
          count: count(),
        })
          .from(tickets)
          .where(eq(tickets.eventId, event.id))
          .groupBy(tickets.status);

        for (const stat of ticketStats) {
          if (stat.status === 'won' || stat.status === 'claimed') {
            winningTickets += stat.count;
          } else if (stat.status === 'lost') {
            losingTickets += stat.count;
          }
        }

        // Total payout = pool amount that goes to winners
        const losingPool = event.options
          .filter(opt => !opt.isWinner)
          .reduce((sum, opt) => sum + (opt.poolAmount || 0), 0);
        totalPayout = losingPool;
      } else if (event.status === 'cancelled') {
        // For cancelled events, count refunded tickets
        const refundedCount = await db.select({ count: count() })
          .from(tickets)
          .where(and(eq(tickets.eventId, event.id), eq(tickets.status, 'refunded')));
        winningTickets = refundedCount[0]?.count || 0;
        totalPayout = event.totalPool || 0; // Full refund
      }

      const totalTickets = winningTickets + losingTickets;
      const totalPool = event.options.reduce((sum, opt) => sum + (opt.poolAmount || 0), 0);

      return {
        id: event.id,
        title: event.title,
        status: event.status,
        resolvedAt: event.resolvedAt,
        winningOption: winningOption ? {
          label: winningOption.label,
          ticketsSold: winningOption.ticketsSold || 0,
          poolAmount: winningOption.poolAmount || 0,
        } : null,
        totalPool,
        totalTickets,
        winningTickets,
        losingTickets,
        totalPayout,
      };
    })
  );

  return c.json({ success: true, data: resultsWithCounts });
});

export default eventsRoutes;

