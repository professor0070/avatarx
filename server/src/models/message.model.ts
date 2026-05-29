import mongoose, { Document, Schema } from 'mongoose';

export type MessageType = 'text' | 'image' | 'file' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  // Message Content
  content: string;
  type: MessageType;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  
  // File/Attachment Info
  attachment?: {
    url: string;
    filename: string;
    mimetype: string;
    size: number;
  };
  
  // Conversation Context
  conversationId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId; // Optional: link to order if message is related to order
  gigId?: mongoose.Types.ObjectId; // Optional: link to gig if message is related to gig
  
  // Status & Metadata
  status: MessageStatus;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  
  // Read Receipts
  readAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  markAsRead(): Promise<IMessage>;
  edit(newContent: string): Promise<IMessage>;
  softDelete(): Promise<IMessage>;
}

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  // Participants
  participants: mongoose.Types.ObjectId[];
  
  // Conversation Context
  type: 'direct' | 'order' | 'gig_inquiry';
  orderId?: mongoose.Types.ObjectId;
  gigId?: mongoose.Types.ObjectId;
  
  // Last Message Info
  lastMessage: {
    content: string;
    senderId: mongoose.Types.ObjectId;
    timestamp: Date;
    type: MessageType;
  };
  
  // Metadata
  title?: string; // Auto-generated or custom title
  isActive: boolean;
  isArchived: {
    [userId: string]: boolean;
  };
  
  // Unread Counts
  unreadCounts: {
    [userId: string]: number;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  addParticipant(userId: mongoose.Types.ObjectId): Promise<IConversation>;
  removeParticipant(userId: mongoose.Types.ObjectId): Promise<IConversation>;
  incrementUnread(userId: string): Promise<IConversation>;
  markAsRead(userId: string): Promise<IConversation>;
  archive(userId: string): Promise<IConversation>;
  unarchive(userId: string): Promise<IConversation>;
  updateLastMessage(content: string, senderId: mongoose.Types.ObjectId, type?: MessageType): Promise<IConversation>;
}

export interface IConversationModel extends mongoose.Model<IConversation> {
  findDirectConversation(userId1: any, userId2: any): Promise<IConversation | null>;
  findOrderConversation(orderId: any): Promise<IConversation | null>;
  findGigInquiryConversation(gigId: any, userId: any): Promise<IConversation | null>;
  getUserConversations(userId: any, page?: number, limit?: number): Promise<IConversation[]>;
}

// Message Schema
const messageSchema = new Schema<IMessage>(
  {
    content: { 
      type: String, 
      required: true,
      maxlength: 2000, // Reasonable limit for messages
    },
    type: { 
      type: String, 
      enum: ['text', 'image', 'file', 'system'], 
      default: 'text' 
    },
    senderId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    receiverId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    
    // File/Attachment Info
    attachment: {
      url: { type: String },
      filename: { type: String },
      mimetype: { type: String },
      size: { type: Number },
    },
    
    // Conversation Context
    conversationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Conversation', 
      required: true,
      index: true 
    },
    orderId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Order',
      index: true 
    },
    gigId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Gig',
      index: true 
    },
    
    // Status & Metadata
    status: { 
      type: String, 
      enum: ['sent', 'delivered', 'read'], 
      default: 'sent' 
    },
    isEdited: { 
      type: Boolean, 
      default: false 
    },
    editedAt: { 
      type: Date 
    },
    isDeleted: { 
      type: Boolean, 
      default: false 
    },
    deletedAt: { 
      type: Date 
    },
    
    // Read Receipts
    readAt: { 
      type: Date 
    },
  },
  { timestamps: true }
);

// Conversation Schema
const conversationSchema = new Schema<IConversation>(
  {
    participants: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true
    }],
    
    // Conversation Context
    type: { 
      type: String, 
      enum: ['direct', 'order', 'gig_inquiry'], 
      default: 'direct' 
    },
    orderId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Order',
      index: true 
    },
    gigId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Gig',
      index: true 
    },
    
    // Last Message Info
    lastMessage: {
      content: { type: String, required: true },
      senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      timestamp: { type: Date, required: true },
      type: { type: String, enum: ['text', 'image', 'file', 'system'], required: true },
    },
    
    // Metadata
    title: { 
      type: String 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    isArchived: { 
      type: Schema.Types.Mixed, 
      default: {} 
    },
    
    // Unread Counts
    unreadCounts: { 
      type: Schema.Types.Mixed, 
      default: {} 
    },
  },
  { timestamps: true }
);

// Indexes for performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, status: 1 });
messageSchema.index({ createdAt: -1 });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'lastMessage.timestamp': -1 });
conversationSchema.index({ type: 1, orderId: 1 });
conversationSchema.index({ type: 1, gigId: 1 });

// Instance methods for Message
messageSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

messageSchema.methods.edit = function(newContent: string) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Instance methods for Conversation
conversationSchema.methods.addParticipant = function(userId: mongoose.Types.ObjectId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    this.unreadCounts[userId.toString()] = 0;
  }
  return this.save();
};

conversationSchema.methods.removeParticipant = function(userId: mongoose.Types.ObjectId) {
  this.participants = this.participants.filter((id: mongoose.Types.ObjectId) => !id.equals(userId));
  delete this.unreadCounts[userId.toString()];
  return this.save();
};

conversationSchema.methods.incrementUnread = function(userId: string) {
  const currentCount = this.unreadCounts[userId] || 0;
  this.unreadCounts[userId] = currentCount + 1;
  return this.save();
};

conversationSchema.methods.markAsRead = function(userId: string) {
  this.unreadCounts[userId] = 0;
  return this.save();
};

conversationSchema.methods.archive = function(userId: string) {
  this.isArchived[userId] = true;
  return this.save();
};

conversationSchema.methods.unarchive = function(userId: string) {
  this.isArchived[userId] = false;
  return this.save();
};

conversationSchema.methods.updateLastMessage = function(content: string, senderId: mongoose.Types.ObjectId, type: MessageType = 'text') {
  this.lastMessage = {
    content,
    senderId,
    timestamp: new Date(),
    type,
  };
  return this.save();
};

// Static methods for Conversation
conversationSchema.statics.findDirectConversation = function(userId1: mongoose.Types.ObjectId, userId2: mongoose.Types.ObjectId) {
  return this.findOne({
    type: 'direct',
    participants: { $all: [userId1, userId2], $size: 2 }
  }).populate('participants', 'displayName avatar');
};

conversationSchema.statics.findOrderConversation = function(orderId: mongoose.Types.ObjectId) {
  return this.findOne({
    type: 'order',
    orderId
  }).populate('participants', 'displayName avatar');
};

conversationSchema.statics.findGigInquiryConversation = function(gigId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) {
  return this.findOne({
    type: 'gig_inquiry',
    gigId,
    participants: userId
  }).populate('participants', 'displayName avatar');
};

conversationSchema.statics.getUserConversations = function(userId: mongoose.Types.ObjectId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    participants: userId,
    isActive: true,
    [`isArchived.${userId}`]: { $ne: true }
  })
  .populate('participants', 'displayName avatar')
  .populate('lastMessage.senderId', 'displayName')
  .sort({ 'lastMessage.timestamp': -1 })
  .skip(skip)
  .limit(limit);
};

// Pre-save middleware for Conversation
conversationSchema.pre('save', function(next) {
  // Auto-generate title for direct conversations
  if (this.isNew && this.type === 'direct' && !this.title && this.participants.length === 2) {
    // Title will be set when populating participants
  }
  
  next();
});

export const Message = mongoose.model<IMessage>('Message', messageSchema);
export const Conversation = mongoose.model<IConversation, IConversationModel>('Conversation', conversationSchema);
