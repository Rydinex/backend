const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateToken } = require('../services/tokenService');

function getConfiguredAdmin() {
  return {
    email: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || '',
  };
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const configuredAdmin = getConfiguredAdmin();
  if (!configuredAdmin.email || !configuredAdmin.password) {
    return res.status(503).json({ message: 'Admin credentials are not configured on the server.' });
  }

  const emailMatches = String(email).trim().toLowerCase() === configuredAdmin.email;
  const passwordMatches = String(password) === configuredAdmin.password;

  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({ message: 'Invalid admin credentials.' });
  }

  const token = generateToken(configuredAdmin.email, 'admin');

  return res.json({
    token,
    admin: {
      email: configuredAdmin.email,
      role: 'admin',
    },
  });
});

router.get('/me', authenticate, authorize(['admin']), (req, res) => {
  return res.json({
    email: req.user.userId,
    role: req.user.role,
  });
});

module.exports = router;