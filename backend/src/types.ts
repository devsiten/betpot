import { Database } from './db';

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespace
  CACHE: KVNamespace;

  // R2 Bucket for images
  IMAGES: R2Bucket;

  // Durable Objects
  EVENTS_DO: DurableObjectNamespace;

  // Environment variables
  ENVIRONMENT: string;
  JWT_SECRET: string;
  TICKET_PRICE: string;
  PLATFORM_FEE: string;
  MAX_EVENTS_PER_DAY: string;
  ADMIN_EMAILS: string;

  // External Sports APIs
  THE_ODDS_API_KEY: string;
  API_SPORTS_KEY: string;

  // Solana
  SOLANA_RPC_URL: string;
  TREASURY_WALLET: string;
}

export interface Variables {
  db: Database;
  user?: {
    id: string;
    email: string;
    walletAddress: string | null;
    role: 'user' | 'admin' | 'superadmin';
  };
  requestId: string;
}

export type AppContext = {
  Bindings: Env;
  Variables: Variables;
};
