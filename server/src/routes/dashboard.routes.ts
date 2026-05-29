import { Router } from 'express';
import {
  getClientStatsHandler,
  getFreelancerStatsHandler,
  getClientAnalyticsHandler,
  getFreelancerAnalyticsHandler,
  getFreelancerEarningsHandler,
} from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

export const dashboardRouter = Router();

// Protected routes (require authentication)
dashboardRouter.get('/client/stats', authenticate, getClientStatsHandler);
dashboardRouter.get('/freelancer/stats', authenticate, getFreelancerStatsHandler);
dashboardRouter.get('/client/analytics', authenticate, getClientAnalyticsHandler);
dashboardRouter.get('/freelancer/analytics', authenticate, getFreelancerAnalyticsHandler);
dashboardRouter.get('/freelancer/earnings', authenticate, getFreelancerEarningsHandler);
