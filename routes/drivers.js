const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateToken } = require('../services/tokenService');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const driverId = 'test-driver-id';
    const token = generateToken(driverId, 'driver');
    res.json({ token, driver: { id: driverId, email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, driverType } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const driverId = 'new-driver-id';
    const token = generateToken(driverId, 'driver');
    res.status(201).json({ token, driver: { id: driverId, email, name, phone, driverType } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
