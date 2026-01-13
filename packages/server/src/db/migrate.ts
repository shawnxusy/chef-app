import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

async function migrate() {
  console.log('Starting database migration...');

  // Create migrations table if not exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Get executed migrations
  const { rows: executed } = await db.query<{ name: string }>(
    'SELECT name FROM _migrations ORDER BY id'
  );
  const executedNames = new Set(executed.map(r => r.name));

  // Get migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (executedNames.has(file)) {
      console.log(`Skipping ${file} (already executed)`);
      continue;
    }

    console.log(`Executing ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    await db.transaction(async (client) => {
      // Execute migration
      await client.query(sql);

      // Record migration
      await client.query(
        'INSERT INTO _migrations (name) VALUES ($1)',
        [file]
      );
    });

    console.log(`Completed ${file}`);
  }

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
