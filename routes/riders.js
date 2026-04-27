const express = require('express');
const router = express.Router();
const { generateToken } = require('../services/tokenService');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const riderId = 'test-rider-id';
    const token = generateToken(riderId, 'rider');
    res.json({ token, rider: { id: riderId, email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const riderId = 'new-rider-id';
    const token = generateToken(riderId, 'rider');
    res.status(201).json({ token, rider: { id: riderId, email, name, phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
