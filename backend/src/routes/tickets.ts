import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, desc, and, sql, count, sum } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { tickets, events, eventOptions, users } from '../db/schema';
import { auth } from '../middleware/auth';
import { AppContext } from '../types';
import { verifyUSDCTransaction } from '../utils/usdc';

const ticketsRoutes = new Hono<AppContext>();

ticketsRoutes.use('*', auth);

// Generate ticket serial number
function generateSerialNumber(eventId: string, optionId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(6).toUpperCase();
  return `BP-${optionId}-${timestamp}-${random}`;
}

// Purchase ticket schema
const purchaseSchema = z.object({
  eventId: z.string(),
  optionId: z.string(),
  quantity: z.number().min(1).max(100).default(1),
  walletAddress: z.string().min(32).max(64),
  chain: z.enum(['SOL', 'ETH', 'BSC', 'TRC']),
  purchaseTx: z.string().min(3), // Relaxed for testnet - real validation later
});

// Purchase tickets
ticketsRoutes.post('/purchase', zValidator('json', purchaseSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const data = c.req.valid('json');

  // Get event
  const event = await db.query.events.findFirst({
    where: eq(events.id, data.eventId),
    with: { options: true },
  });

  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  if (event.status !== 'open') {
    return c.json({ success: false, error: 'Event is not open for ticket sales' }, 400);
  }

  // Get option
  const option = event.options.find(
    o => o.optionId === data.optionId || o.id === data.optionId
  );

  if (!option) {
    return c.json({ success: false, error: 'Invalid option' }, 400);
  }

  const availableTickets = option.ticketLimit - (option.ticketsSold || 0);
  if (data.quantity > availableTickets) {
    return c.json({
      success: false,
      error: `Only ${availableTickets} tickets available`
    }, 400);
  }

  const ticketPrice = event.ticketPrice || 10;
  const totalCost = ticketPrice * data.quantity;

  // Verify USDC transaction on-chain (only for SOL chain)
  if (data.chain === 'SOL') {
    try {
      const isValid = await verifyUSDCTransaction(
        data.purchaseTx,
        totalCost,
        data.walletAddress
      );

      if (!isValid) {
        return c.json({
          success: false,
          error: 'Transaction verification failed. Please ensure you sent the correct amount of USDC.'
        }, 400);
      }
    } catch (error) {
      console.error('Transaction verification error:', error);
      return c.json({
        success: false,
        error: 'Failed to verify transaction. Please try again.'
      }, 500);
    }
  }

  const now = new Date();

  // Create tickets
  const ticketsToCreate = Array.from({ length: data.quantity }, () => ({
    id: nanoid(),
    serialNumber: generateSerialNumber(data.eventId, option.optionId),
    eventId: data.eventId,
    optionId: option.id,
    optionLabel: option.label,
    userId: user.id,
    walletAddress: data.walletAddress,
    chain: data.chain,
    purchasePrice: ticketPrice,
    purchaseTx: data.purchaseTx,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(tickets).values(ticketsToCreate);

  // Update option stats
  await db.update(eventOptions)
    .set({
      ticketsSold: sql`${eventOptions.ticketsSold} + ${data.quantity}`,
      poolAmount: sql`${eventOptions.poolAmount} + ${totalCost}`,
      updatedAt: now,
    })
    .where(eq(eventOptions.id, option.id));

  // Update event total pool
  await db.update(events)
    .set({
      totalPool: sql`${events.totalPool} + ${totalCost}`,
      updatedAt: now,
    })
    .where(eq(events.id, data.eventId));

  return c.json({
    success: true,
    data: {
      tickets: ticketsToCreate.map(t => ({
        id: t.id,
        serialNumber: t.serialNumber,
        optionLabel: t.optionLabel,
        purchasePrice: t.purchasePrice,
      })),
      totalCost,
      event: {
        id: event.id,
        title: event.title,
      },
    },
  }, 201);
});

// Get user's tickets
ticketsRoutes.get('/my-tickets', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { status, eventId, page = '1', limit = '50' } = c.req.query();

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(tickets.userId, user.id)];
  if (status) conditions.push(eq(tickets.status, status as any));
  if (eventId) conditions.push(eq(tickets.eventId, eventId));

  const whereClause = and(...conditions);

  const [ticketsList, totalResult] = await Promise.all([
    db.query.tickets.findMany({
      where: whereClause,
      with: {
        event: {
          columns: {
            id: true,
            title: true,
            status: true,
            winningOption: true,
            eventTime: true,
          },
        },
        option: {
          columns: {
            optionId: true,
            label: true,
            isWinner: true,
          },
        },
      },
      orderBy: [desc(tickets.createdAt)],
      limit: limitNum,
      offset,
    }),
    db.select({ count: count() }).from(tickets).where(whereClause),
  ]);

  return c.json({
    success: true,
    data: ticketsList,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalResult[0]?.count || 0,
      pages: Math.ceil((totalResult[0]?.count || 0) / limitNum),
    },
  });
});

// Get user's ticket stats
ticketsRoutes.get('/my-stats', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const stats = await db.select({
    totalTickets: count(),
    totalSpent: sum(tickets.purchasePrice),
    activeTickets: sql<number>`SUM(CASE WHEN ${tickets.status} = 'active' THEN 1 ELSE 0 END)`,
    wonTickets: sql<number>`SUM(CASE WHEN ${tickets.status} = 'won' THEN 1 ELSE 0 END)`,
    lostTickets: sql<number>`SUM(CASE WHEN ${tickets.status} = 'lost' THEN 1 ELSE 0 END)`,
    claimedTickets: sql<number>`SUM(CASE WHEN ${tickets.status} = 'claimed' THEN 1 ELSE 0 END)`,
    totalWinnings: sql<number>`SUM(CASE WHEN ${tickets.status} IN ('won', 'claimed') THEN ${tickets.payoutAmount} ELSE 0 END)`,
    unclaimedWinnings: sql<number>`SUM(CASE WHEN ${tickets.status} = 'won' AND ${tickets.claimedAt} IS NULL THEN ${tickets.payoutAmount} ELSE 0 END)`,
  }).from(tickets).where(eq(tickets.userId, user.id));

  return c.json({ success: true, data: stats[0] });
});

// Get single ticket
ticketsRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { id } = c.req.param();

  const ticket = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, id), eq(tickets.userId, user.id)),
    with: {
      event: true,
      option: true,
    },
  });

  if (!ticket) {
    return c.json({ success: false, error: 'Ticket not found' }, 404);
  }

  return c.json({ success: true, data: ticket });
});

// Claim winning ticket
const claimSchema = z.object({
  ticketId: z.string(),
  walletAddress: z.string().min(32).max(64),
  signature: z.string(),
});

ticketsRoutes.post('/claim', zValidator('json', claimSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { ticketId, walletAddress } = c.req.valid('json');

  const ticket = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, ticketId), eq(tickets.userId, user.id)),
    with: { event: true },
  });

  if (!ticket) {
    return c.json({ success: false, error: 'Ticket not found' }, 404);
  }

  if (ticket.status !== 'won') {
    return c.json({ success: false, error: 'Ticket is not a winner' }, 400);
  }

  if (ticket.claimedAt) {
    return c.json({ success: false, error: 'Ticket already claimed' }, 400);
  }

  // Check claim delay
  const claimDelayHours = 3; // From settings
  const resolvedAt = ticket.event?.resolvedAt;
  if (resolvedAt) {
    const claimAvailableAt = new Date(resolvedAt.getTime() + claimDelayHours * 60 * 60 * 1000);
    if (new Date() < claimAvailableAt) {
      return c.json({
        success: false,
        error: `Claims available after ${claimAvailableAt.toISOString()}`
      }, 400);
    }
  }

  // TODO: Execute on-chain payout transfer
  // const claimTx = await executePayout(walletAddress, ticket.payoutAmount);
  const claimTx = `claim_${nanoid()}`; // Placeholder

  const now = new Date();
  await db.update(tickets)
    .set({
      status: 'claimed',
      claimTx,
      claimedAt: now,
      updatedAt: now,
    })
    .where(eq(tickets.id, ticketId));

  return c.json({
    success: true,
    data: {
      ticketId,
      payoutAmount: ticket.payoutAmount,
      claimTx,
      walletAddress,
    },
  });
});

// Get claimable tickets
ticketsRoutes.get('/claimable/list', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const claimable = await db.query.tickets.findMany({
    where: and(
      eq(tickets.userId, user.id),
      eq(tickets.status, 'won'),
      sql`${tickets.claimedAt} IS NULL`
    ),
    with: {
      event: {
        columns: { id: true, title: true, resolvedAt: true },
      },
      option: {
        columns: { optionId: true, label: true },
      },
    },
    orderBy: [desc(tickets.createdAt)],
  });

  const totalClaimable = claimable.reduce((sum, t) => sum + (t.payoutAmount || 0), 0);

  return c.json({
    success: true,
    data: {
      tickets: claimable,
      count: claimable.length,
      totalClaimable,
    },
  });
});

export default ticketsRoutes;
