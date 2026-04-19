const express = require('express');
const router = express.Router();
const { generateToken } = require('../services/tokenService');
const { authenticate } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // TODO: Validate against database
    const userId = 'test-user-id';
    const role = 'user';

    const token = generateToken(userId, role);

    res.json({
      token,
      user: { id: userId, email, role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SignUp
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }

    // TODO: Validate and store in database
    const userId = 'new-user-id';

    const token = generateToken(userId, role || 'user');

    res.status(201).json({
      token,
      user: { id: userId, email, name, role: role || 'user' },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
router.post('/logout', authenticate, (req, res) => {
  // Token invalidation logic (optional with Redis)
  res.json({ message: 'Logged out successfully' });
});

// Verify token
router.post('/verify', authenticate, (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = router;
