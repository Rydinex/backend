const { Pool } = require('pg');

let pool;
let lastPostgresError = null;

function normalizeConnectionString(value) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getDatabaseUrl() {
  return normalizeConnectionString(
    process.env.DATABASE_URL ||
      process.env.DATABASE_PUBLIC_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRESQL_URL ||
      process.env.PG_URL ||
      process.env.ConnectionStrings__DefaultConnection
  );
}

function toBoolean(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return ['1', 'true', 'yes', 'on', 'require'].includes(value.toLowerCase());
}

function isPostgresConfigured() {
  const databaseUrl = getDatabaseUrl();

  return Boolean(
    databaseUrl ||
      (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE)
  );
}

function buildConfig() {
  const databaseUrl = getDatabaseUrl();
  const sslEnabled = toBoolean(process.env.PGSSL) || toBoolean(process.env.PGSSLMODE);
  const baseConfig = {
    max: Number(process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30_000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 10_000),
  };

  if (databaseUrl) {
    return {
      ...baseConfig,
      connectionString: databaseUrl,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    ...baseConfig,
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  };
}

function getPostgresPool() {
  if (!isPostgresConfigured()) {
    return null;
  }

  if (!pool) {
    pool = new Pool(buildConfig());
    pool.on('error', err => {
      lastPostgresError = err.message;
      console.error('PostgreSQL pool error:', err.message);
    });
  }

  return pool;
}

async function getPostgresStatus() {
  const postgresPool = getPostgresPool();

  if (!postgresPool) {
    return 'not-configured';
  }

  try {
    await postgresPool.query('SELECT 1');
    lastPostgresError = null;
    return 'connected';
  } catch (err) {
    lastPostgresError = err.message;
    return 'error';
  }
}

function getPostgresLastError() {
  return lastPostgresError;
}

module.exports = {
  getPostgresPool,
  getPostgresStatus,
  getPostgresLastError,
  isPostgresConfigured,
};