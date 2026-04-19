const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Request a ride
router.post('/', authenticate, async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, rideType } = req.body;

    if (!pickupLocation || !dropoffLocation) {
      return res.status(400).json({ error: 'Pickup and dropoff locations required' });
    }

    // TODO: Implement ride matching logic
    const rideId = `ride-${Date.now()}`;

    res.status(201).json({
      id: rideId,
      pickupLocation,
      dropoffLocation,
      rideType,
      status: 'searching',
      estimatedFare: 25.50,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ride status
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Fetch from database
    res.json({
      id,
      status: 'in_progress',
      driver: { id: 'driver-1', name: 'John', rating: 4.8 },
      estimatedArrival: '5 minutes',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete ride
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;

    // TODO: Update ride status and payment
    res.json({ id, status: 'completed', rating, feedback });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
