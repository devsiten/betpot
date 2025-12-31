import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, desc, and, sql, count, sum, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { tickets, events, eventOptions, users, failedTransactions } from '../db/schema';
import { auth } from '../middleware/auth';
import { AppContext } from '../types';
import { CONFIG } from '../config';
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

    // Auto-lock check: buffer before event starts
    const LOCK_BUFFER_MINUTES = CONFIG.LOCK_BUFFER_MINUTES;
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
    // Just check exact match - multi-ticket purchases get unique TX suffixes
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

    // Create tickets - each with unique purchaseTx (base tx + index for multi-ticket purchases)
    const ticketsToCreate = Array.from({ length: data.quantity }, (_, index) => ({
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
      // For single ticket: use original TX, for multiple: append index to make unique
      purchaseTx: data.quantity === 1 ? data.purchaseTx : `${data.purchaseTx}-${index}`,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    }));
    console.log('STEP: Ticket objects created, count:', ticketsToCreate.length);
    console.log('STEP: First ticket userId:', ticketsToCreate[0]?.userId);

    // Insert tickets sequentially (D1 batch can be unreliable)
    console.log('STEP: Inserting', ticketsToCreate.length, 'tickets...');

    for (const ticket of ticketsToCreate) {
      await db.insert(tickets).values(ticket);
    }

    console.log('STEP: Tickets inserted, updating stats...');

    // Update option stats
    await db.update(eventOptions)
      .set({
        ticketsSold: sql`${eventOptions.ticketsSold} + ${data.quantity}`,
        poolAmount: sql`${eventOptions.poolAmount} + ${totalCost}`,
        updatedAt: now,
      })
      .where(eq(eventOptions.id, option.id));

    // Update event pool and ticketsSold
    await db.update(events)
      .set({
        totalPool: sql`${events.totalPool} + ${totalCost}`,
        ticketsSold: sql`${events.ticketsSold} + ${data.quantity}`,
        updatedAt: now,
      })
      .where(eq(events.id, data.eventId));

    console.log('STEP: All', ticketsToCreate.length, 'tickets inserted successfully');

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
        amount: data.quantity * 10, // USD value for reference
        solAmount: data.solAmount, // Actual SOL amount
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
    unclaimedWinnings: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} IN ('won', 'refunded') AND ${tickets.claimedAt} IS NULL THEN ${tickets.payoutAmount} ELSE 0 END), 0)`,
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
    unclaimedWinnings: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} IN ('won', 'refunded') AND ${tickets.claimedAt} IS NULL THEN ${tickets.payoutAmount} ELSE 0 END), 0)`,
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

  const now = new Date();

  // RACE CONDITION FIX: Atomically lock the ticket FIRST
  // This prevents double-claims by multiple simultaneous requests
  console.log('=== SINGLE CLAIM: Attempting atomic lock for ticket:', ticketId);

  await db.update(tickets)
    .set({
      status: 'processing',
      updatedAt: now,
    })
    .where(and(
      eq(tickets.id, ticketId),
      eq(tickets.userId, user.id),
      or(eq(tickets.status, 'won'), eq(tickets.status, 'refunded')),
      sql`${tickets.claimedAt} IS NULL`,
      sql`${tickets.claimTx} IS NULL`
    ));

  // Now fetch the ticket to verify it was locked
  const ticket = await db.query.tickets.findFirst({
    where: and(
      eq(tickets.id, ticketId),
      eq(tickets.userId, user.id),
      eq(tickets.status, 'processing')
    ),
    with: { event: true },
  });

  if (!ticket) {
    // Either ticket doesn't exist, doesn't belong to user, or was already claimed/processing
    return c.json({ success: false, error: 'Ticket not found or already claimed' }, 400);
  }

  console.log('Ticket locked for processing:', ticketId);

  // Calculate payout
  const platformFee = (ticket.payoutAmount || 0) * 0.01;
  const actualPayout = (ticket.payoutAmount || 0) - platformFee;

  // Execute payout
  const platformSecret = (c.env as any).PLATFORM_WALLET_SECRET;
  if (!platformSecret) {
    // Revert ticket status if payout not configured
    await db.update(tickets)
      .set({ status: 'won', updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));
    return c.json({ success: false, error: 'Payout system unavailable' }, 500);
  }

  // Use actual SOL amount from ticket
  const solPayout = ticket.payoutSolAmount || (ticket.payoutAmount || 0) / 125;
  const netSolPayout = solPayout * 0.99; // 1% fee

  const { sendSolPayout } = await import('../utils/sol');
  const payoutResult = await sendSolPayout(walletAddress, netSolPayout, platformSecret);

  if (!payoutResult.success) {
    console.error('Payout failed:', payoutResult.error);
    // Revert ticket to original status
    await db.update(tickets)
      .set({ status: 'won', updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));
    return c.json({ success: false, error: 'Payout failed. Please try again.' }, 500);
  }

  const claimTx = payoutResult.signature!;

  // Mark as claimed
  await db.update(tickets)
    .set({
      status: 'claimed',
      claimTx,
      claimedAt: now,
      updatedAt: now,
    })
    .where(eq(tickets.id, ticketId));

  console.log('Ticket claimed successfully:', ticketId, 'TX:', claimTx);

  return c.json({
    success: true,
    data: {
      ticketId,
      grossPayout: ticket.payoutAmount,
      platformFee,
      actualPayout,
      solPayout: netSolPayout,
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

  // Only show tickets that are claimable: won/refunded status, not yet claimed
  const claimable = await db.query.tickets.findMany({
    where: and(
      userCondition,
      or(eq(tickets.status, 'won'), eq(tickets.status, 'refunded')),
      sql`${tickets.claimedAt} IS NULL`,
      sql`${tickets.claimTx} IS NULL`
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

  // RACE CONDITION FIX: Atomically lock tickets FIRST, then check what was locked
  // This prevents multiple simultaneous requests from claiming the same tickets
  const userCondition = user.walletAddress
    ? or(eq(tickets.userId, user.id), eq(tickets.walletAddress, user.walletAddress))
    : eq(tickets.userId, user.id);

  const now = new Date();

  // Step 1: Atomically update tickets to 'processing' status
  // Only affects tickets that are won/refunded AND not yet claimed
  console.log('=== CLAIM-ALL: Atomically locking tickets ===');

  await db.update(tickets)
    .set({
      status: 'processing',
      updatedAt: now,
    })
    .where(and(
      userCondition,
      or(eq(tickets.status, 'won'), eq(tickets.status, 'refunded')),
      sql`${tickets.claimedAt} IS NULL`,
      sql`${tickets.claimTx} IS NULL`
    ));

  // Step 2: Now fetch the tickets we just locked
  const lockedTickets = await db.query.tickets.findMany({
    where: and(
      userCondition,
      eq(tickets.status, 'processing'),
      sql`${tickets.claimedAt} IS NULL`
    ),
    with: {
      event: {
        columns: { id: true, title: true, resolvedAt: true },
      },
    },
  });

  console.log('Tickets locked for processing:', lockedTickets.length, lockedTickets.map(t => ({ id: t.id, status: t.status })));

  if (lockedTickets.length === 0) {
    return c.json({ success: false, error: 'No tickets available to claim' }, 400);
  }

  // All locked tickets are ready (no claim delay)
  const readyToClaim = lockedTickets;

  // Calculate total SOL payout - use actual SOL amounts stored on tickets
  // Fall back to USD converted to SOL if solAmount not available
  const totalSolPayout = readyToClaim.reduce((sum, t) => {
    // Use payoutSolAmount if available, otherwise calculate from payoutAmount
    if (t.payoutSolAmount) return sum + t.payoutSolAmount;
    // Fallback: assume $125 per SOL for legacy tickets
    return sum + ((t.payoutAmount || 0) / 125);
  }, 0);

  // Apply 1% platform fee
  const platformFee = totalSolPayout * 0.01;
  const netPayoutSol = totalSolPayout - platformFee;

  console.log('Total SOL payout:', totalSolPayout, 'minus fee:', platformFee, '=', netPayoutSol);

  const ticketIds = readyToClaim.map(t => t.id);

  // Now execute the payout
  const platformSecret = (c.env as any).PLATFORM_WALLET_SECRET;
  if (!platformSecret) {
    // Revert tickets back to original status if payout not configured
    for (const ticket of readyToClaim) {
      await db.update(tickets)
        .set({ status: ticket.status, updatedAt: new Date() })
        .where(eq(tickets.id, ticket.id));
    }
    return c.json({ success: false, error: 'Payout system unavailable' }, 500);
  }

  // Import and call the payout function
  const { sendSolPayout } = await import('../utils/sol');
  const payoutResult = await sendSolPayout(walletAddress, netPayoutSol, platformSecret);

  if (!payoutResult.success) {
    console.error('Payout failed:', payoutResult.error);
    // Revert tickets back to original status
    for (const ticket of readyToClaim) {
      await db.update(tickets)
        .set({ status: ticket.status, updatedAt: new Date() })
        .where(eq(tickets.id, ticket.id));
    }
    return c.json({
      success: false,
      error: 'Payout failed. Please try again.'
    }, 500);
  }

  const claimTx = payoutResult.signature!;

  // Payout succeeded - mark tickets as fully claimed
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

  console.log('Tickets claimed successfully:', ticketIds.length, 'TX:', claimTx);

  return c.json({
    success: true,
    data: {
      claimedCount: readyToClaim.length,
      grossPayoutSol: totalSolPayout,
      platformFee,
      totalPayout: netPayoutSol,
      claimTx,
      walletAddress,
      ticketIds,
    },
  });
});

// =============================================================================
// SELF-SERVICE PAYMENT VERIFICATION
// Users can verify their payment and claim ticket if payment went through
// but ticket wasn't issued due to server errors
// =============================================================================

const verifyPaymentSchema = z.object({
  transactionSignature: z.string().min(80).max(100),
  eventId: z.string().min(1),
  optionId: z.string().min(1),
  walletAddress: z.string().min(32).max(64),
});

ticketsRoutes.post('/verify-payment', zValidator('json', verifyPaymentSchema), async (c) => {
  try {
    const db = c.get('db');
    const user = c.get('user')!;
    const { transactionSignature, eventId, optionId, walletAddress } = c.req.valid('json');

    console.log('=== VERIFY PAYMENT REQUEST ===');
    console.log('TX:', transactionSignature);
    console.log('Event:', eventId, 'Option:', optionId);
    console.log('Wallet:', walletAddress);
    console.log('User:', user.id);

    // Security: Verify wallet belongs to this user
    if (user.walletAddress && user.walletAddress !== walletAddress) {
      return c.json({
        success: false,
        error: 'This wallet does not match your account'
      }, 400);
    }

    // Find or create actual user record (same as purchase endpoint)
    let actualUserId = user.id;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!existingUser) {
      // User doesn't exist in DB - find or create by wallet address
      const userByWallet = await db.query.users.findFirst({
        where: eq(users.walletAddress, walletAddress),
      });

      if (userByWallet) {
        actualUserId = userByWallet.id;
      } else {
        // Create a new user record for this wallet
        const newUserId = nanoid();
        await db.insert(users).values({
          id: newUserId,
          email: `${walletAddress}@wallet.user`,
          passwordHash: 'wallet-auth-no-password',
          walletAddress: walletAddress,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        actualUserId = newUserId;
        console.log('Created new user for wallet:', walletAddress, newUserId);
      }
    }

    // 1. Check if ticket already exists with this transaction
    const existingTicket = await db.query.tickets.findFirst({
      where: eq(tickets.purchaseTx, transactionSignature),
    });

    if (existingTicket) {
      return c.json({
        success: false,
        error: 'A ticket has already been issued for this transaction',
        ticket: {
          id: existingTicket.id,
          serialNumber: existingTicket.serialNumber,
          eventId: existingTicket.eventId,
        }
      }, 400);
    }

    // 2. Check if this TX was already resolved in failed transactions
    const existingFailed = await db.query.failedTransactions.findFirst({
      where: eq(failedTransactions.transactionSignature, transactionSignature),
    });

    if (existingFailed?.status === 'resolved') {
      return c.json({
        success: false,
        error: 'This transaction was already resolved by admin'
      }, 400);
    }

    if (existingFailed?.status === 'refunded') {
      return c.json({
        success: false,
        error: 'This transaction was already refunded'
      }, 400);
    }

    // 3. Get event and option details
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
      with: { options: true },
    });

    if (!event) {
      return c.json({
        success: false,
        error: 'Event not found'
      }, 404);
    }

    const option = event.options.find(o => o.optionId === optionId || o.id === optionId);
    if (!option) {
      return c.json({
        success: false,
        error: 'Invalid option for this event'
      }, 400);
    }

    // 4. Calculate expected SOL amount
    const ticketPriceUSD = event.ticketPrice || 10;
    // Fetch current SOL price (simplified - assume $125/SOL for now, or use cached price)
    const solPrice = 125; // TODO: Could fetch from API if needed
    const expectedSolAmount = ticketPriceUSD / solPrice;

    console.log('Expected SOL amount:', expectedSolAmount);

    // 5. Verify the transaction on Solana blockchain
    const isValid = await verifySolTransaction(
      transactionSignature,
      expectedSolAmount,
      walletAddress
    );

    if (!isValid) {
      return c.json({
        success: false,
        error: 'Transaction verification failed. Please check: 1) Transaction exists, 2) Correct amount was sent, 3) Sent to platform wallet, 4) Transaction is confirmed'
      }, 400);
    }

    console.log('Transaction verified successfully!');

    // 6. Create the ticket
    const ticketId = nanoid();
    const serialNumber = generateSerialNumber(eventId, option.optionId);
    const now = new Date();

    await db.insert(tickets).values({
      id: ticketId,
      serialNumber,
      eventId,
      optionId: option.id, // Use the primary key ID
      optionLabel: option.label,
      userId: actualUserId,
      walletAddress,
      chain: 'SOL',
      purchasePrice: ticketPriceUSD,
      purchaseTx: transactionSignature,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    // 7. Update event/option ticket counts
    await db.update(events)
      .set({
        ticketsSold: sql`${events.ticketsSold} + 1`,
        updatedAt: now,
      })
      .where(eq(events.id, eventId));

    await db.update(eventOptions)
      .set({
        ticketsSold: sql`${eventOptions.ticketsSold} + 1`,
        poolAmount: sql`${eventOptions.poolAmount} + ${ticketPriceUSD}`,
        updatedAt: now,
      })
      .where(eq(eventOptions.id, option.id));

    // 8. If there was a failed transaction record, mark it resolved
    if (existingFailed) {
      await db.update(failedTransactions)
        .set({
          status: 'resolved',
          resolvedAt: now,
          resolutionNote: 'Self-resolved by user via verify-payment',
        })
        .where(eq(failedTransactions.id, existingFailed.id));
    }

    console.log('=== TICKET CREATED VIA VERIFY-PAYMENT ===');
    console.log('Ticket ID:', ticketId);

    return c.json({
      success: true,
      message: 'Payment verified! Your ticket has been issued.',
      ticket: {
        id: ticketId,
        serialNumber,
        eventId,
        eventTitle: event.title,
        optionLabel: option.label,
        purchasePrice: ticketPriceUSD,
        status: 'active',
      }
    });

  } catch (error: any) {
    console.error('Verify payment error:', error);

    // Check for unique constraint error (ticket already exists)
    if (error.message?.includes('UNIQUE constraint failed')) {
      return c.json({
        success: false,
        error: 'A ticket has already been issued for this transaction'
      }, 400);
    }

    return c.json({
      success: false,
      error: 'Failed to verify payment. Please try again or contact support.'
    }, 500);
  }
});

export default ticketsRoutes;
