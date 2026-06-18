export type AvatarXRole = 'user' | 'seller' | 'admin' | 'buyer' | 'super_admin' | 'creator';

export type SellerLevel = 'new' | 'level1' | 'level2' | 'top_rated' | 'pro';
export type BadgeType = 'AP' | 'VIP' | 'Marriage Pack' | 'Age Verified';

export type AvatarXUser = {
  id: string | null;
  clerkId?: string | null;       // Clerk user ID (e.g. user_xxx) — used for session identity checks
  email: string | null;
  displayName: string | null;
  imvuUsername: string;
  role: AvatarXRole;
  roles?: AvatarXRole[];
  activeRole?: AvatarXRole;
  avatar: string;
  badges: BadgeType[];
  sellerLevel: SellerLevel;
  isEmailVerified: boolean;
  isAgeVerified: boolean;
  isCloudinaryVerified: boolean;
  isIdVerified: boolean;
  isProfileVerified: boolean;
  verificationBadge: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  isAvailable: boolean;
  outOfOfficeUntil: string | null;
  outOfOfficeMessage: string;
  isOnline: boolean;
  lastSeen: string | null;
  crWalletBalance: number;
};

