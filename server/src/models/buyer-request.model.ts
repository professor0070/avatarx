import mongoose, { Document, Schema } from 'mongoose';

export interface IBuyerRequest extends Document {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  deliveryDeadline?: Date;
  skillsRequired: string[];
  attachments: { url: string; filename: string }[];
  status: 'open' | 'in_progress' | 'closed' | 'cancelled';
  proposals: {
    freelancerId: mongoose.Types.ObjectId;
    gigId?: mongoose.Types.ObjectId;
    price: number;
    currency: string;
    deliveryTimeDays: number;
    pitch: string;
    status: 'pending' | 'accepted' | 'rejected';
    submittedAt: Date;
  }[];
  selectedProposal?: {
    freelancerId: mongoose.Types.ObjectId;
    proposalIndex: number;
    selectedAt: Date;
  };
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const buyerRequestSchema = new Schema<IBuyerRequest>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Game Credits',
        'Adult Triggers Male',
        'Adult Triggers Female',
        'Adult Rooms',
        'Outfits Male',
        'Outfits Female',
        'Badges',
        'Room Decoration',
        'Adult Triggers Making',
        'Brand Ambassador Management',
        'Agency Management',
        'Instagram Reels',
        'Marriage Videographer',
        'Photo Editor',
        'Custom Services',
      ],
    },
    budget: {
      min: {
        type: Number,
        required: true,
        min: 0,
      },
      max: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        required: true,
        enum: ['USD', 'INR', 'CR'],
      },
    },
    deliveryDeadline: {
      type: Date,
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    attachments: {
      type: [
        {
          url: String,
          filename: String,
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'closed', 'cancelled'],
      default: 'open',
    },
    proposals: {
      type: [
        {
          freelancerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          gigId: {
            type: Schema.Types.ObjectId,
            ref: 'Gig',
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
          pitch: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
          },
          status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
          },
          submittedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    selectedProposal: {
      freelancerId: Schema.Types.ObjectId,
      proposalIndex: Number,
      selectedAt: Date,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
buyerRequestSchema.index({ clientId: 1, status: 1 });
buyerRequestSchema.index({ category: 1, status: 1 });
buyerRequestSchema.index({ createdAt: -1 });
buyerRequestSchema.index({ 'proposals.freelancerId': 1 });

export const BuyerRequest = mongoose.model<IBuyerRequest>('BuyerRequest', buyerRequestSchema);
