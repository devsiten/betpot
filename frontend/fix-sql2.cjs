const fs = require('fs');

let content = fs.readFileSync('src/db/schema.ts', 'utf8');

// Remove sql from sqlite-core import (it's not there)
content = content.replace(
    "import { sqliteTable, text, integer, real, index, sql } from 'drizzle-orm/sqlite-core';",
    "import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';\nimport { sql } from 'drizzle-orm';"
);

fs.writeFileSync('src/db/schema.ts', content);
console.log('Fixed sql import in schema.ts!');
