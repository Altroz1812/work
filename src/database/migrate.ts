import { db } from './connection.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Use async readFile for modern Node.js 20.19 compatibility
    const schemaSQL = await readFile(join(__dirname, '../migrations/schema.sql'), 'utf-8');
    
    await db.query(schemaSQL);
    
    console.log('✅ Database migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export { migrate };