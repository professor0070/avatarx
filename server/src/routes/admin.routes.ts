import { Router } from 'express';
import {
  getAdminDashboardStatsHandler,
  getAdminDashboardActivityHandler,
  getAdminUsersHandler,
  updateAdminUserRoleHandler,
  toggleAdminUserBanHandler,
  verifyAdminUserEmailHandler,
  getAdminGigsHandler,
  approveAdminGigHandler,
  rejectAdminGigHandler,
  updateAdminGigStatusHandler,
  deleteAdminGigHandler,
  getAdminAnalyticsHandler,
  getAdminSettingsHandler,
  updateAdminSettingsHandler,
  getPendingVerificationsHandler,
  updateVerificationStatusHandler,
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireRole('admin', 'super_admin'));

// Dashboard
adminRouter.get('/dashboard/admin/stats', getAdminDashboardStatsHandler);
adminRouter.get('/dashboard/admin/activity', getAdminDashboardActivityHandler);

// Users
adminRouter.get('/admin/users', getAdminUsersHandler);
adminRouter.patch('/admin/users/:id/role', updateAdminUserRoleHandler);
adminRouter.patch('/admin/users/:id/ban', toggleAdminUserBanHandler);
adminRouter.post('/admin/users/:id/verify-email', verifyAdminUserEmailHandler);

// Verifications
adminRouter.get('/admin/verifications', getPendingVerificationsHandler);
adminRouter.patch('/admin/verifications/:id', updateVerificationStatusHandler);

// Gigs
adminRouter.get('/admin/gigs', getAdminGigsHandler);
adminRouter.patch('/admin/gigs/:id/approve', approveAdminGigHandler);
adminRouter.patch('/admin/gigs/:id/reject', rejectAdminGigHandler);
adminRouter.patch('/admin/gigs/:id/status', updateAdminGigStatusHandler);
adminRouter.delete('/admin/gigs/:id', deleteAdminGigHandler);

// Analytics
adminRouter.get('/admin/analytics', getAdminAnalyticsHandler);

// Settings (super_admin only)
adminRouter.get('/admin/settings', requireRole('super_admin'), getAdminSettingsHandler);
adminRouter.put('/admin/settings', requireRole('super_admin'), updateAdminSettingsHandler);
