import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS (stored as text in SQLite)
// ============================================================================

export const userRoles = ['user', 'admin', 'superadmin'] as const;
export const chains = ['SOL', 'ETH', 'BSC', 'TRC'] as const;
export const eventCategories = ['sports', 'finance', 'crypto', 'politics', 'entertainment', 'news', 'other'] as const;
export const eventStatuses = ['draft', 'upcoming', 'open', 'locked', 'resolved', 'cancelled'] as const;
export const ticketStatuses = ['active', 'won', 'lost', 'claimed', 'refunded'] as const;

export type UserRole = typeof userRoles[number];
export type Chain = typeof chains[number];
export type EventCategory = typeof eventCategories[number];
export type EventStatus = typeof eventStatuses[number];
export type TicketStatus = typeof ticketStatuses[number];

// ============================================================================
// TABLES
// ============================================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  walletAddress: text('wallet_address'),
  preferredChain: text('preferred_chain').$type<Chain>().default('SOL'),
  role: text('role').$type<UserRole>().default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
}, (table) => ({
  walletIdx: index('users_wallet_idx').on(table.walletAddress),
  roleIdx: index('users_role_idx').on(table.role),
  emailIdx: index('users_email_idx').on(table.email),
}));

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').$type<EventCategory>().notNull(),
  ticketPrice: real('ticket_price').default(10.00),
  imageUrl: text('image_url'),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  lockTime: integer('lock_time', { mode: 'timestamp' }).notNull(),
  eventTime: integer('event_time', { mode: 'timestamp' }).notNull(),
  status: text('status').$type<EventStatus>().default('draft'),
  winningOption: text('winning_option'),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  resolvedBy: text('resolved_by'),
  totalPool: real('total_pool').default(0),
  // Jackpot & External API fields
  isJackpot: integer('is_jackpot', { mode: 'boolean' }).default(false),
  externalId: text('external_id'), // ID from external API
  externalSource: text('external_source'), // 'odds-api' or 'api-sports'
  externalData: text('external_data'), // JSON string of full external data
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  statusIdx: index('events_status_idx').on(table.status),
  categoryIdx: index('events_category_idx').on(table.category),
  eventTimeIdx: index('events_event_time_idx').on(table.eventTime),
  jackpotIdx: index('events_jackpot_idx').on(table.isJackpot),
}));

export const eventOptions = sqliteTable('event_options', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  optionId: text('option_id').notNull(), // A, B, C, D
  label: text('label').notNull(),
  ticketLimit: integer('ticket_limit').notNull(),
  ticketsSold: integer('tickets_sold').default(0),
  poolAmount: real('pool_amount').default(0),
  isWinner: integer('is_winner', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  eventIdx: index('event_options_event_idx').on(table.eventId),
  uniqueOption: index('event_options_unique').on(table.eventId, table.optionId),
}));

export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(),
  serialNumber: text('serial_number').notNull().unique(),
  eventId: text('event_id').notNull().references(() => events.id),
  optionId: text('option_id').notNull().references(() => eventOptions.id),
  optionLabel: text('option_label').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  walletAddress: text('wallet_address').notNull(),
  chain: text('chain').$type<Chain>().notNull(),
  purchasePrice: real('purchase_price').notNull(),
  purchaseTx: text('purchase_tx').notNull(),
  status: text('status').$type<TicketStatus>().default('active'),
  payoutAmount: real('payout_amount'),
  claimTx: text('claim_tx'),
  claimedAt: integer('claimed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('tickets_user_idx').on(table.userId),
  eventIdx: index('tickets_event_idx').on(table.eventId),
  walletIdx: index('tickets_wallet_idx').on(table.walletAddress),
  statusIdx: index('tickets_status_idx').on(table.status),
}));

export const adminAuditLogs = sqliteTable('admin_audit_logs', {
  id: text('id').primaryKey(),
  adminId: text('admin_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  details: text('details'), // JSON string
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  adminIdx: index('audit_admin_idx').on(table.adminId),
  entityIdx: index('audit_entity_idx').on(table.entityType, table.entityId),
  createdIdx: index('audit_created_idx').on(table.createdAt),
}));

export const platformSettings = sqliteTable('platform_settings', {
  id: text('id').primaryKey().default('settings'),
  ticketPrice: real('ticket_price').default(10.00),
  platformFee: real('platform_fee').default(0.01),
  maxEventsPerDay: integer('max_events_per_day').default(3),
  claimDelayHours: integer('claim_delay_hours').default(3),
  maintenanceMode: integer('maintenance_mode', { mode: 'boolean' }).default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Event Chat Messages - auto-deleted when event ends
export const eventMessages = sqliteTable('event_messages', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  walletAddress: text('wallet_address').notNull(),
  message: text('message').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  eventIdx: index('messages_event_idx').on(table.eventId),
  createdIdx: index('messages_created_idx').on(table.createdAt),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  tickets: many(tickets),
  auditLogs: many(adminAuditLogs),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  options: many(eventOptions),
  tickets: many(tickets),
}));

export const eventOptionsRelations = relations(eventOptions, ({ one, many }) => ({
  event: one(events, { fields: [eventOptions.eventId], references: [events.id] }),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  event: one(events, { fields: [tickets.eventId], references: [events.id] }),
  option: one(eventOptions, { fields: [tickets.optionId], references: [eventOptions.id] }),
  user: one(users, { fields: [tickets.userId], references: [users.id] }),
}));

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  admin: one(users, { fields: [adminAuditLogs.adminId], references: [users.id] }),
}));
