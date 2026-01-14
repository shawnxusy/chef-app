import pg from 'pg';

const { Pool } = pg;

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Test connection - only log once
let connectionLogged = false;
pool.on('connect', () => {
  if (!connectionLogged) {
    console.log('Connected to PostgreSQL database');
    connectionLogged = true;
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

export const db = {
  query: <T extends pg.QueryResultRow>(text: string, params?: unknown[]) =>
    pool.query<T>(text, params),

  getClient: () => pool.connect(),

  // Transaction helper
  transaction: async <T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};

export default db;
