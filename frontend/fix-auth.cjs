const fs = require('fs');

let content = fs.readFileSync('src/routes/notifications.ts', 'utf8');

content = content.replace(
    "import { authMiddleware } from '../middleware/auth';",
    "import { auth } from '../middleware/auth';"
);

content = content.replace(
    "notificationsRoutes.use('/*', authMiddleware);",
    "notificationsRoutes.use('/*', auth);"
);

fs.writeFileSync('src/routes/notifications.ts', content);
console.log('Fixed auth import!');
