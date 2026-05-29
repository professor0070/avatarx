import mongoose, { Document, Schema } from 'mongoose';

export type EscrowStatus = 'held' | 'released' | 'refunded' | 'partially_refunded';

export interface IEscrow extends Document {
  _id: mongoose.Types.ObjectId;
  // Reference to order
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  
  // Financial details
  totalAmount: number;
  currency: 'INR' | 'USD';
  sellerAmount: number; // Amount for seller after fees
  platformFee: number; // Platform fee
  serviceFee: number; // Service fee
  
  // Status tracking
  status: EscrowStatus;
  heldAt: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  
  // Reason for release/refund
  releaseReason?: string;
  refundReason?: string;
  
  // Transaction references
  paymentTransactionId?: string;
  refundTransactionId?: string;
  
  // Metadata
  releasedBy?: mongoose.Types.ObjectId; // User who released funds
  refundedBy?: mongoose.Types.ObjectId; // User who refunded funds
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  release(reason: string, releasedBy: mongoose.Types.ObjectId): void;
  refund(reason: string, refundedBy: mongoose.Types.ObjectId, amount?: number): void;
  calculateSellerEarnings(): number;
}

const escrowSchema = new Schema<IEscrow>(
  {
    orderId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Order', 
      required: true,
      index: true 
    },
    orderNumber: { 
      type: String, 
      required: true 
    },
    
    totalAmount: { 
      type: Number, 
      required: true,
      min: 0 
    },
    currency: { 
      type: String, 
      enum: ['INR', 'USD'], 
      required: true 
    },
    sellerAmount: { 
      type: Number, 
      required: true,
      min: 0 
    },
    platformFee: { 
      type: Number, 
      required: true,
      min: 0 
    },
    serviceFee: { 
      type: Number, 
      required: true,
      min: 0 
    },
    
    status: { 
      type: String, 
      enum: ['held', 'released', 'refunded', 'partially_refunded'], 
      default: 'held',
      index: true 
    },
    heldAt: { 
      type: Date, 
      default: Date.now 
    },
    releasedAt: { 
      type: Date 
    },
    refundedAt: { 
      type: Date 
    },
    
    releaseReason: { 
      type: String 
    },
    refundReason: { 
      type: String 
    },
    
    paymentTransactionId: { 
      type: String 
    },
    refundTransactionId: { 
      type: String 
    },
    
    releasedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    refundedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
  },
  { timestamps: true }
);

// Indexes for performance
escrowSchema.index({ status: 1 });
escrowSchema.index({ heldAt: 1 });
escrowSchema.index({ orderId: 1, status: 1 });

// Instance method to release funds
escrowSchema.methods.release = function(reason: string, releasedBy: mongoose.Types.ObjectId): void {
  this.status = 'released';
  this.releasedAt = new Date();
  this.releaseReason = reason;
  this.releasedBy = releasedBy;
};

// Instance method to refund funds
escrowSchema.methods.refund = function(reason: string, refundedBy: mongoose.Types.ObjectId, amount?: number): void {
  if (amount && amount < this.totalAmount) {
    this.status = 'partially_refunded';
  } else {
    this.status = 'refunded';
  }
  this.refundedAt = new Date();
  this.refundReason = reason;
  this.refundedBy = refundedBy;
};

// Instance method to calculate seller earnings
escrowSchema.methods.calculateSellerEarnings = function(): number {
  return this.sellerAmount;
};

export const Escrow = mongoose.model<IEscrow>('Escrow', escrowSchema);
