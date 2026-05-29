import { Router } from 'express';
import {
  requestEmailVerificationHandler,
  confirmEmailHandler,
  verifyCloudinaryHandler,
  verifyAgeHandler,
  verifyIdHandler,
  verifyProfileHandler,
  getVerificationStatusHandler,
} from '../controllers/verification.controller';
import { authenticate } from '../middleware/auth.middleware';

export const verificationRouter = Router();

// Public routes
verificationRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'verification/status' });
});

// Protected routes (require authentication)
verificationRouter.post('/email/confirm', authenticate, confirmEmailHandler);
verificationRouter.post('/email', authenticate, requestEmailVerificationHandler);
verificationRouter.post('/cloudinary', authenticate, verifyCloudinaryHandler);
verificationRouter.post('/age', authenticate, verifyAgeHandler);
verificationRouter.post('/id', authenticate, verifyIdHandler);
verificationRouter.post('/profile', authenticate, verifyProfileHandler);
verificationRouter.get('/status/me', authenticate, getVerificationStatusHandler);
