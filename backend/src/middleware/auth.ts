import { Context, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as jose from 'jose';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { AppContext } from '../types';

export const auth: MiddlewareHandler<AppContext> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'No token provided' });
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

    c.set('user', user);
    await next();
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new HTTPException(401, { message: 'Token expired' });
    }
    if (error instanceof jose.errors.JWTInvalid) {
      throw new HTTPException(401, { message: 'Invalid token' });
    }
    throw error;
  }
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
  
  if (!user) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  if (user.role !== 'admin' && user.role !== 'superadmin') {
    // Fallback to email check
    const adminEmails = (c.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    if (!adminEmails.includes(user.email)) {
      throw new HTTPException(403, { message: 'Admin access required' });
    }
  }

  await next();
};

export const requireSuperAdmin: MiddlewareHandler<AppContext> = async (c, next) => {
  const user = c.get('user');
  
  if (!user) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  if (user.role !== 'superadmin') {
    throw new HTTPException(403, { message: 'Super admin access required' });
  }

  await next();
};

// Generate JWT token
export async function generateToken(userId: string, secret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  
  const token = await new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
    
  return token;
}
