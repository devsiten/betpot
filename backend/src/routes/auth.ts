import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { users } from '../db/schema';
import { generateToken, auth } from '../middleware/auth';
import { AppContext } from '../types';

const authRoutes = new Hono<AppContext>();

// Simple password hashing for edge (in production use Argon2 via WASM)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

// Register schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  walletAddress: z.string().optional(),
  preferredChain: z.enum(['SOL', 'ETH', 'BSC', 'TRC']).optional(),
});

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const db = c.get('db');
  const { email, password, walletAddress, preferredChain } = c.req.valid('json');

  // Check if user exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (existing) {
    return c.json({ success: false, error: 'Email already registered' }, 400);
  }

  const passwordHash = await hashPassword(password);
  const userId = nanoid();
  const now = new Date();

  await db.insert(users).values({
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    walletAddress,
    preferredChain: preferredChain || 'SOL',
    role: 'user',
    createdAt: now,
    updatedAt: now,
    lastLogin: now,
  });

  const token = await generateToken(userId, c.env.JWT_SECRET);

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: userId,
        email: email.toLowerCase(),
        walletAddress,
        preferredChain: preferredChain || 'SOL',
        role: 'user',
      },
    },
  }, 201);
});

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const db = c.get('db');
  const { email, password } = c.req.valid('json');

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (!user) {
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  // Update last login
  await db.update(users)
    .set({ lastLogin: new Date() })
    .where(eq(users.id, user.id));

  const token = await generateToken(user.id, c.env.JWT_SECRET);

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        preferredChain: user.preferredChain,
        role: user.role,
      },
    },
  });
});

// Get current user
authRoutes.get('/me', auth, async (c) => {
  const user = c.get('user')!;
  return c.json({ success: true, data: user });
});

// Update profile
const updateProfileSchema = z.object({
  walletAddress: z.string().optional(),
  preferredChain: z.enum(['SOL', 'ETH', 'BSC', 'TRC']).optional(),
});

authRoutes.put('/profile', auth, zValidator('json', updateProfileSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const data = c.req.valid('json');

  await db.update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const updated = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { passwordHash: false },
  });

  return c.json({ success: true, data: updated });
});

// Connect wallet
const connectWalletSchema = z.object({
  walletAddress: z.string().min(32).max(64),
  signature: z.string(),
  message: z.string(),
});

authRoutes.post('/connect-wallet', auth, zValidator('json', connectWalletSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const { walletAddress } = c.req.valid('json');

  // TODO: Verify signature with Solana/Web3

  await db.update(users)
    .set({ walletAddress, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return c.json({ success: true, message: 'Wallet connected' });
});

// Wallet-only login (sign message)
const walletLoginSchema = z.object({
  walletAddress: z.string().min(32).max(64),
  signature: z.string(),
  message: z.string(),
});

authRoutes.post('/wallet-login', zValidator('json', walletLoginSchema), async (c) => {
  const db = c.get('db');
  const { walletAddress } = c.req.valid('json');

  // TODO: Verify signature

  let user = await db.query.users.findFirst({
    where: eq(users.walletAddress, walletAddress),
  });

  if (!user) {
    // Auto-create user for wallet login
    const userId = nanoid();
    const now = new Date();

    await db.insert(users).values({
      id: userId,
      email: `${walletAddress.slice(0, 8)}@wallet.betpot`,
      passwordHash: await hashPassword(nanoid()),
      walletAddress,
      preferredChain: 'SOL',
      role: 'user',
      createdAt: now,
      updatedAt: now,
      lastLogin: now,
    });

    user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  if (!user) {
    return c.json({ success: false, error: 'Failed to create user' }, 500);
  }

  await db.update(users)
    .set({ lastLogin: new Date() })
    .where(eq(users.id, user.id));

  const token = await generateToken(user.id, c.env.JWT_SECRET);

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        preferredChain: user.preferredChain,
        role: user.role,
      },
    },
  });
});

export default authRoutes;
