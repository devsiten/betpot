import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, desc, and, sql, count, sum, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { tickets, events, eventOptions, users, failedTransactions } from '../db/schema';
import { auth } from '../middleware/auth';
import { AppContext } from '../types';
import { verifySolTransaction } from '../utils/sol';

const ticketsRoutes = new Hono<AppContext>();

ticketsRoutes.use('*', auth);

// Generate ticket serial number
function generateSerialNumber(eventId: string, optionId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(6).toUpperCase();
  return `BP-${optionId}-${timestamp}-${random}`;
}

const purchaseSchema = z.object({
  eventId: z.string(),
  optionId: z.string(),
  quantity: z.number().min(1), // Removed max limit - only check event's available tickets
  walletAddress: z.string().min(32).max(64),
  chain: z.enum(['SOL', 'ETH', 'BSC', 'TRC']),
  purchaseTx: z.string().min(3), // Relaxed for testnet - real validation later
  solAmount: z.number().optional(), // SOL amount for verification
});

// Purchase tickets
ticketsRoutes.post('/purchase', zValidator('json', purchaseSchema), async (c) => {
  try {
    const db = c.get('db');
    const user = c.get('user')!;
    const data = c.req.valid('json');

    console.log('=== PURCHASE REQUEST ===');
    console.log('User:', user?.id, user?.walletAddress);
    console.log('Data:', JSON.stringify(data));

    // Block platform wallet from purchasing (can't send SOL to itself)
    const PLATFORM_WALLET = '8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2';
    if (data.walletAddress === PLATFORM_WALLET) {
      return c.json({
        success: false,
        error: 'Platform wallet cannot purchase tickets'
      }, 400);
    }

    // For wallet-based auth, user.id might be the wallet address (not in DB)
    // We need to find or create a real user record
    let actualUserId = user.id;

    // Check if user.id is actually a wallet address (not a real user ID)
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!existingUser) {
      // User doesn't exist in DB - find or create by wallet address
      const userByWallet = await db.query.users.findFirst({
        where: eq(users.walletAddress, data.walletAddress),
      });

      if (userByWallet) {
        actualUserId = userByWallet.id;
      } else {
        // Create a new user record for this wallet
        const newUserId = nanoid();
        await db.insert(users).values({
          id: newUserId,
          email: `${data.walletAddress}@wallet.user`,
          passwordHash: 'wallet-auth-no-password',
          walletAddress: data.walletAddress,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        actualUserId = newUserId;
        console.log('Created new user for wallet:', data.walletAddress, newUserId);
      }
    }

    // Get event
    const event = await db.query.events.findFirst({
      where: eq(events.id, data.eventId),
      with: { options: true },
    });

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    // Check if event status allows purchases (only 'open' status)
    if (event.status !== 'open') {
      return c.json({ success: false, error: 'Event is not open for ticket sales' }, 400);
    }

    // Auto-lock check: 10-minute buffer before event starts
    const LOCK_BUFFER_MINUTES = 10;
    const eventTime = event.eventTime ? new Date(event.eventTime) : new Date();
    const lockTime = event.lockTime ? new Date(event.lockTime) : new Date(eventTime.getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();

    if (eventTime) {
      // Use stored lockTime from database instead of recalculating\r\n      const lockTime = event.lockTime ? new Date(event.lockTime) : new Date(eventTime.getTime() - 24 * 60 * 60 * 1000);

      if (now >= lockTime) {
        // Auto-lock: event time minus buffer has passed
        // Update event status to locked
        await db.update(events)
          .set({ status: 'locked', updatedAt: now })
          .where(eq(events.id, event.id));

        return c.json({
          success: false,
          error: 'Betting has closed for this event (closes 10 minutes before start)'
        }, 400);
      }
    }

    // Get option
    const option = event.options.find(
      o => o.optionId === data.optionId || o.id === data.optionId
    );

    if (!option) {
      return c.json({ success: false, error: 'Invalid option' }, 400);
    }

    // Check TOTAL event ticket availability (not per-option)
    const eventTicketLimit = (event as any).ticketLimit || 10000;
    const eventTicketsSold = (event as any).ticketsSold || 0;
    const availableTickets = eventTicketLimit - eventTicketsSold;

    if (data.quantity > availableTickets) {
      if (availableTickets <= 0) {
        return c.json({
          success: false,
          error: 'This event is sold out'
        }, 400);
      }
      return c.json({
        success: false,
        error: `Only ${availableTickets} tickets available for this event`
      }, 400);
    }

    const ticketPrice = event.ticketPrice || 10;
    const totalCost = ticketPrice * data.quantity;

    // Check if this transaction signature has already been used (prevent duplicates)
    const existingTicket = await db.query.tickets.findFirst({
      where: eq(tickets.purchaseTx, data.purchaseTx),
    });

    if (existingTicket) {
      return c.json({
        success: false,
        error: 'This transaction has already been used for a purchase'
      }, 400);
    }

    // Verify the SOL transaction on Solana Devnet
    if (!data.solAmount) {
      return c.json({
        success: false,
        error: 'SOL amount required for payment verification'
      }, 400);
    }

    console.log('Verifying SOL transaction:', data.purchaseTx, 'Amount:', data.solAmount);
    const isValidPayment = await verifySolTransaction(
      data.purchaseTx,
      data.solAmount,
      data.walletAddress
    );

    if (!isValidPayment) {
      console.error('Payment verification failed for:', data.purchaseTx);
      return c.json({
        success: false,
        error: 'Payment verification failed. Please ensure you sent the correct SOL amount.'
      }, 400);
    }
    console.log('SOL payment verified successfully');

    // Note: 'now' was already declared above in auto-lock check

    console.log('STEP: Creating ticket objects...');
    // Calculate SOL amount per ticket
    const solAmountPerTicket = data.solAmount ? data.solAmount / data.quantity : undefined;

    // Create tickets
    const ticketsToCreate = Array.from({ length: data.quantity }, () => ({
      id: nanoid(),
      serialNumber: generateSerialNumber(data.eventId, option.optionId),
      eventId: data.eventId,
      optionId: option.id,
      optionLabel: option.label,
      userId: actualUserId,
      walletAddress: data.walletAddress,
      chain: data.chain,
      purchasePrice: ticketPrice,
      solAmount: solAmountPerTicket, // Store actual SOL paid
      purchaseTx: data.purchaseTx,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    }));
    console.log('STEP: Ticket objects created, count:', ticketsToCreate.length);
    console.log('STEP: First ticket userId:', ticketsToCreate[0]?.userId);

    // ATOMIC TRANSACTION: Use D1 batch API - all operations succeed or all fail
    console.log('STEP: Inserting tickets atomically with batch...');

    // Build array of all queries for atomic execution
    const batchQueries: any[] = [];

    // Add all ticket inserts to batch
    for (const ticket of ticketsToCreate) {
      batchQueries.push(db.insert(tickets).values(ticket));
    }

    // Add option stats update to batch
    batchQueries.push(
      db.update(eventOptions)
        .set({
          ticketsSold: sql`${eventOptions.ticketsSold} + ${data.quantity}`,
          poolAmount: sql`${eventOptions.poolAmount} + ${totalCost}`,
          updatedAt: now,
        })
        .where(eq(eventOptions.id, option.id))
    );

    // Add event pool and ticketsSold update to batch
    batchQueries.push(
      db.update(events)
        .set({
          totalPool: sql`${events.totalPool} + ${totalCost}`,
          ticketsSold: sql`${events.ticketsSold} + ${data.quantity}`,
          updatedAt: now,
        })
        .where(eq(events.id, data.eventId))
    );

    // Execute all queries atomically - if any fails, all are rolled back
    await db.batch(batchQueries as any);

    console.log('STEP: All', ticketsToCreate.length, 'tickets inserted atomically');

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
  } catch (error: any) {
    console.error('Purchase ticket error:', error);

    // Log the failed transaction for admin resolution
    try {
      const db = c.get('db');
      const data = c.req.valid('json');

      await db.insert(failedTransactions).values({
        id: nanoid(),
        walletAddress: data.walletAddress,
        transactionSignature: data.purchaseTx,
        eventId: data.eventId,
        optionId: data.optionId,
        quantity: data.quantity,
        amount: data.quantity * 10, // Default ticket price - adjust as needed
        chain: data.chain,
        errorMessage: error.message || 'Unknown error during ticket creation',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('Logged failed transaction for admin resolution:', data.purchaseTx);
    } catch (logError) {
      console.error('Failed to log failed transaction:', logError);
    }

    return c.json({
      success: false,
      error: `Purchase failed: ${error.message || 'Unknown error'}`,
    }, 500);
  }
});

// Get user's tickets (my-tickets)
ticketsRoutes.get('/my-tickets', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const { status, eventId, page = '1', limit = '50' } = c.req.query();
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  // Build where conditions - check by userId OR walletAddress (handles both auth methods)
  const userCondition = user.walletAddress
    ? or(eq(tickets.userId, user.id), eq(tickets.walletAddress, user.walletAddress))
    : eq(tickets.userId, user.id);

  const conditions: any[] = [userCondition];
  if (status) {
    conditions.push(eq(tickets.status, status as any));
  }
  if (eventId) {
    conditions.push(eq(tickets.eventId, eventId));
  }

  const userTickets = await db.query.tickets.findMany({
    where: and(...conditions),
    with: {
      event: {
        columns: { id: true, title: true, status: true, eventTime: true },
      },
      option: {
        columns: { optionId: true, label: true },
      },
    },
    orderBy: [desc(tickets.createdAt)],
    limit: limitNum,
    offset: offset,
  });

  return c.json({
    success: true,
    data: userTickets,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: userTickets.length,
    }
  });
});

// Get user's ticket stats (my-stats)
ticketsRoutes.get('/my-stats', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  // Query by userId OR walletAddress (handles both auth methods)
  const userCondition = user.walletAddress
    ? or(eq(tickets.userId, user.id), eq(tickets.walletAddress, user.walletAddress))
    : eq(tickets.userId, user.id);

  // Get basic stats
  const stats = await db.select({
    totalTickets: count(),
    totalSpent: sql<number>`COALESCE(SUM(${tickets.purchasePrice}), 0)`,
    activeTickets: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'active' THEN 1 ELSE 0 END), 0)`,
    wonTickets: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'won' THEN 1 ELSE 0 END), 0)`,
    lostTickets: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'lost' THEN 1 ELSE 0 END), 0)`,
    claimedTickets: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'claimed' THEN 1 ELSE 0 END), 0)`,
    refundedTickets: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'refunded' THEN 1 ELSE 0 END), 0)`,
    totalWinnings: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} IN ('won', 'claimed') THEN ${tickets.payoutAmount} ELSE 0 END), 0)`,
    unclaimedWinnings: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'won' AND ${tickets.claimedAt} IS NULL THEN ${tickets.payoutAmount} ELSE 0 END), 0)`,
  }).from(tickets).where(userCondition);

  // Get claimed refunds count by joining with cancelled events
  const claimedRefundsResult = await db.select({
    claimedRefunds: count(),
    refundAmount: sql<number>`COALESCE(SUM(${tickets.payoutAmount}), 0)`,
  })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .where(and(
      userCondition,
      eq(tickets.status, 'claimed'),
      eq(events.status, 'cancelled')
    ));

  const claimedRefunds = claimedRefundsResult[0]?.claimedRefunds || 0;
  const refundAmount = claimedRefundsResult[0]?.refundAmount || 0;

  return c.json({
    success: true,
    data: {
      ...stats[0],
      // Total refunded = unclaimed refunds + claimed refunds from cancelled events
      totalRefunded: (stats[0]?.refundedTickets || 0) + claimedRefunds,
      totalRefundAmount: refundAmount,
    }
  });
});

// Keep old /stats route for backwards compatibility
ticketsRoutes.get('/stats', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const stats = await db.select({
    totalTickets: count(),
    totalSpent: sql<number>`COALESCE(SUM(${tickets.purchasePrice}), 0)`,
    activeTickets: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'active' THEN 1 ELSE 0 END), 0)`,
    wonTickets: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'won' THEN 1 ELSE 0 END), 0)`,
    lostTickets: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'lost' THEN 1 ELSE 0 END), 0)`,
    claimedTickets: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'claimed' THEN 1 ELSE 0 END), 0)`,
    totalWinnings: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} IN ('won', 'claimed') THEN ${tickets.payoutAmount} ELSE 0 END), 0)`,
    unclaimedWinnings: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'won' AND ${tickets.claimedAt} IS NULL THEN ${tickets.payoutAmount} ELSE 0 END), 0)`,
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

  // Allow claiming for both won tickets and refunded tickets (from cancelled events)
  if (ticket.status !== 'won' && ticket.status !== 'refunded') {
    return c.json({ success: false, error: 'Ticket is not claimable (must be won or refunded)' }, 400);
  }

  if (ticket.claimedAt) {
    return c.json({ success: false, error: 'Ticket already claimed' }, 400);
  }

  // Check claim delay (0 = immediate claiming)
  const claimDelayHours = 0;
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
  // Calculate actual payout after 1% platform fee
  const platformFee = (ticket.payoutAmount || 0) * 0.01;
  const actualPayout = (ticket.payoutAmount || 0) - platformFee;
  // const claimTx = await executePayout(walletAddress, actualPayout);
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
      grossPayout: ticket.payoutAmount,
      platformFee,
      actualPayout,
      claimTx,
      walletAddress,
    },
  });
});

// Get claimable tickets
ticketsRoutes.get('/claimable/list', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  // Match by userId OR walletAddress so users see their tickets regardless of login method
  const userCondition = user.walletAddress
    ? or(eq(tickets.userId, user.id), eq(tickets.walletAddress, user.walletAddress))
    : eq(tickets.userId, user.id);

  const claimable = await db.query.tickets.findMany({
    where: and(
      userCondition,
      sql`${tickets.status} IN ('won', 'refunded')`,
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

// Batch claim all claimable tickets
const batchClaimSchema = z.object({
  walletAddress: z.string(),
  signature: z.string(),
});

ticketsRoutes.post('/claim-all', zValidator('json', batchClaimSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { walletAddress } = c.req.valid('json');

  // Get all claimable tickets
  const claimable = await db.query.tickets.findMany({
    where: and(
      eq(tickets.userId, user.id),
      sql`${tickets.status} IN ('won', 'refunded')`,
      sql`${tickets.claimedAt} IS NULL`
    ),
    with: {
      event: {
        columns: { id: true, title: true, resolvedAt: true },
      },
    },
  });

  if (claimable.length === 0) {
    return c.json({ success: false, error: 'No tickets available to claim' }, 400);
  }

  // Check claim delay for each ticket (skip those not ready)
  const claimDelayHours = 0; // Immediate claiming
  const now = new Date();
  const readyToClaim = claimable.filter(ticket => {
    const resolvedAt = ticket.event?.resolvedAt;
    if (!resolvedAt) return true; // No resolved time means refunded event
    const claimAvailableAt = new Date(resolvedAt.getTime() + claimDelayHours * 60 * 60 * 1000);
    return now >= claimAvailableAt;
  });

  if (readyToClaim.length === 0) {
    return c.json({ success: false, error: 'No tickets are ready to claim yet' }, 400);
  }

  // Calculate total payout with 1% platform fee
  const grossPayout = readyToClaim.reduce((sum, t) => sum + (t.payoutAmount || 0), 0);
  const platformFee = grossPayout * 0.01;
  const totalPayout = grossPayout - platformFee;

  // TODO: Execute on-chain batch payout transfer
  // const claimTx = await executeBatchPayout(walletAddress, totalPayout);
  const claimTx = `batch_claim_${nanoid()}`;

  // Update all tickets to claimed
  const ticketIds = readyToClaim.map(t => t.id);

  // Update tickets one by one to avoid SQL variable limit
  for (const ticketId of ticketIds) {
    await db.update(tickets)
      .set({
        status: 'claimed',
        claimTx,
        claimedAt: now,
        updatedAt: now,
      })
      .where(eq(tickets.id, ticketId));
  }

  return c.json({
    success: true,
    data: {
      claimedCount: readyToClaim.length,
      grossPayout,
      platformFee,
      totalPayout,
      claimTx,
      walletAddress,
      ticketIds,
    },
  });
});

export default ticketsRoutes;




