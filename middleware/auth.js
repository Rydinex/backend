const { verifyToken } = require('../services/tokenService');

function authenticate(req, res, next) {
  try {
    const token = 
      req.headers.authorization?.split(' ')[1] || 
      req.headers['x-session-token'] ||
      req.query.sessionToken;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

module.exports = { authenticate, authorize };
