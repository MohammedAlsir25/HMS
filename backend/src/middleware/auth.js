import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user?.permissions) {
      return res.status(403).json({ message: 'No permissions found' });
    }
    const hasAll = permissions.every((p) => req.user.permissions.includes(p));
    if (!hasAll) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}
