import { Pool, PoolClient } from 'pg';
import 'dotenv/config';

class Database {
  private pool: Pool;
  private static instance: Database;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      if (process.env.NODE_ENV === 'production') {
        // In production, implement graceful shutdown or alerting
        process.exit(-1);
      }
    });

    this.pool.on('connect', () => {
      console.log('📊 Database pool client connected');
    });

    this.pool.on('remove', () => {
      console.log('📊 Database pool client removed');
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Query executed:', { duration: `${duration}ms`, rows: result.rowCount });
      }
      
      return result;
    } finally {
      client.release();
    }
  }

  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    console.log('🔌 Closing database connection pool...');
    await this.pool.end();
  }

  public get poolInfo() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

export const db = Database.getInstance();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, closing database connections...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, closing database connections...');
  await db.close();
  process.exit(0);
});