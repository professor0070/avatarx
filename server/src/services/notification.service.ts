import { Notification, NotificationType, NotificationPriority } from '../models/notification.model';
import { SocketService } from './socket.service';

export class NotificationService {
  /**
   * Create a notification in the database and send it via Socket.IO if the user is online.
   */
  static async send(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    relatedOrderId?: string;
    relatedGigId?: string;
    relatedMessageId?: string;
    relatedUserId?: string;
    actionUrl?: string;
    actionLabel?: string;
    data?: Record<string, any>;
  }) {
    try {
      // 1. Create in database
      const notification = await Notification.createNotification({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority,
        relatedOrderId: data.relatedOrderId,
        relatedGigId: data.relatedGigId,
        relatedMessageId: data.relatedMessageId,
        relatedUserId: data.relatedUserId,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        data: data.data,
      });

      // 2. Send via Socket.IO
      try {
        const socketService = SocketService.getInstance();
        socketService.sendNotificationToUser(data.userId, {
          id: notification._id.toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          actionUrl: notification.actionUrl,
          actionLabel: notification.actionLabel,
          relatedOrderId: notification.relatedOrderId,
          relatedGigId: notification.relatedGigId,
          relatedUserId: notification.relatedUserId,
        });
      } catch (socketError) {
        // Socket service might not be initialized yet or user offline
        // We don't want to fail the whole operation if socket fails
        console.warn('[avatarx-server] Notification socket send failed:', socketError);
      }

      return notification;
    } catch (error) {
      console.error('[avatarx-server] Failed to create/send notification:', error);
      throw error;
    }
  }

  /**
   * Helper to notify a seller about a new order
   */
  static async notifyNewOrder(order: any) {
    return this.send({
      userId: order.creatorId.toString(),
      type: 'order_created',
      title: 'New Order Received',
      message: `You have received a new order for your gig.`,
      relatedOrderId: order._id.toString(),
      actionUrl: `/dashboard/orders/${order._id}`,
      actionLabel: 'View Order',
      priority: 'high',
    });
  }

  /**
   * Helper to notify a buyer about order status update
   */
  static async notifyOrderStatusUpdate(order: any, status: string) {
    let title = 'Order Update';
    let message = `Your order status has been updated to ${status.replace('_', ' ')}.`;

    switch (status) {
      case 'in_progress':
        title = 'Order Started';
        message = 'Your order is now in progress.';
        break;
      case 'delivered':
        title = 'Order Delivered';
        message = 'Your order has been delivered! Please review it.';
        break;
      case 'completed':
        title = 'Order Completed';
        message = 'Your order has been marked as completed.';
        break;
      case 'cancelled':
        title = 'Order Cancelled';
        message = 'Your order has been cancelled.';
        break;
    }

    return this.send({
      userId: order.buyerId.toString(),
      type: `order_${status}` as any,
      title,
      message,
      relatedOrderId: order._id.toString(),
      actionUrl: `/dashboard/orders/${order._id}`,
      actionLabel: 'View Order',
      priority: status === 'delivered' ? 'high' : 'medium',
    });
  }
}
