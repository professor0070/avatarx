import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

// Skip rate limiting for localhost/dev environments entirely
const skipLocalhost = (req: Request) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.');
};

export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute (short window for dev-friendly resets)
  max: 300,            // 300 req/min per IP — impossible to hit in normal use
  skip: skipLocalhost,
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictAuthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,            // Kept in case it's applied elsewhere in future
  skip: skipLocalhost,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' }
});
