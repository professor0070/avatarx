import mongoose, { Document, Schema } from 'mongoose';

export type GigType = 'product' | 'service';
export type GigCategory = 
  | 'Game Credits'
  | 'Adult Triggers Male'
  | 'Adult Triggers Female'
  | 'Adult Rooms'
  | 'Outfits Male'
  | 'Outfits Female'
  | 'Badges'
  | 'Room Decoration'
  | 'Adult Triggers Making'
  | 'Brand Ambassador Management'
  | 'Agency Management'
  | 'Instagram Reels'
  | 'Marriage Videographer'
  | 'Photo Editor'
  | 'Custom Services';

export type DeliveryType = 'instant' | 'manual';

export interface GigTier {
  name: 'Basic' | 'Standard' | 'Premium';
  description: string;
  price: number; // in INR
  currency: 'INR' | 'USD';
  deliveryTimeDays: number;
  revisions: number;
  features: string[];
}

export interface GigExtra {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'INR' | 'USD';
  deliveryTimeDays?: number;
}

export interface GigUpgrade {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'INR' | 'USD';
  isRequired: boolean;
}

export interface GigMedia {
  url: string;
  type: 'image' | 'video';
  title?: string;
  order: number;
}

export interface GigFAQ {
  question: string;
  answer: string;
  order: number;
}

export interface IGig extends Document {
  _id: mongoose.Types.ObjectId;
  // Basic Info
  title: string;
  slug: string;
  description: string;
  type: GigType;
  category: GigCategory;
  isAdultContent: boolean;
  tags: string[]; // max 5 tags for search
  
  // Seller Info
  sellerId: mongoose.Types.ObjectId;
  sellerDisplayName: string;
  sellerAvatar: string;
  sellerLevel: string;
  sellerVerificationBadge: boolean;
  sellerRating: number;
  sellerTotalOrders: number;
  
  // Media
  gallery: GigMedia[];
  thumbnail: string; // main thumbnail URL
  
  // Pricing
  tiers: GigTier[];
  extras: GigExtra[];
  upgrades: GigUpgrade[];
  comboPricing?: {
    enabled: boolean;
    discountPercent: number;
  };
  
  // Delivery
  deliveryType: DeliveryType;
  instantDownloadFiles?: string[]; // Cloudinary URLs for instant delivery
  
  // Requirements
  requirements: {
    enabled: boolean;
    questions: string[];
  };
  
  // Settings
  requestToOrder: boolean; // approval-first toggle
  isPaused: boolean;
  pauseReason?: string;
  
  // SEO & Analytics
  seoTitle?: string;
  seoDescription?: string;
  impressions: number;
  clicks: number;
  orders: number;
  conversionRate: number;
  
  // Reviews
  totalReviews: number;
  averageRating: number;
  lastTwoMonthsRating: number;
  
  // FAQs
  faqs: GigFAQ[];
  
  // Status
  status: 'draft' | 'active' | 'paused' | 'suspended' | 'deleted';
  moderation: {
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    reviewedAt?: Date;
    reviewedBy: mongoose.Types.ObjectId;
  };
  reported: boolean;
  reportCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  updateConversionRate(): void;
  calculateAverageRating(): number;
}

const gigSchema = new Schema<IGig>(
  {
    // Basic Info
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 3000,
    },
    type: {
      type: String,
      enum: ['product', 'service'],
      required: true,
    },
    category: {
      type: String,
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
      required: true,
    },
    isAdultContent: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      validate: {
        validator: function(tags: string[]) {
          return tags.length <= 5;
        },
        message: 'Maximum 5 tags allowed',
      },
    },

    // Seller Info
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerDisplayName: {
      type: String,
      required: true,
      trim: true,
    },
    sellerAvatar: {
      type: String,
      default: '',
    },
    sellerLevel: {
      type: String,
      enum: ['new', 'level1', 'level2', 'top_rated', 'pro'],
      default: 'new',
    },
    sellerVerificationBadge: {
      type: Boolean,
      default: false,
    },
    sellerRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    sellerTotalOrders: {
      type: Number,
      default: 0,
    },

    // Media
    gallery: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true },
        title: { type: String, trim: true },
        order: { type: Number, default: 0 },
      },
    ],
    thumbnail: {
      type: String,
      required: true,
    },

    // Pricing
    tiers: [
      {
        name: { type: String, enum: ['Basic', 'Standard', 'Premium'], required: true },
        description: { type: String, required: true, maxlength: 500 },
        price: { type: Number, required: true, min: 5 },
        currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },
        deliveryTimeDays: { type: Number, required: true, min: 1 },
        revisions: { type: Number, required: true, min: 0 },
        features: [{ type: String, trim: true }],
      },
    ],
    extras: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        description: { type: String, required: true, maxlength: 200 },
        price: { type: Number, required: true, min: 0 },
        currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },
        deliveryTimeDays: { type: Number, min: 0 },
      },
    ],
    upgrades: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        description: { type: String, required: true, maxlength: 200 },
        price: { type: Number, required: true, min: 0 },
        currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },
        isRequired: { type: Boolean, default: false },
      },
    ],
    comboPricing: {
      enabled: { type: Boolean, default: false },
      discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    },

    // Delivery
    deliveryType: {
      type: String,
      enum: ['instant', 'manual'],
      default: 'manual',
    },
    instantDownloadFiles: [String], // Cloudinary URLs

    // Requirements
    requirements: {
      enabled: { type: Boolean, default: false },
      questions: [{ type: String, trim: true }],
    },

    // Settings
    requestToOrder: {
      type: Boolean,
      default: false,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    pauseReason: {
      type: String,
      trim: true,
    },

    // SEO & Analytics
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    orders: {
      type: Number,
      default: 0,
    },
    conversionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },

    // Reviews
    totalReviews: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    lastTwoMonthsRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // FAQs
    faqs: [
      {
        question: { type: String, required: true, trim: true },
        answer: { type: String, required: true, trim: true },
        order: { type: Number, default: 0 },
      },
    ],

    // Status
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'suspended', 'deleted'],
      default: 'draft',
    },
    moderation: {
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejectionReason: { type: String },
      reviewedAt: { type: Date },
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    reported: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Indexes for performance
gigSchema.index({ sellerId: 1, status: 1 });
gigSchema.index({ category: 1, status: 1 });
gigSchema.index({ isAdultContent: 1, status: 1 });
gigSchema.index({ tags: 1 }); // for tag-based search
gigSchema.index({ title: 'text', description: 'text', tags: 'text' }); // for full-text search
gigSchema.index({ averageRating: -1 });
gigSchema.index({ orders: -1 });
gigSchema.index({ createdAt: -1 });


// Pre-save middleware to generate slug
gigSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + 
      '-' + Date.now();
  }
  next();
});

// Instance methods
gigSchema.methods.updateConversionRate = function() {
  if (this.impressions === 0) {
    this.conversionRate = 0;
  } else {
    this.conversionRate = this.orders / this.impressions;
  }
};

gigSchema.methods.calculateAverageRating = function() {
  return this.averageRating;
};

export const Gig = mongoose.model<IGig>('Gig', gigSchema);
