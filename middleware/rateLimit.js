const { getRedisClient } = require('../services/redisClient');

function createRateLimiter({ identifier, windowMs, max, message }) {
  const redis = getRedisClient();

  return async (req, res, next) => {
    try {
      const key = `ratelimit:${identifier}:${req.ip}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));

      if (current > max) {
        return res.status(429).json({ error: message || 'Too many requests' });
      }

      next();
    } catch (err) {
      console.error('Rate limiter error:', err);
      next(); // Fail open
    }
  };
}

module.exports = { createRateLimiter };
