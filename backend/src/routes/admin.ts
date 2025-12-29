import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, desc, asc, sql, and, gte, lte, like, or, count, sum } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth, requireAdmin, requireSuperAdmin } from '../middleware/auth';
import { events, eventOptions, tickets, users, adminAuditLogs, platformSettings, failedTransactions, resolutionApprovals } from '../db/schema';
import { AppContext } from '../types';
import { createNotification } from './notifications';

const admin = new Hono<AppContext>();

// Apply auth + admin middleware to all routes
admin.use('*', auth, requireAdmin);

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

admin.get('/dashboard', async (c) => {
  try {
    const db = c.get('db');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsersResult,
      totalEventsResult,
      totalTicketsResult,
      activeEventsResult,
      pendingResolutionResult,
      todayTicketsResult,
      weekTicketsResult,
      monthTicketsResult,
      totalVolumeResult,
      recentActivity,
      topEvents,
      winnerStats,
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(events),
      db.select({ count: count() }).from(tickets),
      db.select({ count: count() }).from(events).where(
        or(eq(events.status, 'open'), eq(events.status, 'upcoming'))
      ),
      db.select({ count: count() }).from(events).where(eq(events.status, 'locked')),
      db.select({ count: count() }).from(tickets).where(gte(tickets.createdAt, today)),
      db.select({ count: count() }).from(tickets).where(gte(tickets.createdAt, weekAgo)),
      db.select({ count: count() }).from(tickets).where(gte(tickets.createdAt, monthAgo)),
      // Volume: prefer SOL amount, fallback to USDC (legacy data)
      db.select({
        totalSol: sql<number>`COALESCE(SUM(${tickets.solAmount}), 0)`,
        totalUsd: sum(tickets.purchasePrice)
      }).from(tickets),
      db.query.adminAuditLogs.findMany({
        limit: 15,
        orderBy: [desc(adminAuditLogs.createdAt)],
        with: { admin: { columns: { email: true } } },
      }),
      db.query.events.findMany({
        where: or(eq(events.status, 'open'), eq(events.status, 'locked')),
        limit: 10,
        orderBy: [desc(events.createdAt)],
        with: { options: true },
      }),
      // Winner and loser statistics - prefer SOL amounts, fallback to USDC
      db.select({
        totalWinners: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} IN ('won', 'claimed') THEN 1 ELSE 0 END), 0)`,
        totalLosers: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'lost' THEN 1 ELSE 0 END), 0)`,
        totalPayoutSol: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} IN ('won', 'claimed') THEN ${tickets.payoutSolAmount} ELSE 0 END), 0)`,
        totalPayoutUsd: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} IN ('won', 'claimed') THEN ${tickets.payoutAmount} ELSE 0 END), 0)`,
      }).from(tickets),
    ]);

    // Get ticket counts for top events
    const topEventsWithCounts = await Promise.all(
      topEvents.map(async (event) => {
        const ticketCount = await db.select({ count: count() })
          .from(tickets)
          .where(eq(tickets.eventId, event.id));
        return { ...event, ticketCount: ticketCount[0]?.count || 0 };
      })
    );

    // Sales trend (last 7 days)
    const salesTrend = await db.select({
      date: sql<string>`date(${tickets.createdAt})`,
      ticketCount: count(),
      volume: sum(tickets.purchasePrice),
    })
      .from(tickets)
      .where(gte(tickets.createdAt, weekAgo))
      .groupBy(sql`date(${tickets.createdAt})`)
      .orderBy(desc(sql`date(${tickets.createdAt})`));

    return c.json({
      success: true,
      data: {
        overview: {
          totalUsers: totalUsersResult[0]?.count || 0,
          totalEvents: totalEventsResult[0]?.count || 0,
          totalTickets: totalTicketsResult[0]?.count || 0,
          activeEvents: activeEventsResult[0]?.count || 0,
          pendingResolution: pendingResolutionResult[0]?.count || 0,
          // Volume in SOL (accurate) and USD (current value)
          totalVolumeSol: totalVolumeResult[0]?.totalSol || 0,
          totalVolumeUsd: totalVolumeResult[0]?.totalUsd || 0,
          totalVolume: totalVolumeResult[0]?.totalSol || 0, // Legacy: now SOL
          totalWinners: winnerStats[0]?.totalWinners || 0,
          totalLosers: winnerStats[0]?.totalLosers || 0,
          // Payouts in SOL (accurate) and USD (current value)
          totalPayoutsSol: winnerStats[0]?.totalPayoutSol || 0,
          totalPayoutsUsd: winnerStats[0]?.totalPayoutUsd || 0,
          totalPayouts: winnerStats[0]?.totalPayoutSol || 0, // Legacy: now SOL
        },
        ticketStats: {
          today: todayTicketsResult[0]?.count || 0,
          week: weekTicketsResult[0]?.count || 0,
          month: monthTicketsResult[0]?.count || 0,
        },
        salesTrend,
        recentActivity,
        topEvents: topEventsWithCounts,
      },
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return c.json({
      success: false,
      error: 'Failed to load dashboard',
    }, 500);
  }
});

// ============================================================================
// AUDIT LOGS
// ============================================================================

// Get admin audit logs with pagination
admin.get('/audit-logs', async (c) => {
  const db = c.get('db');
  const {
    action,
    page = '1',
    limit = '50',
  } = c.req.query();

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100); // Cap at 100
  const offset = (pageNum - 1) * limitNum;

  try {
    // Build filter conditions
    const conditions = [];
    if (action) {
      conditions.push(eq(adminAuditLogs.action, action));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get logs
    const logs = await db.query.adminAuditLogs.findMany({
      where: whereClause,
      orderBy: [desc(adminAuditLogs.createdAt)],
      limit: limitNum,
      offset,
    });

    // Get total count
    const totalResult = await db.select({ count: count() })
      .from(adminAuditLogs)
      .where(whereClause);

    return c.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalResult[0]?.count || 0,
        pages: Math.ceil((totalResult[0]?.count || 0) / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Audit logs error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch audit logs',
    }, 500);
  }
});

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

// List all events with filters and pagination
admin.get('/events', async (c) => {
  const db = c.get('db');
  const {
    status,
    category,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = '1',
    limit = '20',
  } = c.req.query();

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  // Build where conditions
  const conditions = [];
  if (status) conditions.push(eq(events.status, status as any));
  if (category) conditions.push(eq(events.category, category as any));
  if (search) {
    conditions.push(
      or(
        like(events.title, `%${search}%`),
        like(events.id, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [eventsList, totalResult] = await Promise.all([
    db.query.events.findMany({
      where: whereClause,
      with: { options: true },
      orderBy: sortOrder === 'asc' ? [asc(events[sortBy as keyof typeof events] as any)] : [desc(events[sortBy as keyof typeof events] as any)],
      limit: limitNum,
      offset,
    }),
    db.select({ count: count() }).from(events).where(whereClause),
  ]);

  // Get ticket counts for each event
  const eventsWithCounts = await Promise.all(
    eventsList.map(async (event) => {
      const ticketCount = await db.select({ count: count() })
        .from(tickets)
        .where(eq(tickets.eventId, event.id));
      return { ...event, ticketCount: ticketCount[0]?.count || 0 };
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

// Get events pending resolution (locked + eventTime passed)
admin.get('/events/pending-resolve', async (c) => {
  const db = c.get('db');
  const now = new Date();

  try {
    // Get all locked events where eventTime has passed
    const pendingEvents = await db.query.events.findMany({
      where: and(
        eq(events.status, 'locked'),
        lte(events.eventTime, now)
      ),
      with: { options: true },
      orderBy: [desc(events.eventTime)],
    });

    // Add ticket counts and pool amounts
    const eventsWithDetails = await Promise.all(
      pendingEvents.map(async (event) => {
        const ticketCount = await db.select({ count: count() })
          .from(tickets)
          .where(eq(tickets.eventId, event.id));
        const totalPool = await db.select({ total: sum(tickets.purchasePrice) })
          .from(tickets)
          .where(eq(tickets.eventId, event.id));
        return {
          ...event,
          ticketCount: ticketCount[0]?.count || 0,
          totalPool: totalPool[0]?.total || 0,
        };
      })
    );

    return c.json({
      success: true,
      data: eventsWithDetails,
      count: eventsWithDetails.length,
    });
  } catch (error: any) {
    console.error('Pending resolve error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch pending resolution events',
    }, 500);
  }
});

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(['sports', 'finance', 'crypto', 'politics', 'entertainment', 'news', 'other']),
  ticketPrice: z.number().min(1).max(10000).optional(),
  ticketLimit: z.number().min(10).max(1000000).optional(), // Total tickets for event
  imageUrl: z.string().url().optional(),
  options: z.array(z.object({
    label: z.string().min(1).max(100),
  })).min(2).max(6),
  startTime: z.string().datetime(),
  lockTime: z.string().datetime(),
  eventTime: z.string().datetime(),
  status: z.enum(['draft', 'upcoming']).optional(),
  isJackpot: z.boolean().optional(),
});

// Create new event
admin.post('/events', zValidator('json', createEventSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const data = c.req.valid('json');

  const startTime = new Date(data.startTime);
  const lockTime = new Date(data.lockTime);
  const eventTime = new Date(data.eventTime);

  if (startTime >= lockTime || lockTime >= eventTime) {
    return c.json({ success: false, error: 'Invalid times: start < lock < event required' }, 400);
  }

  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxEvents = parseInt(c.env.MAX_EVENTS_PER_DAY || '3');

  const todayEventsResult = await db.select({ count: count() })
    .from(events)
    .where(gte(events.createdAt, today));

  if ((todayEventsResult[0]?.count || 0) >= maxEvents) {
    return c.json({ success: false, error: `Maximum ${maxEvents} events per day` }, 400);
  }

  const eventId = nanoid();
  const ticketPrice = data.ticketPrice || parseFloat(c.env.TICKET_PRICE || '10');
  const now = new Date();

  // Create event
  await db.insert(events).values({
    id: eventId,
    title: data.title,
    description: data.description,
    category: data.category,
    ticketPrice,
    ticketLimit: data.ticketLimit || 10000,
    ticketsSold: 0,
    imageUrl: data.imageUrl,
    startTime,
    lockTime,
    eventTime,
    status: data.status || (now >= startTime ? 'open' : 'upcoming'),
    isJackpot: data.isJackpot ?? false,
    createdAt: now,
    updatedAt: now,
  });

  // Create options (no per-option ticket limits - event-level limit applies)
  const optionsToInsert = data.options.map((opt, index) => ({
    id: nanoid(),
    eventId,
    optionId: String.fromCharCode(65 + index), // A, B, C, D...
    label: opt.label,
    ticketLimit: 0, // Not used - event-level ticketLimit applies
    ticketsSold: 0,
    poolAmount: 0,
    isWinner: false,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(eventOptions).values(optionsToInsert);

  // Audit log
  await db.insert(adminAuditLogs).values({
    id: nanoid(),
    adminId: user.id,
    action: 'CREATE_EVENT',
    entityType: 'Event',
    entityId: eventId,
    details: JSON.stringify({ title: data.title, category: data.category }),
    ipAddress: c.req.header('CF-Connecting-IP'),
    userAgent: c.req.header('User-Agent'),
    createdAt: now,
  });

  const createdEvent = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: { options: true },
  });

  return c.json({ success: true, data: createdEvent }, 201);
});

// Get single event with full details
admin.get('/events/:id', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
    with: {
      options: true,
    },
  });

  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  // Get tickets with user info
  const eventTickets = await db.query.tickets.findMany({
    where: eq(tickets.eventId, id),
    with: { user: { columns: { email: true, walletAddress: true } } },
    orderBy: [desc(tickets.createdAt)],
    limit: 500,
  });

  return c.json({
    success: true,
    data: { ...event, tickets: eventTickets },
  });
});

// Update event
const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  ticketPrice: z.number().min(1).max(10000).optional(),
  imageUrl: z.string().url().optional().nullable(),
  status: z.enum(['draft', 'upcoming', 'open']).optional(),
});

admin.put('/events/:id', zValidator('json', updateEventSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const event = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  if (!['draft', 'upcoming', 'open'].includes(event.status)) {
    return c.json({ success: false, error: 'Cannot edit locked/resolved event' }, 400);
  }

  await db.update(events)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(events.id, id));

  await db.insert(adminAuditLogs).values({
    id: nanoid(),
    adminId: user.id,
    action: 'UPDATE_EVENT',
    entityType: 'Event',
    entityId: id,
    details: JSON.stringify(data),
    ipAddress: c.req.header('CF-Connecting-IP'),
    createdAt: new Date(),
  });

  const updated = await db.query.events.findFirst({
    where: eq(events.id, id),
    with: { options: true },
  });

  return c.json({ success: true, data: updated });
});

// Lock event
admin.post('/events/:id/lock', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();

  const event = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  if (event.status !== 'open') {
    return c.json({ success: false, error: 'Only open events can be locked' }, 400);
  }

  await db.update(events)
    .set({ status: 'locked', updatedAt: new Date() })
    .where(eq(events.id, id));

  await db.insert(adminAuditLogs).values({
    id: nanoid(),
    adminId: user.id,
    action: 'LOCK_EVENT',
    entityType: 'Event',
    entityId: id,
    ipAddress: c.req.header('CF-Connecting-IP'),
    createdAt: new Date(),
  });

  // Notify all users who bet on this event that betting is now closed
  try {
    const eventTickets = await db.query.tickets.findMany({
      where: eq(tickets.eventId, id),
      columns: { userId: true },
    });
    const uniqueUserIds = [...new Set(eventTickets.map(t => t.userId))];

    for (const userId of uniqueUserIds) {
      await createNotification(db, {
        userId,
        type: 'event_ending',
        title: 'Betting Closed',
        message: `Betting is now closed for "${event.title}". Results coming soon!`,
        eventId: id,
      });
    }
  } catch (err) {
    console.error('Error sending lock notifications:', err);
  }

  return c.json({ success: true, message: 'Event locked' });
});

// Unlock event (reverse a mistaken lock)
admin.post('/events/:id/unlock', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();

  const event = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  if (event.status !== 'locked') {
    return c.json({ success: false, error: 'Only locked events can be unlocked' }, 400);
  }

  await db.update(events)
    .set({ status: 'open', updatedAt: new Date() })
    .where(eq(events.id, id));

  await db.insert(adminAuditLogs).values({
    id: nanoid(),
    adminId: user.id,
    action: 'UNLOCK_EVENT',
    entityType: 'Event',
    entityId: id,
    ipAddress: c.req.header('CF-Connecting-IP'),
    createdAt: new Date(),
  });

  return c.json({ success: true, message: 'Event unlocked' });
});

// ============================================================================
// RESOLVE EVENT & WINNER MANAGEMENT (2-Admin Approval Required)
// ============================================================================

// Get existing approvals for an event
admin.get('/events/:id/approvals', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();

  const approvals = await db.query.resolutionApprovals.findMany({
    where: eq(resolutionApprovals.eventId, id),
  });

  return c.json({ success: true, data: approvals });
});

// Submit resolution approval (first or second admin)
const approvalSchema = z.object({
  winningOption: z.string().min(1),
});

admin.post('/events/:id/submit-approval', zValidator('json', approvalSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();
  const { winningOption } = c.req.valid('json');

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
    with: { options: true },
  });

  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  if (event.status !== 'locked') {
    return c.json({ success: false, error: 'Event must be locked' }, 400);
  }

  const validOption = event.options.find(o => o.optionId === winningOption || o.id === winningOption);
  if (!validOption) {
    return c.json({ success: false, error: 'Invalid winning option' }, 400);
  }

  // Check if this admin already approved
  const existingApproval = await db.query.resolutionApprovals.findFirst({
    where: and(
      eq(resolutionApprovals.eventId, id),
      eq(resolutionApprovals.adminId, user.id)
    ),
  });

  if (existingApproval) {
    return c.json({ success: false, error: 'You have already submitted an approval for this event' }, 400);
  }

  // Insert approval
  await db.insert(resolutionApprovals).values({
    id: nanoid(),
    eventId: id,
    adminId: user.id,
    winningOption: validOption.optionId,
    approved: true,
    createdAt: new Date(),
  });

  // Check how many approvals we have now
  const allApprovals = await db.query.resolutionApprovals.findMany({
    where: eq(resolutionApprovals.eventId, id),
  });

  // Check if we have 2 approvals with matching winning option
  const matchingApprovals = allApprovals.filter(a => a.winningOption === validOption.optionId);

  if (matchingApprovals.length >= 2) {
    return c.json({
      success: true,
      message: '2 approvals received! You can now resolve the event.',
      approvals: allApprovals,
      canResolve: true,
      requiredApprovals: 2,
      currentApprovals: allApprovals.length,
    });
  }

  // Need more approvals
  return c.json({
    success: true,
    message: `Approval submitted. Waiting for ${2 - matchingApprovals.length} more admin(s) to approve.`,
    approvals: allApprovals,
    canResolve: false,
    requiredApprovals: 2,
    currentApprovals: allApprovals.length,
  });
});

const resolveEventSchema = z.object({
  winningOption: z.string().min(1),
});


admin.post('/events/:id/resolve', zValidator('json', resolveEventSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();
  const { winningOption } = c.req.valid('json');

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
    with: { options: true },
  });

  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  // Allow resolving locked events only
  if (event.status !== 'locked') {
    return c.json({
      success: false,
      error: 'Event must be locked before resolution'
    }, 400);
  }

  const winner = event.options.find(
    (o) => o.optionId === winningOption || o.id === winningOption
  );

  if (!winner) {
    return c.json({ success: false, error: 'Invalid winning option' }, 400);
  }

  // TWO-ADMIN APPROVAL CHECK
  const approvals = await db.query.resolutionApprovals.findMany({
    where: eq(resolutionApprovals.eventId, id),
  });
  const matchingApprovals = approvals.filter(a => a.winningOption === winner.optionId);

  if (matchingApprovals.length < 2) {
    return c.json({
      success: false,
      error: `Resolution requires 2 admin approvals for the same option. Currently: ${matchingApprovals.length}/2 approvals for option ${winner.optionId}.`,
      approvals,
      requiredApprovals: 2,
      currentMatchingApprovals: matchingApprovals.length,
    }, 400);
  }

  // Calculate payouts
  // Platform fee is collected upfront at bet placement (1% per trade)
  // Pool is distributed to winners without any deduction
  const totalPool = event.options.reduce((sum, opt) => sum + (opt.poolAmount || 0), 0);
  const losingPool = totalPool - (winner.poolAmount || 0);
  const ticketPrice = event.ticketPrice || 10;
  // Winners get their ticket back + full losing pool (no platform fee deducted)
  const payoutPerTicket = winner.ticketsSold && winner.ticketsSold > 0
    ? ticketPrice + (losingPool / winner.ticketsSold)
    : 0;

  const now = new Date();

  // Wrap all updates in try-catch to prevent partial state
  try {
    // Update event
    await db.update(events)
      .set({
        status: 'resolved',
        winningOption: winner.optionId,
        resolvedAt: now,
        resolvedBy: user.id,
        updatedAt: now,
      })
      .where(eq(events.id, id));

    // Mark winning option
    await db.update(eventOptions)
      .set({ isWinner: true, updatedAt: now })
      .where(eq(eventOptions.id, winner.id));

    // Update winning tickets
    await db.update(tickets)
      .set({ status: 'won', payoutAmount: payoutPerTicket, updatedAt: now })
      .where(and(eq(tickets.eventId, id), eq(tickets.optionId, winner.id)));

    // Update losing tickets
    await db.update(tickets)
      .set({ status: 'lost', payoutAmount: 0, updatedAt: now })
      .where(and(
        eq(tickets.eventId, id),
        sql`${tickets.optionId} != ${winner.id}`
      ));
  } catch (updateError: any) {
    console.error('Resolution failed, reverting event status:', updateError);
    // Revert event status to locked so admin can retry
    try {
      await db.update(events)
        .set({ status: 'locked', winningOption: null, resolvedAt: null, resolvedBy: null, updatedAt: now })
        .where(eq(events.id, id));
      await db.update(eventOptions)
        .set({ isWinner: false, updatedAt: now })
        .where(eq(eventOptions.eventId, id));
    } catch (revertError) {
      console.error('Failed to revert event status:', revertError);
    }
    return c.json({
      success: false,
      error: 'Failed to resolve event. Please try again.',
      details: updateError.message
    }, 500);
  }

  // Audit log
  await db.insert(adminAuditLogs).values({
    id: nanoid(),
    adminId: user.id,
    action: 'RESOLVE_EVENT',
    entityType: 'Event',
    entityId: id,
    details: JSON.stringify({
      winningOption: winner.optionId,
      totalPool,
      losingPool,
      payoutPerTicket,
      winnersCount: winner.ticketsSold,
    }),
    ipAddress: c.req.header('CF-Connecting-IP'),
    createdAt: now,
  });

  // Send notifications to all bettors on this event
  try {
    // Get all tickets for this event with user IDs
    const eventTickets = await db.query.tickets.findMany({
      where: eq(tickets.eventId, id),
      columns: { userId: true, optionId: true, status: true },
    });

    const notifiedUsers = new Set<string>();
    for (const ticket of eventTickets) {
      if (notifiedUsers.has(ticket.userId)) continue;
      notifiedUsers.add(ticket.userId);

      const isWinner = ticket.optionId === winner.id;
      await createNotification(
        db,
        ticket.userId,
        isWinner ? 'ticket_won' : 'ticket_lost',
        isWinner ? '🎉 You Won!' : '😔 Better Luck Next Time',
        isWinner
          ? `Your bet on ${event.title} won! ${winner.label} was the winning option.`
          : `${event.title} has been resolved. ${winner.label} won.`,
        { eventId: id, winningOption: winner.optionId }
      );
    }
    console.log('Sent resolution notifications to', notifiedUsers.size, 'users');
  } catch (notifError) {
    console.error('Failed to send resolution notifications (non-critical):', notifError);
  }

  return c.json({
    success: true,
    data: {
      eventId: id,
      winningOption: winner.optionId,
      winningLabel: winner.label,
      totalPool,
      losingPool,
      payoutPerTicket,
      winnersCount: winner.ticketsSold || 0,
      losersCount: event.options
        .filter(o => o.id !== winner.id)
        .reduce((sum, o) => sum + (o.ticketsSold || 0), 0),
    },
  });
});

// Cancel event (refund all)
const cancelEventSchema = z.object({
  reason: z.string().min(1).max(500),
});

admin.post('/events/:id/cancel', zValidator('json', cancelEventSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();
  const { reason } = c.req.valid('json');

  try {
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    if (event.status === 'resolved') {
      return c.json({ success: false, error: 'Cannot delete resolved event' }, 400);
    }

    const now = new Date();
    const ticketPrice = event.ticketPrice || 10;

    // Mark any tickets as refunded (keep for records)
    await db.update(tickets)
      .set({ status: 'refunded', payoutAmount: ticketPrice, updatedAt: now })
      .where(eq(tickets.eventId, id));

    // Set event status to cancelled (don't delete - keeps records for refunds)
    await db.update(events)
      .set({ status: 'cancelled', updatedAt: now })
      .where(eq(events.id, id));

    // Try to insert audit log but don't fail if FK is broken
    try {
      await db.insert(adminAuditLogs).values({
        id: nanoid(),
        adminId: user.id,
        action: 'DELETE_EVENT',
        entityType: 'Event',
        entityId: id,
        details: JSON.stringify({ reason, title: event.title }),
        ipAddress: c.req.header('CF-Connecting-IP'),
        createdAt: now,
      });
    } catch (auditError) {
      console.error('Failed to insert audit log (non-critical):', auditError);
    }

    return c.json({ success: true, message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return c.json({
      success: false,
      error: `Failed to delete: ${error.message || 'Unknown error'}`,
    }, 500);
  }
});

// ============================================================================
// BETS & WINNERS MANAGEMENT
// ============================================================================

// Get all bets/tickets with advanced filtering and sorting
admin.get('/bets', async (c) => {
  const db = c.get('db');
  const {
    eventId,
    userId,
    status,
    walletAddress,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = '1',
    limit = '50',
    winnersOnly,
    losersOnly,
    unclaimedOnly,
  } = c.req.query();

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (eventId) conditions.push(eq(tickets.eventId, eventId));
  if (userId) conditions.push(eq(tickets.userId, userId));
  if (status) conditions.push(eq(tickets.status, status as any));
  if (walletAddress) conditions.push(eq(tickets.walletAddress, walletAddress));
  if (winnersOnly === 'true') conditions.push(eq(tickets.status, 'won'));
  if (losersOnly === 'true') conditions.push(eq(tickets.status, 'lost'));
  if (unclaimedOnly === 'true') {
    conditions.push(eq(tickets.status, 'won'));
    conditions.push(sql`${tickets.claimedAt} IS NULL`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [ticketsList, totalResult, statsResult] = await Promise.all([
    db.query.tickets.findMany({
      where: whereClause,
      with: {
        user: { columns: { email: true, walletAddress: true } },
        event: { columns: { title: true, status: true } },
        option: { columns: { label: true, isWinner: true } },
      },
      orderBy: sortOrder === 'asc'
        ? [asc(tickets[sortBy as keyof typeof tickets] as any)]
        : [desc(tickets[sortBy as keyof typeof tickets] as any)],
      limit: limitNum,
      offset,
    }),
    db.select({ count: count() }).from(tickets).where(whereClause),
    // All-time stats (no pagination, no filters)
    db.select({
      totalTickets: count(),
      totalWon: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'won' THEN 1 ELSE 0 END), 0)`,
      totalLost: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'lost' THEN 1 ELSE 0 END), 0)`,
      totalClaimed: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'claimed' THEN 1 ELSE 0 END), 0)`,
      totalUnclaimed: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'won' AND ${tickets.claimedAt} IS NULL THEN 1 ELSE 0 END), 0)`,
      totalPayout: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} IN ('won', 'claimed') THEN ${tickets.payoutAmount} ELSE 0 END), 0)`,
    }).from(tickets),
  ]);

  return c.json({
    success: true,
    data: ticketsList,
    stats: statsResult[0], // All-time stats
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalResult[0]?.count || 0,
      pages: Math.ceil((totalResult[0]?.count || 0) / limitNum),
    },
  });
});

// Get winners for specific event
admin.get('/events/:id/winners', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();
  const { sortBy = 'createdAt', sortOrder = 'desc', claimed } = c.req.query();

  const conditions = [
    eq(tickets.eventId, id),
    eq(tickets.status, 'won'),
  ];

  if (claimed === 'true') {
    conditions.push(sql`${tickets.claimedAt} IS NOT NULL`);
  } else if (claimed === 'false') {
    conditions.push(sql`${tickets.claimedAt} IS NULL`);
  }

  const winners = await db.query.tickets.findMany({
    where: and(...conditions),
    with: {
      user: { columns: { email: true, walletAddress: true } },
      option: { columns: { label: true } },
    },
    orderBy: sortOrder === 'asc'
      ? [asc(tickets[sortBy as keyof typeof tickets] as any)]
      : [desc(tickets[sortBy as keyof typeof tickets] as any)],
  });

  const summary = {
    totalWinners: winners.length,
    totalPayout: winners.reduce((sum, t) => sum + (t.payoutAmount || 0), 0),
    claimed: winners.filter(t => t.claimedAt).length,
    unclaimed: winners.filter(t => !t.claimedAt).length,
  };

  return c.json({ success: true, data: { winners, summary } });
});

// Get losers for specific event
admin.get('/events/:id/losers', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();

  const losers = await db.query.tickets.findMany({
    where: and(eq(tickets.eventId, id), eq(tickets.status, 'lost')),
    with: {
      user: { columns: { email: true, walletAddress: true } },
      option: { columns: { label: true } },
    },
    orderBy: [desc(tickets.createdAt)],
  });

  return c.json({
    success: true,
    data: {
      losers,
      summary: {
        totalLosers: losers.length,
        totalLost: losers.reduce((sum, t) => sum + (t.purchasePrice || 0), 0),
      },
    },
  });
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

admin.get('/users', async (c) => {
  const db = c.get('db');
  const { search, role, page = '1', limit = '50' } = c.req.query();

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (role) conditions.push(eq(users.role, role as any));
  if (search) {
    conditions.push(
      or(
        like(users.email, `%${search}%`),
        like(users.walletAddress, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [usersList, totalResult] = await Promise.all([
    db.query.users.findMany({
      where: whereClause,
      columns: { passwordHash: false },
      orderBy: [desc(users.createdAt)],
      limit: limitNum,
      offset,
    }),
    db.select({ count: count() }).from(users).where(whereClause),
  ]);

  // Get ticket counts
  const usersWithStats = await Promise.all(
    usersList.map(async (user) => {
      const stats = await db.select({
        totalTickets: count(),
        totalWins: sql<number>`SUM(CASE WHEN ${tickets.status} = 'won' THEN 1 ELSE 0 END)`,
        totalSpent: sum(tickets.purchasePrice),
        totalWon: sum(tickets.payoutAmount),
      }).from(tickets).where(eq(tickets.userId, user.id));

      return { ...user, stats: stats[0] };
    })
  );

  return c.json({
    success: true,
    data: usersWithStats,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalResult[0]?.count || 0,
      pages: Math.ceil((totalResult[0]?.count || 0) / limitNum),
    },
  });
});

// Update user role (super admin only)
admin.use('/users/:id/role', requireSuperAdmin);

const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin', 'superadmin']),
});

admin.put('/users/:id/role', zValidator('json', updateRoleSchema), async (c) => {
  const db = c.get('db');
  const adminUser = c.get('user')!;
  const { id } = c.req.param();
  const { role } = c.req.valid('json');

  if (id === adminUser.id) {
    return c.json({ success: false, error: 'Cannot change own role' }, 400);
  }

  await db.update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, id));

  await db.insert(adminAuditLogs).values({
    id: nanoid(),
    adminId: adminUser.id,
    action: 'UPDATE_USER_ROLE',
    entityType: 'User',
    entityId: id,
    details: JSON.stringify({ newRole: role }),
    ipAddress: c.req.header('CF-Connecting-IP'),
    createdAt: new Date(),
  });

  return c.json({ success: true, message: 'User role updated' });
});

// ============================================================================
// PLATFORM SETTINGS (Super Admin Only)
// ============================================================================

admin.get('/settings', requireSuperAdmin, async (c) => {
  const db = c.get('db');
  const settings = await db.query.platformSettings.findFirst();
  return c.json({ success: true, data: settings });
});

const updateSettingsSchema = z.object({
  ticketPrice: z.number().min(1).max(10000).optional(),
  platformFee: z.number().min(0).max(0.5).optional(),
  maxEventsPerDay: z.number().min(1).max(100).optional(),
  claimDelayHours: z.number().min(0).max(168).optional(),
  maintenanceMode: z.boolean().optional(),
});

admin.put('/settings', requireSuperAdmin, zValidator('json', updateSettingsSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const data = c.req.valid('json');

  try {
    await db.insert(platformSettings)
      .values({ id: 'settings', ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformSettings.id,
        set: { ...data, updatedAt: new Date() },
      });

    // Try to insert audit log but don't fail if FK is broken
    try {
      await db.insert(adminAuditLogs).values({
        id: nanoid(),
        adminId: user.id,
        action: 'UPDATE_SETTINGS',
        entityType: 'PlatformSettings',
        entityId: 'settings',
        details: JSON.stringify(data),
        ipAddress: c.req.header('CF-Connecting-IP'),
        createdAt: new Date(),
      });
    } catch (auditError) {
      console.error('Failed to insert audit log (non-critical):', auditError);
    }

    return c.json({ success: true, message: 'Settings updated' });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return c.json({
      success: false,
      error: `Failed to update settings: ${error.message || 'Unknown error'}`,
    }, 500);
  }
});

// ============================================================================
// AUDIT LOGS
// ============================================================================

admin.get('/audit-logs', async (c) => {
  const db = c.get('db');
  const { adminId, action, entityType, page = '1', limit = '100' } = c.req.query();

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (adminId) conditions.push(eq(adminAuditLogs.adminId, adminId));
  if (action) conditions.push(eq(adminAuditLogs.action, action));
  if (entityType) conditions.push(eq(adminAuditLogs.entityType, entityType));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, totalResult] = await Promise.all([
    db.query.adminAuditLogs.findMany({
      where: whereClause,
      with: { admin: { columns: { email: true } } },
      orderBy: [desc(adminAuditLogs.createdAt)],
      limit: limitNum,
      offset,
    }),
    db.select({ count: count() }).from(adminAuditLogs).where(whereClause),
  ]);

  return c.json({
    success: true,
    data: logs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalResult[0]?.count || 0,
      pages: Math.ceil((totalResult[0]?.count || 0) / limitNum),
    },
  });
});

// ============================================================================
// JACKPOT MANAGEMENT
// ============================================================================

// Get current jackpot event
admin.get('/jackpot', async (c) => {
  const db = c.get('db');

  const jackpot = await db.query.events.findFirst({
    where: and(eq(events.isJackpot, true), or(eq(events.status, 'open'), eq(events.status, 'upcoming'))),
    with: { options: true },
  });

  if (jackpot) {
    const ticketCount = await db.select({ count: count() })
      .from(tickets)
      .where(eq(tickets.eventId, jackpot.id));
    return c.json({ success: true, data: { ...jackpot, ticketCount: ticketCount[0]?.count || 0 } });
  }

  return c.json({ success: true, data: null });
});

// Set an event as jackpot
admin.post('/events/:id/jackpot', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();

  const event = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  if (!['open', 'upcoming'].includes(event.status)) {
    return c.json({ success: false, error: 'Only open/upcoming events can be jackpot' }, 400);
  }

  // Set this event as jackpot (multiple jackpots allowed)
  await db.update(events)
    .set({ isJackpot: true, updatedAt: new Date() })
    .where(eq(events.id, id));

  await db.insert(adminAuditLogs).values({
    id: nanoid(),
    adminId: user.id,
    action: 'SET_JACKPOT',
    entityType: 'Event',
    entityId: id,
    details: JSON.stringify({ title: event.title }),
    ipAddress: c.req.header('CF-Connecting-IP'),
    createdAt: new Date(),
  });

  return c.json({ success: true, message: 'Event set as jackpot' });
});

// Remove jackpot status from event
admin.delete('/events/:id/jackpot', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();

  await db.update(events)
    .set({ isJackpot: false, updatedAt: new Date() })
    .where(eq(events.id, id));

  await db.insert(adminAuditLogs).values({
    id: nanoid(),
    adminId: user.id,
    action: 'REMOVE_JACKPOT',
    entityType: 'Event',
    entityId: id,
    ipAddress: c.req.header('CF-Connecting-IP'),
    createdAt: new Date(),
  });

  return c.json({ success: true, message: 'Jackpot status removed' });
});

// Create event from external API data
const createFromExternalSchema = z.object({
  externalId: z.string(),
  externalSource: z.enum(['odds-api', 'api-sports', 'polymarket', 'polymarket-sports', 'api-sports-live']),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(['sports', 'finance', 'crypto', 'politics', 'entertainment', 'news', 'other']),
  options: z.array(z.object({
    label: z.string().min(1).max(100),
    ticketLimit: z.number().min(10).max(1000000),
  })).min(2).max(6),
  eventTime: z.string().datetime(),
  startTime: z.string().datetime().optional(), // When betting opens (for scheduling)
  ticketPrice: z.number().min(1).max(10000).optional(),
  isJackpot: z.boolean().optional(),
  status: z.enum(['open', 'upcoming']).optional(), // For scheduling: 'upcoming' = scheduled for later
  externalData: z.any().optional(),
});

admin.post('/events/from-external', zValidator('json', createFromExternalSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const data = c.req.valid('json');

  try {
    // Check if event from this external source already exists
    const existing = await db.query.events.findFirst({
      where: and(
        eq(events.externalId, data.externalId),
        eq(events.externalSource, data.externalSource)
      ),
    });

    if (existing) {
      // If the existing event is cancelled, we still allow creating a NEW event
      // The old cancelled event stays in DB (users were already refunded)
      // We modify the externalId to make it unique for the new import
      if (existing.status === 'cancelled') {
        // Proceed to create new event - we'll use a modified externalId
        // so it doesn't conflict with the old cancelled one
        data.externalId = `${data.externalId}_reimport_${Date.now()}`;
      } else {
        return c.json({ success: false, error: 'Event already imported from this source' }, 400);
      }
    }

    const eventTime = new Date(data.eventTime);
    const now = new Date();
    const lockTime = data.category === 'sports' ? new Date(data.eventTime) : new Date(eventTime.getTime() - 24 * 60 * 60 * 1000); // Sports: when match starts, Others: 24h before end

    // Use provided startTime or default to now
    const startTime = data.startTime ? new Date(data.startTime) : now;

    // Determine status based on startTime:
    // If startTime is in the future = 'upcoming' (scheduled, waiting to open)
    // If startTime is now or past = 'open' (betting live)
    const eventStatus = data.status || (startTime > now ? 'upcoming' : 'open');

    // Multiple jackpots are now allowed - no need to clear others

    const eventId = nanoid();
    const ticketPrice = data.ticketPrice || parseFloat(c.env.TICKET_PRICE || '10');

    console.log('Inserting event:', { eventId, title: data.title, category: data.category, status: eventStatus, startTime: startTime.toISOString() });

    await db.insert(events).values({
      id: eventId,
      title: data.title,
      description: data.description || `Imported from ${data.externalSource}`,
      category: data.category,
      ticketPrice,
      startTime,
      lockTime,
      eventTime,
      status: eventStatus, // 'upcoming' if scheduled for later, 'open' if now
      isJackpot: data.isJackpot || false,
      externalId: data.externalId,
      externalSource: data.externalSource,
      externalData: data.externalData ? JSON.stringify(data.externalData) : null,
      createdAt: now,
      updatedAt: now,
    });

    console.log('Event inserted, now inserting options:', data.options.length);

    // Create options
    const optionsToInsert = data.options.map((opt, index) => ({
      id: nanoid(),
      eventId,
      optionId: String.fromCharCode(65 + index),
      label: opt.label,
      ticketLimit: opt.ticketLimit,
      ticketsSold: 0,
      poolAmount: 0,
      isWinner: false,
      createdAt: now,
      updatedAt: now,
    }));

    await db.insert(eventOptions).values(optionsToInsert);

    console.log('Options inserted, now inserting audit log');

    // Try to insert audit log but don't fail if user FK is broken
    try {
      await db.insert(adminAuditLogs).values({
        id: nanoid(),
        adminId: user.id,
        action: 'CREATE_FROM_EXTERNAL',
        entityType: 'Event',
        entityId: eventId,
        details: JSON.stringify({
          title: data.title,
          externalId: data.externalId,
          externalSource: data.externalSource,
          isJackpot: data.isJackpot,
        }),
        ipAddress: c.req.header('CF-Connecting-IP'),
        createdAt: now,
      });
    } catch (auditError) {
      console.error('Failed to insert audit log (non-critical):', auditError);
    }

    console.log('Audit log inserted, fetching created event');

    const createdEvent = await db.query.events.findFirst({
      where: eq(events.id, eventId),
      with: { options: true },
    });

    console.log('Event created successfully:', eventId);

    // Send notifications to all users if this is a jackpot
    if (data.isJackpot) {
      try {
        // Get all active users to notify
        const allUsers = await db.select({ id: users.id }).from(users).limit(500);
        console.log('Sending jackpot notifications to', allUsers.length, 'users');

        for (const u of allUsers) {
          await createNotification(
            db,
            u.id,
            'jackpot_new',
            '🏆 New Jackpot Available!',
            `${data.title} - Place your bets now!`,
            { eventId }
          );
        }
      } catch (notifError) {
        console.error('Failed to send notifications (non-critical):', notifError);
      }
    }

    return c.json({ success: true, data: createdEvent }, 201);
  } catch (error: any) {
    console.error('Error creating event from external:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    return c.json({
      success: false,
      error: `Database error: ${error.message || 'Unknown error'}`,
      details: error.cause ? String(error.cause) : undefined,
    }, 500);
  }
});

// ============================================================================
// FAILED TRANSACTIONS / PAYMENT RESOLUTION
// ============================================================================

// Get all failed transactions
admin.get('/failed-transactions', async (c) => {
  const db = c.get('db');
  const { status = 'pending' } = c.req.query();

  const results = await db.select()
    .from(failedTransactions)
    .where(eq(failedTransactions.status, status as any))
    .orderBy(desc(failedTransactions.createdAt));

  // Get event details for each transaction
  const enrichedResults = await Promise.all(results.map(async (tx) => {
    const event = await db.query.events.findFirst({
      where: eq(events.id, tx.eventId),
      columns: { id: true, title: true, status: true },
    });
    return { ...tx, event };
  }));

  return c.json({
    success: true,
    data: enrichedResults,
    count: results.length,
  });
});

// Get single failed transaction
admin.get('/failed-transactions/:id', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();

  const tx = await db.select().from(failedTransactions).where(eq(failedTransactions.id, id)).limit(1);

  if (!tx.length) {
    return c.json({ success: false, error: 'Transaction not found' }, 404);
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, tx[0].eventId),
    with: { options: true },
  });

  return c.json({
    success: true,
    data: { ...tx[0], event },
  });
});

// Resolve failed transaction by manually issuing tickets
admin.post('/failed-transactions/:id/resolve', zValidator('json', z.object({
  note: z.string().optional(),
})), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();
  const { note } = c.req.valid('json');

  // Get the failed transaction
  const txResult = await db.select().from(failedTransactions).where(eq(failedTransactions.id, id)).limit(1);

  if (!txResult.length) {
    return c.json({ success: false, error: 'Transaction not found' }, 404);
  }

  const tx = txResult[0];

  if (tx.status !== 'pending') {
    return c.json({ success: false, error: 'Transaction already resolved' }, 400);
  }

  // Get event and option
  const event = await db.query.events.findFirst({
    where: eq(events.id, tx.eventId),
    with: { options: true },
  });

  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  const option = event.options.find(o => o.optionId === tx.optionId || o.id === tx.optionId);
  if (!option) {
    return c.json({ success: false, error: 'Option not found' }, 404);
  }

  // Find or create user
  let userId = '';
  const existingUser = await db.query.users.findFirst({
    where: eq(users.walletAddress, tx.walletAddress),
  });

  if (existingUser) {
    userId = existingUser.id;
  } else {
    userId = nanoid();
    await db.insert(users).values({
      id: userId,
      email: `${tx.walletAddress}@wallet.user`,
      passwordHash: 'wallet-auth-no-password',
      walletAddress: tx.walletAddress,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const now = new Date();
  const newTicketIds: string[] = [];

  // Create tickets
  for (let i = 0; i < tx.quantity; i++) {
    const ticketId = nanoid();
    const serialNumber = `BP-${option.optionId}-${Date.now().toString(36).toUpperCase()}-${nanoid(6).toUpperCase()}`;

    await db.insert(tickets).values({
      id: ticketId,
      serialNumber,
      eventId: tx.eventId,
      optionId: option.id,
      optionLabel: option.label,
      userId,
      walletAddress: tx.walletAddress,
      chain: tx.chain || 'SOL',
      purchasePrice: tx.amount / tx.quantity,
      purchaseTx: tx.transactionSignature,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    newTicketIds.push(ticketId);
  }

  // Update option stats
  await db.update(eventOptions)
    .set({
      ticketsSold: sql`${eventOptions.ticketsSold} + ${tx.quantity}`,
      poolAmount: sql`${eventOptions.poolAmount} + ${tx.amount}`,
      updatedAt: now,
    })
    .where(eq(eventOptions.id, option.id));

  // Update event total pool
  await db.update(events)
    .set({
      totalPool: sql`${events.totalPool} + ${tx.amount}`,
      updatedAt: now,
    })
    .where(eq(events.id, tx.eventId));

  // Mark transaction as resolved
  await db.update(failedTransactions)
    .set({
      status: 'resolved',
      resolvedBy: user.id,
      resolvedAt: now,
      resolutionNote: note || 'Tickets manually issued by admin',
      updatedAt: now,
    })
    .where(eq(failedTransactions.id, id));

  return c.json({
    success: true,
    data: {
      ticketIds: newTicketIds,
      quantity: tx.quantity,
      event: { id: event.id, title: event.title },
    },
    message: `Successfully issued ${tx.quantity} tickets for wallet ${tx.walletAddress.slice(0, 8)}...`,
  });
});

// Mark failed transaction as refunded
admin.post('/failed-transactions/:id/refund', zValidator('json', z.object({
  refundTx: z.string().optional(),
  note: z.string().optional(),
})), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();
  const { refundTx, note } = c.req.valid('json');

  const now = new Date();

  const result = await db.update(failedTransactions)
    .set({
      status: 'refunded',
      resolvedBy: user.id,
      resolvedAt: now,
      resolutionNote: note || `Refunded via tx: ${refundTx || 'manual'}`,
      updatedAt: now,
    })
    .where(and(eq(failedTransactions.id, id), eq(failedTransactions.status, 'pending')));

  return c.json({
    success: true,
    message: 'Transaction marked as refunded',
  });
});

// Reject failed transaction (invalid or fraudulent)
admin.post('/failed-transactions/:id/reject', zValidator('json', z.object({
  reason: z.string(),
})), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();
  const { reason } = c.req.valid('json');

  const now = new Date();

  await db.update(failedTransactions)
    .set({
      status: 'rejected',
      resolvedBy: user.id,
      resolvedAt: now,
      resolutionNote: `Rejected: ${reason}`,
      updatedAt: now,
    })
    .where(eq(failedTransactions.id, id));

  return c.json({
    success: true,
    message: 'Transaction rejected',
  });
});

// ============================================================================
// PLATFORM SETTINGS
// ============================================================================

// Get platform settings
admin.get('/settings', async (c) => {
  const db = c.get('db');

  let settings = await db.query.platformSettings.findFirst();

  // Create default settings if they don't exist
  if (!settings) {
    await db.insert(platformSettings).values({
      id: 'settings',
      ticketPrice: 10,
      platformFee: 0.01,
      maxEventsPerDay: 10,
      claimDelayHours: 0,
      maintenanceMode: false,
      updatedAt: new Date(),
    });
    settings = await db.query.platformSettings.findFirst();
  }

  return c.json({
    success: true,
    data: settings,
  });
});

// Update platform settings
const platformSettingsSchema = z.object({
  ticketPrice: z.number().min(1).max(10000).optional(),
  platformFee: z.number().min(0).max(0.5).optional(),
  maxEventsPerDay: z.number().min(1).max(100).optional(),
  claimDelayHours: z.number().min(0).max(168).optional(),
  maintenanceMode: z.boolean().optional(),
});

admin.put('/settings', zValidator('json', platformSettingsSchema), async (c) => {
  const db = c.get('db');
  const data = c.req.valid('json');

  // Ensure settings row exists
  let settings = await db.query.platformSettings.findFirst();
  if (!settings) {
    await db.insert(platformSettings).values({
      id: 'settings',
      ticketPrice: 10,
      platformFee: 0.01,
      maxEventsPerDay: 10,
      claimDelayHours: 0,
      maintenanceMode: false,
      updatedAt: new Date(),
    });
  }

  // Update with new values
  await db.update(platformSettings)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(platformSettings.id, 'settings'));

  const updated = await db.query.platformSettings.findFirst();

  return c.json({
    success: true,
    data: updated,
    message: 'Settings updated successfully',
  });
});

// ============================================================================
// USER LOOKUP (by wallet address)
// ============================================================================

admin.get('/users/lookup', async (c) => {
  const db = c.get('db');
  const wallet = c.req.query('wallet');

  if (!wallet || wallet.length < 32) {
    return c.json({ success: false, error: 'Valid wallet address required' }, 400);
  }

  try {
    // Search tickets by wallet address directly (no relations - they don't exist)
    const userTickets = await db.query.tickets.findMany({
      where: eq(tickets.walletAddress, wallet),
      orderBy: [desc(tickets.createdAt)],
    });

    if (userTickets.length === 0) {
      return c.json({ success: false, error: 'No tickets found for this wallet' }, 404);
    }

    // Try to find user record (may not exist for wallet-only users)
    const userId = userTickets[0].userId;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // Get failed transactions for this wallet (may not exist)
    let userFailedTx: any[] = [];
    try {
      userFailedTx = await db.query.failedTransactions.findMany({
        where: eq(failedTransactions.userId, userId),
        orderBy: [desc(failedTransactions.createdAt)],
      });
    } catch (ftxError) {
      console.error('Failed to fetch failed transactions:', ftxError);
      // Continue without failed transactions
    }

    // Calculate stats
    const totalBets = userTickets.length;
    const totalWon = userTickets.filter(t => t.status === 'won' || t.status === 'claimed').length;
    const totalLost = userTickets.filter(t => t.status === 'lost').length;
    const totalPending = userTickets.filter(t => t.status === 'active').length;
    const totalSpent = userTickets.reduce((sum, t) => sum + (t.purchasePrice || 0), 0);
    const totalWinnings = userTickets
      .filter(t => t.status === 'claimed')
      .reduce((sum, t) => sum + (t.payoutAmount || 0), 0);
    const unclaimedWinnings = userTickets
      .filter(t => t.status === 'won')
      .reduce((sum, t) => sum + (t.payoutAmount || 0), 0);

    return c.json({
      success: true,
      data: {
        user: {
          id: userId,
          email: user?.email || 'N/A',
          walletAddress: wallet,
          username: user?.username || 'Wallet User',
          role: user?.role || 'user',
          createdAt: user?.createdAt || userTickets[0].createdAt,
          lastLogin: user?.lastLogin || null,
        },
        stats: {
          totalBets,
          totalWon,
          totalLost,
          totalPending,
          winRate: totalBets > 0 ? ((totalWon / (totalWon + totalLost || 1)) * 100).toFixed(1) : '0',
          totalSpent,
          totalWinnings,
          unclaimedWinnings,
        },
        tickets: userTickets.map(t => ({
          id: t.id,
          eventTitle: 'Event #' + t.eventId.slice(0, 8),
          eventId: t.eventId,
          optionLabel: t.optionLabel || 'Unknown',
          optionId: t.optionId,
          purchasePrice: t.purchasePrice,
          purchaseTx: t.purchaseTx,
          status: t.status,
          payoutAmount: t.payoutAmount,
          claimedAt: t.claimedAt,
          createdAt: t.createdAt,
        })),
        failedTransactions: userFailedTx || [],
      },
    });
  } catch (error: any) {
    console.error('User lookup error:', error);
    return c.json({
      success: false,
      error: 'Failed to lookup user',
    }, 500);
  }
});

export default admin;


