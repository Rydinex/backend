const express = require('express');
const router = express.Router();
// Mocked trips router since authentication is not fully wired

// Upfront Pricing calculation
router.post('/upfront-pricing', async (req, res) => {
  try {
    const { pickup, dropoff, rideCategory } = req.body;
    
    if (!pickup || !dropoff) {
      return res.status(400).json({ message: 'Pickup and dropoff locations required' });
    }

    // Mock response, the frontend calculates its own pricing visually now,
    // but we return a generic structure just in case.
    res.status(200).json({
      rideCategory: rideCategory || 'black_car',
      upfrontFare: 25.50,
      surgeMultiplier: 1.0,
      distanceMiles: 5.2,
      durationMinutes: 15,
      currency: 'USD',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Request a Ride
router.post('/request', async (req, res) => {
  try {
    const { riderId, rideCategory, pickup, dropoff } = req.body;

    if (!pickup || !dropoff) {
      return res.status(400).json({ message: 'Pickup and dropoff locations required' });
    }

    // Return a mock trip object to advance the flow
    const tripId = `trip-${Date.now()}`;
    
    res.status(201).json({
      message: 'Ride requested successfully',
      id: tripId,
      trip: {
        _id: tripId,
        status: 'searching',
        rideCategory: rideCategory || 'black_car',
        pickup,
        dropoff,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
