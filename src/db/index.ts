import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: pg.Pool | undefined;
}

interface ResolvedPoolConfig {
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  port: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

function resolvePostgresPoolConfig(): ResolvedPoolConfig {
  let host = process.env.SQL_HOST || process.env.PGHOST || process.env.POSTGRES_HOST;
  let user = process.env.SQL_USER || process.env.PGUSER || process.env.POSTGRES_USER;
  let password = process.env.SQL_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  let database = process.env.SQL_DB_NAME || process.env.PGDATABASE || process.env.POSTGRES_DATABASE;
  let port = parseInt(process.env.SQL_PORT || process.env.PGPORT || process.env.POSTGRES_PORT || '5432', 10);
  let sslModeFromUrl: string | null = null;

  if (!host) {
    const rawUrl =
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.POSTGRES_URL_NON_POOLING;
    if (rawUrl && rawUrl.trim()) {
      try {
        const parsed = new URL(rawUrl.trim());
        host = parsed.hostname || host;
        user = parsed.username ? decodeURIComponent(parsed.username) : user;
        password = parsed.password ? decodeURIComponent(parsed.password) : password;
        const dbPath = parsed.pathname.replace(/^\/+/, '');
        if (dbPath) database = dbPath;
        if (parsed.port) port = parseInt(parsed.port, 10);
        sslModeFromUrl = parsed.searchParams.get('sslmode');
      } catch {
        // Ignore malformed URL and fall back to env vars
      }
    }
  }

  const isLocalOrSocket =
    !host ||
    host.startsWith('/') ||
    host === '127.0.0.1' ||
    host === 'localhost';

  const forceSsl =
    process.env.SQL_SSL === 'true' ||
    (sslModeFromUrl !== null && sslModeFromUrl !== 'disable');

  const disableSsl =
    process.env.SQL_SSL === 'false' ||
    sslModeFromUrl === 'disable';

  const useSsl = !disableSsl && (forceSsl || !isLocalOrSocket);

  return {
    host,
    user,
    password,
    database,
    port: Number.isFinite(port) ? port : 5432,
    ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  };
}

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!global._postgresPool) {
    const resolved = resolvePostgresPoolConfig();
    const isServerless = Boolean(process.env.VERCEL);

    global._postgresPool = new Pool({
      host: resolved.host,
      user: resolved.user,
      password: resolved.password,
      database: resolved.database,
      port: resolved.port,
      ...(resolved.ssl ? { ssl: resolved.ssl } : {}),
      max: isServerless ? 5 : 10,
      idleTimeoutMillis: isServerless ? 10000 : 20000,
      connectionTimeoutMillis: 15000,
      allowExitOnIdle: isServerless,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    // Handle pool-level client disconnects cleanly without crashing or logging fatal errors for routine idle terminations
    global._postgresPool.on('error', (err: any) => {
      const msg = err?.message || String(err);
      if (isDbUnavailableError(err)) {
        logDbError('idle pool client', err);
      } else {
        console.error('Unexpected error on idle SQL pool client:', msg);
      }
    });
  }
  return global._postgresPool;
};

let lastDbUnavailableWarnAt = 0;
const DB_UNAVAILABLE_WARN_THROTTLE_MS = 60000;

export function isDbUnavailableError(error: unknown, depth = 0): boolean {
  if (!error || depth > 5) return false;
  if (typeof error === 'string') {
    const lower = error.toLowerCase();
    return (
      lower.includes('connection terminated') ||
      lower.includes('econnrefused') ||
      lower.includes('econnreset') ||
      lower.includes('etimedout') ||
      lower.includes('epipe') ||
      lower.includes('enoent') ||
      lower.includes('not running') ||
      lower.includes('database system is') ||
      lower.includes('client has encountered a connection error') ||
      lower.includes('timeout expired')
    );
  }
  if (typeof error === 'object') {
    const errObj = error as any;
    const code = String(errObj.code || '');
    if (
      code === 'ECONNREFUSED' ||
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'EPIPE' ||
      code === 'ENOENT' ||
      code === '57P01' ||
      code === '57P02' ||
      code === '57P03' ||
      code === '08001' ||
      code === '08003' ||
      code === '08004' ||
      code === '08006'
    ) {
      return true;
    }
    if (typeof errObj.message === 'string' && isDbUnavailableError(errObj.message, depth + 1)) {
      return true;
    }
    if (errObj.cause && isDbUnavailableError(errObj.cause, depth + 1)) {
      return true;
    }
    if (Array.isArray(errObj.errors)) {
      for (const inner of errObj.errors) {
        if (isDbUnavailableError(inner, depth + 1)) return true;
      }
    }
  }
  return false;
}

export function logDbError(context: string, error: unknown): void {
  if (isDbUnavailableError(error)) {
    const now = Date.now();
    if (now - lastDbUnavailableWarnAt >= DB_UNAVAILABLE_WARN_THROTTLE_MS) {
      lastDbUnavailableWarnAt = now;
      console.warn(`[PostgreSQL Unavailable] ${context}: database connection terminated or instance is not running.`);
    }
    return;
  }
  console.error(`Database ${context} failed:`, error);
}

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
