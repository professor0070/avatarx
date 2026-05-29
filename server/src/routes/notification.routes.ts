import { Router } from 'express';
import {
  getNotificationsHandler,
  getUnreadCountHandler,
  markAsReadHandler,
  markAllAsReadHandler,
  deleteNotificationHandler,
  createNotificationHandler,
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

export const notificationRouter = Router();

// Public routes
notificationRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'notification/status' });
});

// Protected routes (require authentication)
notificationRouter.get('/', authenticate, getNotificationsHandler);
notificationRouter.get('/unread-count', authenticate, getUnreadCountHandler);
notificationRouter.patch('/:notificationId/read', authenticate, markAsReadHandler);
notificationRouter.patch('/read-all', authenticate, markAllAsReadHandler);
notificationRouter.delete('/:notificationId', authenticate, deleteNotificationHandler);

// Admin route - create notification
notificationRouter.post('/', authenticate, createNotificationHandler);
