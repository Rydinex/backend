const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

// Get driver profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Fetch from database
    res.json({
      id,
      name: 'John Driver',
      email: 'driver@example.com',
      rating: 4.8,
      totalRides: 250,
      status: 'online',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update driver status
router.patch('/:id/status', authenticate, authorize(['driver']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // TODO: Update in database
    res.json({ id, status, updatedAt: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get available drivers
router.get('/', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    // TODO: Implement geofencing to find nearby drivers
    res.json({
      drivers: [
        { id: 'driver-1', name: 'John', rating: 4.8, distance: '2.3 km' },
        { id: 'driver-2', name: 'Jane', rating: 4.9, distance: '1.8 km' },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
