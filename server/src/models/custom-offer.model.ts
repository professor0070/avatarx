import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomOffer extends Document {
  _id: mongoose.Types.ObjectId;
  freelancerId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  gigId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  price: number;
  currency: string;
  deliveryTimeDays: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const customOfferSchema = new Schema<ICustomOffer>(
  {
    freelancerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    gigId: {
      type: Schema.Types.ObjectId,
      ref: 'Gig',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      enum: ['USD', 'INR', 'CR'],
    },
    deliveryTimeDays: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
customOfferSchema.index({ clientId: 1, status: 1 });
customOfferSchema.index({ freelancerId: 1, status: 1 });
customOfferSchema.index({ createdAt: -1 });
customOfferSchema.index({ expiresAt: 1 });

export const CustomOffer = mongoose.model<ICustomOffer>('CustomOffer', customOfferSchema);
