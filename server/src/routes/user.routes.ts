import { Router } from 'express';
import {
  getUserByIdHandler,
  updateUserHandler,
  calculateSellerLevelHandler,
  getSellerLevelRequirementsHandler,
  recalculateAllSellerLevelsHandler,
  getLeaderboardHandler,
  becomeSellerHandler,
  setupCreatorProfileHandler,
  getCurrentUserHandler,
  switchRoleHandler,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

export const userRouter = Router();

// Public routes
userRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'user/status' });
});

// Public routes
userRouter.get('/leaderboard', getLeaderboardHandler); // Top sellers leaderboard

// Protected routes (require authentication)
userRouter.get('/me', authenticate, getCurrentUserHandler);
userRouter.patch('/me', authenticate, updateUserHandler);
userRouter.patch('/me/creator-profile', authenticate, setupCreatorProfileHandler);
userRouter.patch('/me/switch-role', authenticate, switchRoleHandler);
userRouter.post('/become-seller', authenticate, becomeSellerHandler);

// Seller level routes (protected)
userRouter.get('/me/seller-level/calculate', authenticate, calculateSellerLevelHandler);

// Admin route - recalculate all seller levels
userRouter.post('/admin/seller-level/recalculate', authenticate, recalculateAllSellerLevelsHandler);

// Public route - get user by ID (for profile viewing)
// MUST BE AFTER ALL /me ROUTES
userRouter.get('/:userId', getUserByIdHandler);

// Public route - get seller level requirements
userRouter.get('/seller-level/requirements/:level', getSellerLevelRequirementsHandler);

