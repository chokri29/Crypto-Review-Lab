import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: pg.Pool | undefined;
}

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    // Handle pool-level client disconnects cleanly without crashing or logging fatal errors for routine idle terminations
    global._postgresPool.on('error', (err: any) => {
      const msg = err?.message || String(err);
      const isIdleDisconnect =
        msg.includes('Connection terminated') ||
        msg.includes('ECONNRESET') ||
        msg.includes('EPIPE') ||
        err?.code === '57P01';

      if (isIdleDisconnect) {
        console.warn('PostgreSQL idle client disconnected upstream (pool will recreate on next query):', msg);
      } else {
        console.error('Unexpected error on idle SQL pool client:', err);
      }
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
