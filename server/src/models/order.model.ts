import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus = 
  | 'pending'
  | 'escrow_locked'
  | 'in_progress'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'payment_pending'
  | 'payment_completed'
  | 'payment_failed'
  | 'requirements_submitted'
  | 'revision_requested'
  | 'in_revision'
  | 'cancelled';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type OrderType = 'standard' | 'custom' | 'bulk';

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  // Basic Order Info
  orderNumber: string;
  gigId: mongoose.Types.ObjectId;
  buyerId: string;
  creatorId: string;
  
  // Order Details
  type: OrderType;
  tierName: string;
  extras: Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
  }>;
  
  // Pricing
  financials: {
    price: number;
    commission: number;
    netCreatorPayout: number;
  };
  
  // Delivery
  deliveryType: 'instant' | 'manual';
  deliveryTimeDays: number;
  actualDeliveryDate?: Date;
  deliveryFiles: Array<{
    id: string;
    filename: string;
    url: string;
    type: 'image' | 'video' | 'document' | 'archive';
    size: number;
    uploadedAt: Date;
  }>;
  
  // Requirements
  requirements: {
    enabled: boolean;
    questions: string[];
    answers: string[];
    submittedAt?: Date;
  };
  
  // Status & Timeline
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: Date;
    comment?: string;
    updatedBy: mongoose.Types.ObjectId | string;
  }>;
  
  // Revisions
  revisions: {
    allowed: number;
    used: number;
    currentRequest?: {
      message: string;
      requestedAt: Date;
      files: Array<{
        id: string;
        filename: string;
        url: string;
        type: string;
        size: number;
      }>;
    };
    history: Array<{
      type: 'requested' | 'completed';
      message: string;
      timestamp: Date;
      updatedBy: mongoose.Types.ObjectId | string;
    }>;
  };
  
  // Communication
  messages: Array<{
    id: string;
    senderId: mongoose.Types.ObjectId;
    content: string;
    type: 'text' | 'file' | 'image';
    fileUrl?: string;
    fileName?: string;
    timestamp: Date;
    isRead: boolean;
  }>;
  
  // Payment & Refunds
  payment: {
    method: 'razorpay' | 'wallet' | 'bank_transfer';
    transactionId?: string;
    paidAt?: Date;
    refundAmount?: number;
    refundReason?: string;
    refundedAt?: Date;
  };
  
  // Reviews & Ratings
  review: {
    rating?: number;
    comment?: string;
    submittedAt?: Date;
    response?: {
      comment: string;
      respondedAt: Date;
    };
  };
  
  // Disputes
  dispute: {
    isDisputed: boolean;
    reason?: string;
    description?: string;
    evidence?: string[];
    status?: 'pending' | 'investigating' | 'resolved';
    resolution?: string;
    createdAt?: Date;
    resolvedAt?: Date;
    moderationReviewedBy?: mongoose.Types.ObjectId | string;
    moderationReviewedAt?: Date;
  };
  
  // Legacy / Unmapped properties triggering TS errors
  totalPrice: number;
  currency: string;
  sellerId: string;
  platformFee: number;
  serviceFee: number;
  
  disputeMetadata?: {
    raisedBy: string;
    reason: string;
    evidenceUrl?: string;
    raisedAt: Date;
  };
  
  // Analytics
  metrics: {
    viewCount: number;
    responseTime: number; // in hours
    completionTime?: number; // in days
    onTimeDelivery: boolean;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // For request-to-order gigs
  
  // Methods
  generateOrderNumber(): string;
  updateStatus(status: OrderStatus, comment?: string, updatedBy?: mongoose.Types.ObjectId | string): void;
  addRevision(request: string, files: any[], requestedBy: mongoose.Types.ObjectId | string): void;
  calculateCompletionTime(): number;
  isOverdue(): boolean;
}

const orderSchema = new Schema<IOrder>(
  {
    // Basic Order Info
    orderNumber: { 
      type: String, 
      required: true, 
      unique: true
    },
    gigId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Gig', 
      required: true,
      index: true 
    },
    buyerId: { 
      type: String, 
      required: true,
      trim: true 
    },
    creatorId: { 
      type: String, 
      required: true,
      trim: true 
    },
    
    // Order Details
    type: { 
      type: String, 
      enum: ['standard', 'custom', 'bulk'], 
      default: 'standard' 
    },
    tierName: { 
      type: String, 
      required: true 
    },
    extras: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      currency: { type: String, required: true },
    }],
    
    // Pricing
    financials: {
      price: { type: Number, required: true },
      commission: { type: Number, required: true },
      netCreatorPayout: { type: Number, required: true }
    },
    
    // Delivery
    deliveryType: { 
      type: String, 
      enum: ['instant', 'manual'], 
      required: true 
    },
    deliveryTimeDays: { 
      type: Number, 
      required: true,
      min: 1 
    },
    actualDeliveryDate: { type: Date },
    deliveryFiles: [{
      id: { type: String, required: true },
      filename: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, enum: ['image', 'video', 'document', 'archive'], required: true },
      size: { type: Number, required: true },
      uploadedAt: { type: Date, default: Date.now },
    }],
    
    // Requirements
    requirements: {
      enabled: { type: Boolean, default: false },
      questions: [{ type: String }],
      answers: [{ type: String }],
      submittedAt: { type: Date },
    },
    

    
    disputeMetadata: {
      raisedBy: { type: String },
      reason: { type: String },
      evidenceUrl: { type: String },
      raisedAt: { type: Date }
    },
    
    // Analytics
    status: { 
      type: String, 
      enum: ['pending', 'escrow_locked', 'in_progress', 'delivered', 'completed', 'disputed', 'refunded'], 
      default: 'pending',
      required: true,
      index: true 
    },
    paymentStatus: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'], 
      default: 'pending' 
    },
    statusHistory: [{
      status: { type: String, enum: ['pending', 'escrow_locked', 'in_progress', 'delivered', 'completed', 'disputed', 'refunded'], required: true },
      timestamp: { type: Date, default: Date.now },
      comment: { type: String },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    }],
    
    // Revisions
    revisions: {
      allowed: { type: Number, default: 0, min: 0 },
      used: { type: Number, default: 0, min: 0 },
      currentRequest: {
        message: { type: String },
        requestedAt: { type: Date },
        files: [{
          id: { type: String, required: true },
          filename: { type: String, required: true },
          url: { type: String, required: true },
          type: { type: String, required: true },
          size: { type: Number, required: true },
        }],
      },
      history: [{
        type: { type: String, enum: ['requested', 'completed'], required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      }],
    },
    
    // Communication
    messages: [{
      id: { type: String, required: true },
      senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      content: { type: String, required: true },
      type: { type: String, enum: ['text', 'file', 'image'], default: 'text' },
      fileUrl: { type: String },
      fileName: { type: String },
      timestamp: { type: Date, default: Date.now },
      isRead: { type: Boolean, default: false },
    }],
    
    // Payment & Refunds
    payment: {
      method: { type: String, enum: ['razorpay', 'wallet', 'bank_transfer'], required: true },
      transactionId: { type: String },
      paidAt: { type: Date },
      refundAmount: { type: Number, min: 0 },
      refundReason: { type: String },
      refundedAt: { type: Date },
    },
    
    // Reviews & Ratings
    review: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      submittedAt: { type: Date },
      response: {
        comment: { type: String },
        respondedAt: { type: Date },
      },
    },
    
    // Disputes
    dispute: {
      isDisputed: { type: Boolean, default: false },
      reason: { type: String },
      description: { type: String },
      evidence: [{ type: String }],
      status: { type: String, enum: ['pending', 'investigating', 'resolved'] },
      resolution: { type: String },
      createdAt: { type: Date },
      resolvedAt: { type: Date },
      moderationReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      moderationReviewedAt: { type: Date },
    },
    
    // Analytics
    metrics: {
      viewCount: { type: Number, default: 0, min: 0 },
      responseTime: { type: Number, default: 0, min: 0 }, // in hours
      completionTime: { type: Number, min: 0 }, // in days
      onTimeDelivery: { type: Boolean, default: true },
    },
    
    // Timestamps
    expiresAt: { type: Date }, // For request-to-order gigs
  },
  { timestamps: true }
);

// Indexes for performance
orderSchema.index({ buyerId: 1, status: 1 });
orderSchema.index({ creatorId: 1, status: 1 });
orderSchema.index({ buyerId: 1, creatorId: 1 });
orderSchema.index({ gigId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'dispute.isDisputed': 1 });

// Pre-validate middleware for order number generation
// Must run before validation to satisfy required: true
orderSchema.pre('validate', function(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = this.generateOrderNumber();
  }
  next();
});

// Instance methods
orderSchema.methods.generateOrderNumber = function(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ORD-${timestamp.toUpperCase()}-${random.toUpperCase()}`;
};

orderSchema.methods.updateStatus = function(status: OrderStatus, comment?: string, updatedBy?: any): void {
  this.status = status;
  this.statusHistory.push({
    status,
    timestamp: new Date(),
    comment,
    updatedBy,
  });
};

orderSchema.methods.addRevision = function(request: string, files: any[], requestedBy: any): void {
  this.revisions.currentRequest = {
    message: request,
    requestedAt: new Date(),
    files,
  };
  this.revisions.history.push({
    type: 'requested',
    message: request,
    timestamp: new Date(),
    updatedBy: requestedBy,
  });
  this.status = 'revision_requested';
};

orderSchema.methods.calculateCompletionTime = function(): number {
  if (!this.actualDeliveryDate || !this.createdAt) return 0;
  const diffTime = Math.abs(this.actualDeliveryDate.getTime() - this.createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
};

orderSchema.methods.isOverdue = function(): boolean {
  if (this.status === 'completed' || this.status === 'disputed') {
    return false;
  }
  
  const deliveryDate = new Date(this.createdAt);
  deliveryDate.setDate(deliveryDate.getDate() + this.deliveryTimeDays);
  
  return new Date() > deliveryDate;
};

export const Order = mongoose.model<IOrder>('Order', orderSchema);
