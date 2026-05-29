import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware';
import { Notification } from '../models/notification.model';
import { User } from '../models/user.model';

function sanitizeNotification(notification: any) {
  return {
    id: notification._id?.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    isRead: notification.isRead,
    readAt: notification.readAt,
    actionUrl: notification.actionUrl,
    actionLabel: notification.actionLabel,
    relatedOrderId: notification.relatedOrderId?.toString(),
    relatedGigId: notification.relatedGigId?.toString(),
    relatedMessageId: notification.relatedMessageId?.toString(),
    relatedUserId: notification.relatedUserId?.toString(),
    data: notification.data,
    createdAt: notification.createdAt,
    expiresAt: notification.expiresAt,
  };
}

export async function getNotificationsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query: any = { userId: req.userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('relatedUserId', 'displayName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(query),
    ]);

    res.json({
      ok: true,
      notifications: notifications.map(sanitizeNotification),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getNotifications error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function getUnreadCountHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const count = await Notification.getUnreadCount(req.userId);

    res.json({
      ok: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error('[avatarx-server] getUnreadCount error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function markAsReadHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      res.status(404).json({ ok: false, error: { message: 'Notification not found' } });
      return;
    }

    if (notification.userId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    notification.markAsRead();
    await notification.save();

    res.json({
      ok: true,
      notification: sanitizeNotification(notification),
    });
  } catch (error) {
    console.error('[avatarx-server] markAsRead error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function markAllAsReadHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    await Notification.markAllAsRead(req.userId);

    res.json({
      ok: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('[avatarx-server] markAllAsRead error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function deleteNotificationHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      res.status(404).json({ ok: false, error: { message: 'Notification not found' } });
      return;
    }

    if (notification.userId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    await Notification.deleteOne({ _id: notificationId });

    res.json({
      ok: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('[avatarx-server] deleteNotification error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function createNotificationHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || (!user.roles.includes('admin') && !user.roles.includes('super_admin'))) {
      res.status(403).json({ ok: false, error: { message: 'Admin access required' } });
      return;
    }

    const {
      userId,
      type,
      title,
      message,
      priority,
      relatedOrderId,
      relatedGigId,
      relatedMessageId,
      relatedUserId,
      actionUrl,
      actionLabel,
      data,
    } = req.body;

    if (!userId || !type || !title || !message) {
      res.status(400).json({ ok: false, error: { message: 'userId, type, title, and message are required' } });
      return;
    }

    const notification = await Notification.createNotification({
      userId,
      type,
      title,
      message,
      priority,
      relatedOrderId,
      relatedGigId,
      relatedMessageId,
      relatedUserId,
      actionUrl,
      actionLabel,
      data,
    });

    res.status(201).json({
      ok: true,
      notification: sanitizeNotification(notification),
    });
  } catch (error) {
    console.error('[avatarx-server] createNotification error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}
