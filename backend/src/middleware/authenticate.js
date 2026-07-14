const jwt = require('jsonwebtoken');
const { accessSecret } = require('../config/jwt');

module.exports = function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, accessSecret);
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' } });
  }
};
