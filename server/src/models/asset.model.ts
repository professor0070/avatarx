import mongoose, { Document, Schema } from 'mongoose';

export type AssetStatus = 'pending' | 'uploading' | 'uploaded' | 'approved' | 'rejected' | 'published' | 'removed';
export type AssetType = 'product' | 'room' | 'avatar' | 'sticker' | 'bundle' | 'outfit';

export interface IAsset extends Document {
  _id: mongoose.Types.ObjectId;
  
  // Basic Asset Info
  assetId: string; // IMVU asset ID after publishing
  sellerId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: AssetType;
  
  // Categories & Tags
  category: string;
  subcategory?: string;
  tags: string[];
  
  // Pricing
  price: number;
  currency: 'INR' | 'USD' | 'credits';
  creditsPrice?: number; // IMVU credits price
  
  // Files & Media
  files: Array<{
    id: string;
    filename: string;
    url: string;
    type: 'image' | 'mesh' | 'texture' | 'animation' | 'preview';
    size: number;
    cloudinaryPublicId?: string;
    uploadedAt: Date;
  }>;
  thumbnails: Array<{
    url: string;
    cloudinaryPublicId: string;
    width: number;
    height: number;
  }>;
  previewVideo?: {
    url: string;
    cloudinaryPublicId: string;
    duration?: number;
  };
  
  // IMVU Marketplace Integration
  imvuStatus: AssetStatus;
  imvuProductId?: string;
  imvuUploadDate?: Date;
  imvuPublishDate?: Date;
  imvuErrorMessage?: string;
  imvuSyncStatus: 'pending' | 'synced' | 'failed';
  
  // Moderation
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationReviewedAt?: Date;
  moderationReviewedBy?: mongoose.Types.ObjectId;
  moderationNotes?: string;
  isAdultContent: boolean;
  
  // Analytics
  viewCount: number;
  downloadCount: number;
  purchaseCount: number;
  rating: number;
  ratingCount: number;
  revenue: {
    inr: number;
    usd: number;
    credits: number;
  };
  
  // Status
  status: AssetStatus;
  isPublished: boolean;
  publishedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  generateAssetId(): string;
  calculateRating(): number;
}

const assetSchema = new Schema<IAsset>(
  {
    // Basic Asset Info
    assetId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['product', 'room', 'avatar', 'sticker', 'bundle', 'outfit'],
      required: true,
    },
    
    // Categories & Tags
    category: {
      type: String,
      required: true,
    },
    subcategory: {
      type: String,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    
    // Pricing
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'credits'],
      required: true,
    },
    creditsPrice: {
      type: Number,
      min: 0,
    },
    
    // Files & Media
    files: [{
      id: { type: String, required: true },
      filename: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, enum: ['image', 'mesh', 'texture', 'animation', 'preview'], required: true },
      size: { type: Number, required: true },
      cloudinaryPublicId: { type: String },
      uploadedAt: { type: Date, default: Date.now },
    }],
    thumbnails: [{
      url: { type: String, required: true },
      cloudinaryPublicId: { type: String, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    }],
    previewVideo: {
      url: { type: String },
      cloudinaryPublicId: { type: String },
      duration: { type: Number },
    },
    
    // IMVU Marketplace Integration
    imvuStatus: {
      type: String,
      enum: ['pending', 'uploading', 'uploaded', 'approved', 'rejected', 'published', 'removed'],
      default: 'pending',
    },
    imvuProductId: {
      type: String,
      index: true,
    },
    imvuUploadDate: {
      type: Date,
    },
    imvuPublishDate: {
      type: Date,
    },
    imvuErrorMessage: {
      type: String,
    },
    imvuSyncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed'],
      default: 'pending',
    },
    
    // Moderation
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    moderationReviewedAt: {
      type: Date,
    },
    moderationReviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderationNotes: {
      type: String,
    },
    isAdultContent: {
      type: Boolean,
      default: false,
    },
    
    // Analytics
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchaseCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    revenue: {
      inr: { type: Number, default: 0, min: 0 },
      usd: { type: Number, default: 0, min: 0 },
      credits: { type: Number, default: 0, min: 0 },
    },
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'uploading', 'uploaded', 'approved', 'rejected', 'published', 'removed'],
      default: 'pending',
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Indexes for performance
assetSchema.index({ sellerId: 1, status: 1 });
assetSchema.index({ category: 1, subcategory: 1 });
assetSchema.index({ tags: 1 });
assetSchema.index({ imvuStatus: 1 });
assetSchema.index({ moderationStatus: 1 });
assetSchema.index({ createdAt: -1 });

// Instance methods
assetSchema.methods.calculateRating = function(): number {
  return this.rating || 0;
};

// Static method to generate asset ID
assetSchema.statics.generateAssetId = function(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `AST-${timestamp.toUpperCase()}-${random.toUpperCase()}`;
};

export const Asset = mongoose.model<IAsset>('Asset', assetSchema);
