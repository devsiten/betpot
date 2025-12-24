const fs = require('fs');

let content = fs.readFileSync('src/routes/notifications.ts', 'utf8');

// Remove unused users import and fix auth middleware import
content = content.replace(
    "import { notifications, users } from '../db/schema';",
    "import { notifications } from '../db/schema';"
);

// Change requireAuth to authMiddleware based on what the actual export is
content = content.replace(
    "import { requireAuth } from '../middleware/auth';",
    "import { authMiddleware } from '../middleware/auth';"
);

content = content.replace(
    "notificationsRoutes.use('/*', requireAuth);",
    "notificationsRoutes.use('/*', authMiddleware);"
);

fs.writeFileSync('src/routes/notifications.ts', content);
console.log('Fixed notifications routes!');
