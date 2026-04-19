const jwt = require('jsonwebtoken');

function generateToken(userId, role = 'user') {
  return jwt.sign(
    { userId, role, iat: Date.now() },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
}

function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = { generateToken, verifyToken, decodeToken };
