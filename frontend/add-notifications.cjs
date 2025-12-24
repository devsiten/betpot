const fs = require('fs');

let content = fs.readFileSync('src/db/schema.ts', 'utf8');

const notificationsTable = `

// Notifications table
export const notificationTypes = ['jackpot_new', 'ticket_won', 'ticket_lost', 'refund_available', 'event_ending', 'new_bet', 'payout_ready'] as const;

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'), // JSON string for additional data
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql\`CURRENT_TIMESTAMP\`),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
`;

content += notificationsTable;
fs.writeFileSync('src/db/schema.ts', content);
console.log('Added notifications table!');
