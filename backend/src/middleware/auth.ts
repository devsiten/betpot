import { Context, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as jose from 'jose';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { AppContext } from '../types';

export const auth: MiddlewareHandler<AppContext> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const walletAddress = c.req.header('X-Wallet-Address');

  // Try JWT auth first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);

      const db = c.get('db');
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.userId as string),
        columns: {
          id: true,
          email: true,
          walletAddress: true,
          role: true,
        },
      });

      if (user) {
        c.set('user', user);
        await next();
        return;
      }
    } catch (error) {
      // JWT failed, continue to try wallet auth
    }
  }

  // Try wallet-based auth
  if (walletAddress) {
    // Create a virtual user based on wallet address
    c.set('user', {
      id: walletAddress,
      email: `${walletAddress.slice(0, 8)}@wallet`,
      walletAddress: walletAddress,
      role: 'user',
    } as any);
    await next();
    return;
  }

  throw new HTTPException(401, { message: 'Authentication required' });
};

export const optionalAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await next();
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    const db = c.get('db');
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId as string),
      columns: {
        id: true,
        email: true,
        walletAddress: true,
        role: true,
      },
    });

    if (user) {
      c.set('user', user);
    }
  } catch {
    // Invalid token, continue without auth
  }

  await next();
};

export const requireAdmin: MiddlewareHandler<AppContext> = async (c, next) => {
  const user = c.get('user');

  // If no JWT user, check for wallet address in header
  if (!user) {
    const walletAddress = c.req.header('X-Wallet-Address');
    if (walletAddress) {
      // Check if wallet is in admin list
      const adminWallets = [
        '8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2',
        'CJpMo2ANF1Q614szsj9jU7qkaWM8RMTTgF3AtKM7Lpw',
        '4Gw23RWwuam8DeRyjXxMNmccaH6f1u82jMDkVJxQ4SGR',
        'GJrjFmeqSvLwDdRJiQFoYXUiRQgF95bE9NddZfEsJQvz',
      ];
      if (adminWallets.includes(walletAddress)) {
        // Set a minimal user object for wallet-based admin
        c.set('user', {
          id: walletAddress,
          email: 'wallet@admin',
          walletAddress: walletAddress,
          role: 'admin',
        } as any);
        await next();
        return;
      }
    }
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  if (user.role !== 'admin') {
    // Fallback to wallet address check
    const adminWallets = [
      '8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2',
      'CJpMo2ANF1Q614szsj9jU7qkaWM8RMTTgF3AtKM7Lpw',
      '4Gw23RWwuam8DeRyjXxMNmccaH6f1u82jMDkVJxQ4SGR',
      'GJrjFmeqSvLwDdRJiQFoYXUiRQgF95bE9NddZfEsJQvz',
    ];
    if (user.walletAddress && adminWallets.includes(user.walletAddress)) {
      await next();
      return;
    }
    throw new HTTPException(403, { message: 'Admin access required' });
  }

  await next();
};

export const requireSuperAdmin: MiddlewareHandler<AppContext> = async (c, next) => {
  const user = c.get('user');

  // Super admin wallet addresses (full access)
  const superAdminWallets = [
    '8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2',
    'CJpMo2ANF1Q614szsj9jU7qkaWM8RMTTgF3AtKM7Lpw',
    '4Gw23RWwuam8DeRyjXxMNmccaH6f1u82jMDkVJxQ4SGR',
    'GJrjFmeqSvLwDdRJiQFoYXUiRQgF95bE9NddZfEsJQvz',
  ];

  // Check for wallet-based super admin via header
  const walletAddress = c.req.header('X-Wallet-Address');
  if (walletAddress && superAdminWallets.includes(walletAddress)) {
    c.set('user', {
      id: walletAddress,
      email: 'wallet@superadmin',
      walletAddress: walletAddress,
      role: 'superadmin',
    } as any);
    await next();
    return;
  }

  if (!user) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  // Check if wallet-based user is in super admin list
  if (user.walletAddress && superAdminWallets.includes(user.walletAddress)) {
    await next();
    return;
  }

  if (user.role !== 'superadmin') {
    throw new HTTPException(403, { message: 'Super admin access required' });
  }

  await next();
};

// Generate JWT token with 2-hour expiration
export async function generateToken(userId: string, secret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  const token = await new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')  // 2-hour session expiration
    .sign(secretKey);

  return token;
}
