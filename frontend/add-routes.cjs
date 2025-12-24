const fs = require('fs');

let content = fs.readFileSync('src/index.ts', 'utf8');

// Add import
content = content.replace(
    "import { chatRoutes } from './routes/chat';",
    "import { chatRoutes } from './routes/chat';\nimport { notificationsRoutes } from './routes/notifications';"
);

// Add route
content = content.replace(
    "app.route('/api/chat', chatRoutes);",
    "app.route('/api/chat', chatRoutes);\napp.route('/api/notifications', notificationsRoutes);"
);

fs.writeFileSync('src/index.ts', content);
console.log('Added notifications routes to index.ts!');
