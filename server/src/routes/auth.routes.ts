import { Router } from 'express';
import { clerkMiddleware, getAuth } from '@clerk/express';
import { syncHandler, meHandler } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

export const authRouter = Router();

authRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'auth/status' });
});

// Use clerkMiddleware to debug token verification issues
authRouter.post('/sync', clerkMiddleware(), (req, res, next) => {
  const auth = getAuth(req);
  console.log('[sync route] auth state:', {
    userId: auth?.userId,
    sessionId: auth?.sessionId,
    claims: auth?.sessionClaims,
  });
  next();
}, syncHandler);

// The me route uses the full `authenticate` middleware to populate `req.userId`
authRouter.get('/me', authenticate, meHandler);

