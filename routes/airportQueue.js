const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getRedisClient } = require('../services/redisClient');

// Get airport queue status
router.get('/status/:airportCode', async (req, res) => {
  try {
    const { airportCode } = req.params;
    const redis = getRedisClient();

    // TODO: Fetch queue data from database/cache
    const queueData = await redis.hgetall(`airport:queue:${airportCode}`);

    res.json({
      airport: airportCode,
      queueLength: 23,
      estimatedWait: '15 minutes',
      peakTime: false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join airport queue
router.post('/join', authenticate, async (req, res) => {
  try {
    const { airportCode, flightNumber } = req.body;

    if (!airportCode) {
      return res.status(400).json({ error: 'Airport code required' });
    }

    // TODO: Add to queue in database
    const queueId = `queue-${Date.now()}`;

    res.status(201).json({
      queueId,
      airportCode,
      position: 24,
      estimatedWait: '15 minutes',
      status: 'waiting',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leave airport queue
router.post('/leave/:queueId', authenticate, async (req, res) => {
  try {
    const { queueId } = req.params;

    // TODO: Remove from queue in database
    res.json({ queueId, status: 'left', message: 'Removed from queue' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get queue metrics
router.get('/metrics/:airport', async (req, res) => {
  try {
    const { airport } = req.params;

    // TODO: Aggregate metrics from database
    res.json({
      airport,
      totalQueues: 3,
      averageWaitTime: 18,
      peakTimes: ['8:00-10:00', '17:00-19:00'],
      todayVolume: 450,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
