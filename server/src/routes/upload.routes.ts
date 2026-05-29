import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload, uploadGigMediaHandler, uploadAvatarHandler, uploadPortfolioHandler } from '../controllers/upload.controller';

export const uploadRouter = Router();

// Public route for status
uploadRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'upload/status' });
});

// Protected routes (require authentication)
uploadRouter.post(
  '/gig-media',
  authenticate,
  upload.array('files', 10), // Max 10 files
  uploadGigMediaHandler
);

uploadRouter.post(
  '/avatar',
  authenticate,
  upload.single('avatar'), // Single file
  uploadAvatarHandler
);

uploadRouter.post(
  '/portfolio',
  authenticate,
  upload.array('files', 10), // Max 10 files
  uploadPortfolioHandler
);
