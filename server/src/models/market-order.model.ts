import mongoose, { Document, Schema } from 'mongoose';

export type MarketOrderStatus = 'pending' | 'completed' | 'failed';

export interface IMarketOrder extends Document {
  _id: mongoose.Types.ObjectId;
  buyer: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  status: MarketOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const marketOrderSchema = new Schema<IMarketOrder>(
  {
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

marketOrderSchema.index({ buyer: 1, status: 1 });
marketOrderSchema.index({ product: 1 });

export const MarketOrder = mongoose.model<IMarketOrder>('MarketOrder', marketOrderSchema);
