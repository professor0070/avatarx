import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType = 
  | 'order_created'
  | 'order_payment_completed'
  | 'order_in_progress'
  | 'order_delivered'
  | 'order_completed'
  | 'order_cancelled'
  | 'order_refunded'
  | 'message_received'
  | 'proposal_received'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'custom_offer_received'
  | 'custom_offer_accepted'
  | 'custom_offer_declined'
  | 'review_received'
  | 'dispute_created'
  | 'dispute_resolved'
  | 'verification_approved'
  | 'verification_rejected'
  | 'seller_level_upgraded'
  | 'system'
  | 'promotion';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  
  // Recipient
  userId: mongoose.Types.ObjectId;
  
  // Content
  type: NotificationType;
  title: string;
  message: string;
  
  // Related entities
  relatedOrderId?: mongoose.Types.ObjectId;
  relatedGigId?: mongoose.Types.ObjectId;
  relatedMessageId?: mongoose.Types.ObjectId;
  relatedUserId?: mongoose.Types.ObjectId; // e.g., the user who sent a message
  
  // Priority & Status
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: Date;
  
  // Actions
  actionUrl?: string;
  actionLabel?: string;
  
  // Metadata
  data?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  expiresAt?: Date;
  
  // Methods
  markAsRead(): void;
}

export interface INotificationModel extends mongoose.Model<INotification> {
  createNotification(data: {
    userId: mongoose.Types.ObjectId | string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    relatedOrderId?: mongoose.Types.ObjectId | string;
    relatedGigId?: mongoose.Types.ObjectId | string;
    relatedMessageId?: mongoose.Types.ObjectId | string;
    relatedUserId?: mongoose.Types.ObjectId | string;
    actionUrl?: string;
    actionLabel?: string;
    data?: Record<string, any>;
    expiresAt?: Date;
  }): Promise<INotification>;
  markAllAsRead(userId: mongoose.Types.ObjectId | string): Promise<any>;
  getUnreadCount(userId: mongoose.Types.ObjectId | string): Promise<number>;
}

const notificationSchema = new Schema<INotification>(
  {
    // Recipient
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Content
    type: {
      type: String,
      enum: [
        'order_created',
        'order_payment_completed',
        'order_in_progress',
        'order_delivered',
        'order_completed',
        'order_cancelled',
        'order_refunded',
        'message_received',
        'proposal_received',
        'proposal_accepted',
        'proposal_rejected',
        'custom_offer_received',
        'custom_offer_accepted',
        'custom_offer_declined',
        'review_received',
        'dispute_created',
        'dispute_resolved',
        'verification_approved',
        'verification_rejected',
        'seller_level_upgraded',
        'system',
        'promotion',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    
    // Related entities
    relatedOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    relatedGigId: {
      type: Schema.Types.ObjectId,
      ref: 'Gig',
    },
    relatedMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    relatedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Priority & Status
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    
    // Actions
    actionUrl: {
      type: String,
    },
    actionLabel: {
      type: String,
    },
    
    // Metadata
    data: {
      type: Schema.Types.Mixed,
    },
    
    // Timestamps
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true },
);

// Indexes for performance
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// Instance methods
notificationSchema.methods.markAsRead = function(): void {
  this.isRead = true;
  this.readAt = new Date();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data: {
  userId: any;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  relatedOrderId?: any;
  relatedGigId?: any;
  relatedMessageId?: any;
  relatedUserId?: any;
  actionUrl?: string;
  actionLabel?: string;
  data?: Record<string, any>;
  expiresAt?: Date;
}) {
  const notification = new this({
    ...data,
    priority: data.priority || 'medium',
  });
  return await notification.save();
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function(userId: any) {
  return await this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId: any) {
  return await this.countDocuments({ userId, isRead: false });
};

export const Notification = mongoose.model<INotification, INotificationModel>('Notification', notificationSchema);
