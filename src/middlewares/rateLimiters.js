// middleware/rateLimiters.js
import rateLimit from 'express-rate-limit';

// Per-IP limiter for verification endpoints
export const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  max: 30, // 30 requests per 15m per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for sending codes
export const sendCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // only 5 send attempts per 15m per IP
  standardHeaders: true,
  legacyHeaders: false,
});
