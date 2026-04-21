const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const { getRedisClient } = require('./services/redisClient');
const { getPostgresStatus, getPostgresLastError } = require('./services/postgresClient');
const { registerLocationSocketHandlers } = require('./sockets/locationSocket');
const { securityHeaders } = require('./middleware/securityHeaders');
const { createRateLimiter } = require('./middleware/rateLimit');
require('dotenv').config();

const DEFAULT_PRODUCTION_CORS_ORIGINS = [
  'https://prd.rydinex.com',
  'https://prd-production-3f0d.up.railway.app',
  'https://driver.rydinex.com',
  'https://driverapp-production-46d5.up.railway.app',
  'https://rider.rydinex.com',
  'https://riderapp-production.up.railway.app',
  'https://admin-dashboard-production-3036.up.railway.app',
  'https://rydinex.com',
  'https://www.rydinex.com',
  'https://frontend-production-89ef.up.railway.app',
  'https://api.rydinex.com',
  'https://backend-production-7e222.up.railway.app',
  'https://admin.rydinex.com',
];

const app = express();
app.disable('x-powered-by');

const corsOrigin = process.env.CORS_ORIGIN || (
  process.env.NODE_ENV === 'production'
    ? DEFAULT_PRODUCTION_CORS_ORIGINS.join(',')
    : '*'
);

const parsedCorsOrigin = corsOrigin.includes(',')
  ? corsOrigin
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  : corsOrigin;

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: parsedCorsOrigin,
    methods: ['GET', 'POST'],
  },
});

app.locals.io = io;

// Connect to MongoDB (supports common legacy env names)
const mongoUri =
  process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGODB_URI;
const mongoUriSource = process.env.MONGO_URL
  ? 'MONGO_URL'
  : process.env.MONGO_URI
    ? 'MONGO_URI'
    : process.env.MONGODB_URI
      ? 'MONGODB_URI'
      : null;
let lastMongoError = null;

mongoose.connection.on('connected', () => {
  lastMongoError = null;
});

mongoose.connection.on('error', err => {
  lastMongoError = err.message;
});

if (mongoUri) {
  mongoose.connect(mongoUri.trim(), {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10_000),
  })
    .then(() => console.log('✓ MongoDB connected'))
    .catch(err => {
      lastMongoError = err.message;
      console.error('✗ MongoDB connection error:', err.message);
    });
} else {
  lastMongoError = 'missing MONGO_URI/MONGO_URL/MONGODB_URI';
  console.error('✗ MongoDB connection error: missing MONGO_URI/MONGO_URL/MONGODB_URI');
}

// Connect to Redis
const redisClient = getRedisClient();
app.locals.redisClient = redisClient;

// Middleware
const globalRateLimiter = createRateLimiter({
  identifier: 'global',
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 240),
  message: 'Too many requests. Please try again in a moment.',
});

app.use(securityHeaders);
app.use(
  cors({
    origin: parsedCorsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204,
  })
);
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '256kb' }));
app.use(globalRateLimiter);

// Socket.IO handlers
registerLocationSocketHandlers(io);

// Routes
app.get('/api/health', async (req, res) => {
  const mongoStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const mongo = mongoStateMap[mongoose.connection.readyState] || 'unknown';
  const postgres = await getPostgresStatus();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongo,
    mongoError: mongo === 'connected' ? null : lastMongoError,
    mongoSource: mongoUriSource,
    redis: redisClient.status || 'unknown',
    postgres,
    postgresError: postgres === 'error' ? getPostgresLastError() : null,
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/rides', require('./routes/rides'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/airport-queue', require('./routes/airportQueue'));
app.use('/api/prd/events', require('./routes/prdEvents'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`\n✓ Rydinex API Server running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  WebSocket enabled on ws://localhost:${PORT}`);
});

module.exports = { app, server, io };
