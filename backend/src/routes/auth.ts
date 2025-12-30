import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { users } from '../db/schema';
import { generateToken, auth } from '../middleware/auth';
import { AppContext } from '../types';

const authRoutes = new Hono<AppContext>();

// Base58 alphabet for Solana
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Decode base58 string to Uint8Array (Cloudflare Workers compatible)
function decodeBase58(input: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of input) {
    const value = BASE58_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Handle leading zeros
  for (const char of input) {
    if (char === '1') {
      bytes.push(0);
    } else {
      break;
    }
  }
  return new Uint8Array(bytes.reverse());
}

// Verify Solana wallet signature (Ed25519)
function verifySolanaSignature(message: string, signature: string, publicKey: string): boolean {
  try {
    console.log('Verifying signature for:', {
      messageLen: message.length,
      sigLen: signature.length,
      pubKeyLen: publicKey.length
    });
    const messageBytes = new TextEncoder().encode(message);
    // Use bs58 library instead of custom decoder
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(publicKey);
    console.log('Decoded bytes:', { sigLen: signatureBytes.length, pubKeyLen: publicKeyBytes.length });
    const result = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    console.log('Signature verification result:', result);
    return result;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

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
  username: z.string().min(3).max(30).optional(),
  displayName: z.string().min(1).max(50).optional(),
});

authRoutes.put('/profile', auth, zValidator('json', updateProfileSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const data = c.req.valid('json');

  // Check username uniqueness if provided
  if (data.username) {
    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, data.username),
    });
    if (existingUsername && existingUsername.id !== user.id) {
      return c.json({ success: false, error: 'Username already taken' }, 400);
    }
  }

  await db.update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return c.json({ success: true, data: { message: 'Profile updated successfully' } });
});

// Get full profile with referral info
authRoutes.get('/profile', auth, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const fullUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { passwordHash: false },
  });

  if (!fullUser) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: fullUser.id,
      email: fullUser.email,
      username: fullUser.username,
      displayName: fullUser.displayName,
      walletAddress: fullUser.walletAddress,
      referralCode: fullUser.referralCode,
      discordId: fullUser.discordId,
      discordUsername: fullUser.discordUsername,
      discordRole: fullUser.discordRole,
      twitterHandle: fullUser.twitterHandle,
      twitterVerified: fullUser.twitterVerified || false,
      volumePoints: fullUser.volumePoints || 0,
      referralPoints: fullUser.referralPoints || 0,
    },
  });
});

// Delete account
authRoutes.delete('/account', auth, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  try {
    // Delete in order due to foreign key constraints
    // Note: tickets are orphaned (not deleted) to preserve jackpot history
    await db.delete(users).where(eq(users.id, user.id));

    return c.json({ success: true, data: { message: 'Account deleted successfully' } });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return c.json({ success: false, error: 'Failed to delete account' }, 500);
  }
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
  const { walletAddress, signature, message } = c.req.valid('json');

  // Verify Solana signature
  const isValidSignature = verifySolanaSignature(message, signature, walletAddress);
  if (!isValidSignature) {
    return c.json({ success: false, error: 'Invalid signature' }, 401);
  }

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

authRoutes.post('/wallet-login', async (c) => {
  try {
    const body = await c.req.json();
    console.log('Wallet login request received:', {
      hasWalletAddress: !!body.walletAddress,
      hasSignature: !!body.signature,
      hasMessage: !!body.message
    });

    const { walletAddress, signature, message } = body;

    if (!walletAddress || !signature || !message) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const db = c.get('db');

    console.log('Wallet login attempt:', { walletAddress: walletAddress.substring(0, 10) + '...' });

    // Verify Solana signature
    const isValidSignature = verifySolanaSignature(message, signature, walletAddress);
    console.log('Signature valid:', isValidSignature);
    if (!isValidSignature) {
      return c.json({ success: false, error: 'Invalid signature' }, 401);
    }

    // Optional: Validate message format (must contain recent timestamp to prevent replay)
    // Message format: "Sign this message to login to BETPOT: {timestamp}"
    const timestampMatch = message.match(/BETPOT: (\d+)/);
    if (timestampMatch) {
      const messageTimestamp = parseInt(timestampMatch[1], 10);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      if (Math.abs(now - messageTimestamp) > fiveMinutes) {
        return c.json({ success: false, error: 'Message expired, please sign again' }, 401);
      }
    }

    let user = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    if (!user) {
      // Auto-create user for wallet login
      const userId = nanoid();
      const now = new Date();

      try {
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
        console.log('Created new user:', userId);
      } catch (insertError: any) {
        console.error('Failed to create user:', insertError);
        // Check if user was created by another request (race condition)
        user = await db.query.users.findFirst({
          where: eq(users.walletAddress, walletAddress),
        });
        if (!user) {
          return c.json({ success: false, error: `Failed to create account: ${insertError.message}` }, 500);
        }
      }

      if (!user) {
        user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
      }
    }

    if (!user) {
      return c.json({ success: false, error: 'Failed to create or find user' }, 500);
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
  } catch (error: unknown) {
    console.error('Wallet login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: `Login failed: ${errorMessage}` }, 500);
  }
});

export default authRoutes;
