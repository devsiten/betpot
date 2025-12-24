const fs = require('fs');

// Read admin.ts
let content = fs.readFileSync('src/routes/admin.ts', 'utf8');

// Find the cancel event section and add auto-resolve for failed transactions
const searchStr = `.where(eq(tickets.eventId, id));

    // Set event sta`;

const replaceStr = `.where(eq(tickets.eventId, id));

    // Also mark any pending failed transactions for this event as resolved
    await db.update(failedTransactions)
      .set({ status: 'resolved', resolvedAt: now, note: 'Auto-resolved: Event cancelled and refunds issued' })
      .where(and(eq(failedTransactions.eventId, id), eq(failedTransactions.status, 'pending')));

    // Set event sta`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync('src/routes/admin.ts', content);
    console.log('Successfully added auto-resolve for failed transactions on event cancel!');
} else {
    console.log('Search string not found');
}
