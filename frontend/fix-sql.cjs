const fs = require('fs');

let content = fs.readFileSync('src/db/schema.ts', 'utf8');

// Add sql to the import from drizzle-orm/sqlite-core
content = content.replace(
    "import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';",
    "import { sqliteTable, text, integer, real, index, sql } from 'drizzle-orm/sqlite-core';"
);

fs.writeFileSync('src/db/schema.ts', content);
console.log('Added sql import to schema.ts!');
