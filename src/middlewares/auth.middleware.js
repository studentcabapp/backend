// src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';

// Verify access token and attach req.user
export const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // minimal fields in token: id, role, tier
    req.user = { id: decoded.id, role: decoded.role, tier: decoded.tier };
    // console.log(`User ${req.user.id} authenticated with role ${req.user.role} and tier ${req.user.tier}`);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role guard factory: accepts one or more allowed roles
export const requireRoles = (...allowedRoles) => (req, res, next) => {
  // console.log(req.user.role);
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  }
  return next();
};

// Small IP-based rate limiter middleware (memory) — fine for local testing
const ipCounters = new Map();
export const ipRateLimiter = ({ windowMs = 60_000, max = 60 } = {}) => (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const record = ipCounters.get(ip) || { timestamps: [] };
  // keep timestamps within window
  record.timestamps = record.timestamps.filter(t => now - t < windowMs);
  record.timestamps.push(now);
  ipCounters.set(ip, record);
  if (record.timestamps.length > max) {
    return res.status(429).json({ error: 'Too many requests from this IP, slow down' });
  }
  next();
};
