import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export type SellerLevel = 'new' | 'level1' | 'level2' | 'top_rated' | 'pro';
export type BadgeType = 'AP' | 'VIP' | 'Marriage Pack' | 'Age Verified';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  clerkId?: string;
  password?: string;
  imvuId?: string;
  credits: number;
  role: 'user' | 'seller' | 'admin' | 'buyer' | 'super_admin' | 'creator';
  roles: string[];
  activeRole: 'user' | 'seller' | 'admin' | 'buyer' | 'super_admin' | 'creator';
  displayName: string;
  imvuUsername: string;
  isEmailVerified: boolean;
  isAgeVerified: boolean;
  isCloudinaryVerified: boolean;
  isIdVerified: boolean;
  isProfileVerified: boolean;
  verificationBadge: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  badges: BadgeType[];
  sellerLevel: SellerLevel;
  avatar: string;
  bio: string;
  skills: string[];
  languages: string[];
  certifications: string[];
  portfolio: { url: string; type: 'image' | 'video'; title: string }[];
  // Availability
  isAvailable: boolean;
  outOfOfficeUntil?: Date;
  outOfOfficeMessage: string;
  // Metrics
  responseRate: number;
  avgResponseTimeMinutes: number;
  totalOrdersCompleted: number;
  totalEarnedINR: number;
  totalEarnedUSD: number;
  crWalletBalance: number;
  successScore: number;
  profileCompleteness: number;
  // Search availability (online now)
  isOnline: boolean;
  lastSeen: Date;
  // Security
  refreshTokens: string[];
  passwordResetOtp?: string;
  passwordResetOtpExpiry?: Date;
  emailOtp?: string;
  emailOtpExpiry?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  // Search and Discovery
  searchHistory: {
    id: string;
    query: string;
    timestamp: Date;
    resultsCount: number;
  }[];
  wishlist: mongoose.Types.ObjectId[]; // Gig IDs
  payoutMethods: {
    bankTransfer?: {
      accountHolderName: string;
      accountNumber: string;
      bankName: string;
      ifscCode: string;
    };
    paypal?: {
      email: string;
    };
  };
  banned: boolean;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  // Legal
  hasAcceptedCreatorPolicy: boolean;
  // Methods
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    clerkId: { type: String, unique: true, sparse: true },
    password: { type: String },
    imvuId: { type: String, trim: true },
    credits: { type: Number, default: 0 },
    role: { type: String, enum: ['user', 'seller', 'admin', 'buyer', 'super_admin', 'creator'], default: 'buyer' },
    roles: {
      type: [String],
      enum: ['user', 'seller', 'admin', 'buyer', 'super_admin', 'creator'],
      default: ['buyer'],
      validate: {
        validator: (v: string[]) => v && v.length > 0,
        message: 'User must have at least one role',
      },
    },
    activeRole: {
      type: String,
      enum: ['user', 'seller', 'admin', 'buyer', 'super_admin', 'creator'],
      default: 'buyer',
    },
    displayName: { type: String, required: true, trim: true },
    imvuUsername: { type: String, default: '', trim: true },
    isEmailVerified: { type: Boolean, default: false },
    isAgeVerified: { type: Boolean, default: false },
    isCloudinaryVerified: { type: Boolean, default: false },
    isIdVerified: { type: Boolean, default: false },
    isProfileVerified: { type: Boolean, default: false },
    verificationBadge: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    badges: [{ type: String, enum: ['AP', 'VIP', 'Marriage Pack', 'Age Verified'] }],
    sellerLevel: {
      type: String,
      enum: ['new', 'level1', 'level2', 'top_rated', 'pro'],
      default: 'new',
    },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    skills: [{ type: String }],
    languages: [{ type: String }],
    certifications: [{ type: String }],
    portfolio: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true },
        title: { type: String, default: '' },
      },
    ],
    isAvailable: { type: Boolean, default: true },
    outOfOfficeUntil: { type: Date },
    outOfOfficeMessage: { type: String, default: '' },
    responseRate: { type: Number, default: 0 },
    avgResponseTimeMinutes: { type: Number, default: 0 },
    totalOrdersCompleted: { type: Number, default: 0 },
    totalEarnedINR: { type: Number, default: 0 },
    totalEarnedUSD: { type: Number, default: 0 },
    crWalletBalance: { type: Number, default: 0 },
    successScore: { type: Number, default: 0 },
    profileCompleteness: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    refreshTokens: [{ type: String }],
    passwordResetOtp: { type: String },
    passwordResetOtpExpiry: { type: Date },
    emailOtp: { type: String },
    emailOtpExpiry: { type: Date },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    searchHistory: [{
      id: { type: String, required: true },
      query: { type: String, required: true },
      timestamp: { type: Date, required: true },
      resultsCount: { type: Number, default: 0 },
    }],
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Gig' }],
    payoutMethods: {
      type: {
        bankTransfer: {
          accountHolderName: { type: String, default: '' },
          accountNumber: { type: String, default: '' },
          bankName: { type: String, default: '' },
          ifscCode: { type: String, default: '' },
        },
        paypal: {
          email: { type: String, default: '' },
        },
      },
      default: {},
    },
    banned: { type: Boolean, default: false },
    hasAcceptedCreatorPolicy: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.index({ imvuUsername: 1 });
userSchema.index({ isOnline: 1 });

// Pre-save middleware to ensure roles and activeRole are synchronized and valid
userSchema.pre('save', function (next) {
  const user = this as any;

  // Migration from legacy single role field if roles is empty/missing
  if (!user.roles || user.roles.length === 0) {
    if (user.role) {
      user.roles = [user.role];
    } else {
      user.roles = ['buyer'];
    }
  }

  // Ensure activeRole is initialized
  if (!user.activeRole) {
    if (user.role) {
      user.activeRole = user.role;
    } else {
      user.activeRole = user.roles[0];
    }
  }

  // Handle legacy 'user' role mapping to 'buyer'
  if (user.activeRole === 'user') {
    user.activeRole = 'buyer';
  }
  user.roles = user.roles.map((r: string) => r === 'user' ? 'buyer' : r);

  // Filter unique roles
  user.roles = Array.from(new Set(user.roles));

  // Ensure activeRole is always present within roles
  if (!user.roles.includes(user.activeRole)) {
    user.roles.push(user.activeRole);
  }

  // Keep legacy role field in sync for database fallback
  user.role = user.activeRole;

  next();
});

// Pre-save middleware to hash password if modified
userSchema.pre('save', async function () {
  const user = this as IUser;
  if (!user.isModified('password') || !user.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema, 'users'); // explicit collection name
