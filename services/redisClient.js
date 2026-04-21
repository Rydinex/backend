const Redis = require('ioredis');

let redisClient = null;

function normalizeRedisUrl(value) {
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

function getRedisClient() {
  if (!redisClient) {
    const redisUrl =
      normalizeRedisUrl(process.env.REDIS_URL) ||
      normalizeRedisUrl(process.env.REDIS_URI) ||
      'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
    });

    redisClient.on('connect', () => {
      console.log('✓ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('✗ Redis error:', err);
    });

    redisClient.on('close', () => {
      console.log('✗ Redis disconnected');
    });
  }

  return redisClient;
}

function closeRedisClient() {
  if (redisClient) {
    redisClient.quit();
    redisClient = null;
  }
}

module.exports = { getRedisClient, closeRedisClient };
