import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';
import { nanoid } from 'nanoid';
import { createDb } from './db';
import { AppContext, Env } from './types';

// Routes
import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import ticketsRoutes from './routes/tickets';
import adminRoutes from './routes/admin';
import { sportsApi } from './routes/sports';
import { chatRoutes } from './routes/chat';
import { notificationsRoutes } from './routes/notifications';
import { blogRoutes } from './routes/blog';
import { newsRoutes } from './routes/news';

const app = new Hono<AppContext>();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Request ID
app.use('*', async (c, next) => {
  c.set('requestId', nanoid());
  await next();
});

// CORS - Allow all origins for maximum browser compatibility
app.use('*', cors({
  origin: '*',  // Allow all origins - needed for mobile/Web3 browsers
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Wallet-Address'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: false,  // Must be false when origin is '*'
}));

// Security headers
app.use('*', secureHeaders());

// Logger (dev only)
app.use('*', logger());

// Database middleware
app.use('*', async (c, next) => {
  const db = createDb(c.env.DB);
  c.set('db', db);
  await next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'BetPot API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/events', eventsRoutes);
app.route('/api/tickets', ticketsRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/sports', sportsApi);
app.route('/api/chat', chatRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/blog', blogRoutes);
app.route('/api/news', newsRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.onError((err, c) => {
  console.error(`Error [${c.get('requestId')}]:`, err);

  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: err.message,
      requestId: c.get('requestId'),
    }, err.status);
  }

  return c.json({
    success: false,
    error: 'Internal server error',
    requestId: c.get('requestId'),
  }, 500);
});

app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
    path: c.req.path,
  }, 404);
});

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  fetch: app.fetch,
};

// Durable Object for real-time event updates (optional)
export class EventsDurableObject {
  private state: DurableObjectState;
  private connections: Set<WebSocket> = new Set();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/websocket') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected websocket', { status: 400 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleWebSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    if (url.pathname === '/broadcast') {
      const data = await request.json();
      this.broadcast(data);
      return new Response('OK');
    }

    return new Response('Not found', { status: 404 });
  }

  handleWebSocket(ws: WebSocket) {
    ws.accept();
    this.connections.add(ws);

    ws.addEventListener('close', () => {
      this.connections.delete(ws);
    });

    ws.addEventListener('error', () => {
      this.connections.delete(ws);
    });
  }

  broadcast(data: unknown) {
    const message = JSON.stringify(data);
    for (const ws of this.connections) {
      try {
        ws.send(message);
      } catch {
        this.connections.delete(ws);
      }
    }
  }
}
