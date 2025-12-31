import { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as jose from 'jose';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { AppContext } from '../types';

/**
 * Get admin wallet addresses from environment variable.
 * Format: comma-separated list of Solana wallet addresses.
 */
function getAdminWallets(env: any): string[] {
  const adminWalletsEnv = env.ADMIN_WALLETS || '';
  return adminWalletsEnv
    .split(',')
    .map((w: string) => w.trim())
    .filter((w: string) => w.length > 0);
}

/**
 * Main authentication middleware.
 * SECURITY: Only accepts valid JWT tokens. No header-based impersonation allowed.
 */
export const auth: MiddlewareHandler<AppContext> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

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

    if (!user) {
      throw new HTTPException(401, { message: 'User not found' });
    }

    c.set('user', user as any);
    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }
};

/**
 * Optional authentication - allows unauthenticated access but sets user if valid JWT provided.
 */
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
      c.set('user', user as any);
    }
  } catch {
    // Invalid token, continue without auth
  }

  await next();
};

/**
 * Admin access middleware.
 * SECURITY: Requires valid JWT. Checks role='admin' OR wallet in ADMIN_WALLETS env.
 */
export const requireAdmin: MiddlewareHandler<AppContext> = async (c, next) => {
  const user = c.get('user');

  if (!user) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  // Check if user has admin role in database
  if (user.role === 'admin' || user.role === 'superadmin') {
    await next();
    return;
  }

  // Fallback: check if wallet is in admin list from environment
  const adminWallets = getAdminWallets(c.env);
  if (user.walletAddress && adminWallets.includes(user.walletAddress)) {
    await next();
    return;
  }

  throw new HTTPException(403, { message: 'Admin access required' });
};

/**
 * Super admin access middleware.
 * SECURITY: Requires valid JWT. Checks role='superadmin' OR wallet in ADMIN_WALLETS env.
 */
export const requireSuperAdmin: MiddlewareHandler<AppContext> = async (c, next) => {
  const user = c.get('user');

  if (!user) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  // Check if user has superadmin role in database
  if (user.role === 'superadmin') {
    await next();
    return;
  }

  // Fallback: check if wallet is in admin list from environment (super admins)
  const adminWallets = getAdminWallets(c.env);
  if (user.walletAddress && adminWallets.includes(user.walletAddress)) {
    await next();
    return;
  }

  throw new HTTPException(403, { message: 'Super admin access required' });
};

/**
 * Generate JWT token with 2-hour expiration.
 */
export async function generateToken(userId: string, secret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  const token = await new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secretKey);

  return token;
}
