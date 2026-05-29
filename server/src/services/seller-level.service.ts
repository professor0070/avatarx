import { User } from '../models/user.model';
import { Order } from '../models/order.model';
import { Gig } from '../models/gig.model';
import type { SellerLevel } from '../models/user.model';

interface SellerLevelMetrics {
  totalOrdersCompleted: number;
  totalEarnedINR: number;
  totalEarnedUSD: number;
  avgRating: number;
  responseRate: number;
  successScore: number;
  activeOrders: number;
  daysSinceJoin: number;
  profileCompleteness: number;
}

interface SellerLevelResult {
  level: SellerLevel;
  reasons: string[];
  nextLevel: SellerLevel | null;
  nextLevelRequirements: string[];
}

/**
 * Calculate seller level based on performance metrics
 */
export async function calculateSellerLevel(userId: string): Promise<SellerLevelResult> {
  const user = await User.findById(userId);
  if (!user || !user.roles.includes('seller')) {
    throw new Error('User not found or not a seller');
  }

  // Gather metrics
  const metrics = await gatherSellerMetrics(userId);

  // Calculate level based on criteria
  const result = determineSellerLevel(metrics);

  // Update user's seller level if changed
  if (user.sellerLevel !== result.level) {
    user.sellerLevel = result.level;
    await user.save();
  }

  return result;
}

/**
 * Gather all relevant metrics for seller level calculation
 */
async function gatherSellerMetrics(userId: string): Promise<SellerLevelMetrics> {
  // Get completed orders as seller
  const completedOrders = await Order.find({
    sellerId: userId,
    status: 'completed',
  });

  const totalOrdersCompleted = completedOrders.length;

  // Calculate total earnings (sum of order amounts)
  const totalEarnedINR = completedOrders.reduce((sum, order) => {
    return sum + (order.currency === 'INR' ? order.totalPrice : 0);
  }, 0);

  const totalEarnedUSD = completedOrders.reduce((sum, order) => {
    return sum + (order.currency === 'USD' ? order.totalPrice : 0);
  }, 0);

  // Calculate average rating from reviews
  const ratings = completedOrders
    .map(order => order.review?.rating)
    .filter((rating): rating is number => typeof rating === 'number');
  
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : 0;

  // Get user's response rate and success score from user document
  const user = await User.findById(userId);
  const responseRate = user?.responseRate || 0;
  const successScore = user?.successScore || 0;
  const profileCompleteness = user?.profileCompleteness || 0;

  // Get active orders
  const activeOrders = await Order.countDocuments({
    sellerId: userId,
    status: { $in: ['in_progress', 'revision_requested', 'requirements_submitted'] },
  });

  // Calculate days since join
  const daysSinceJoin = user
    ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    totalOrdersCompleted,
    totalEarnedINR,
    totalEarnedUSD,
    avgRating,
    responseRate,
    successScore,
    activeOrders,
    daysSinceJoin,
    profileCompleteness,
  };
}

/**
 * Determine seller level based on metrics
 */
function determineSellerLevel(metrics: SellerLevelMetrics): SellerLevelResult {
  const {
    totalOrdersCompleted,
    totalEarnedINR,
    totalEarnedUSD,
    avgRating,
    responseRate,
    successScore,
    daysSinceJoin,
    profileCompleteness,
  } = metrics;

  // Convert USD to INR (approximate rate: 1 USD = 83 INR)
  const totalEarnedINREquivalent = totalEarnedINR + (totalEarnedUSD * 83);

  const reasons: string[] = [];

  // Check for PRO level (highest)
  if (
    totalOrdersCompleted >= 100 &&
    totalEarnedINREquivalent >= 500000 &&
    avgRating >= 4.9 &&
    responseRate >= 95 &&
    successScore >= 95 &&
    profileCompleteness >= 90 &&
    daysSinceJoin >= 180
  ) {
    reasons.push(
      `Completed ${totalOrdersCompleted} orders (required: 100)`,
      `Earned ₹${totalEarnedINREquivalent.toLocaleString()} (required: ₹500,000)`,
      `Average rating: ${avgRating.toFixed(1)}/5 (required: 4.9)`,
      `Response rate: ${responseRate}% (required: 95%)`,
      `Success score: ${successScore}% (required: 95%)`,
      `Profile completeness: ${profileCompleteness}% (required: 90%)`,
      `Active for ${daysSinceJoin} days (required: 180 days)`
    );
    return {
      level: 'pro',
      reasons,
      nextLevel: null,
      nextLevelRequirements: [],
    };
  }

  // Check for TOP_RATED level
  if (
    totalOrdersCompleted >= 50 &&
    totalEarnedINREquivalent >= 200000 &&
    avgRating >= 4.8 &&
    responseRate >= 90 &&
    successScore >= 90 &&
    profileCompleteness >= 80 &&
    daysSinceJoin >= 90
  ) {
    reasons.push(
      `Completed ${totalOrdersCompleted} orders (required: 50)`,
      `Earned ₹${totalEarnedINREquivalent.toLocaleString()} (required: ₹200,000)`,
      `Average rating: ${avgRating.toFixed(1)}/5 (required: 4.8)`,
      `Response rate: ${responseRate}% (required: 90%)`,
      `Success score: ${successScore}% (required: 90%)`,
      `Profile completeness: ${profileCompleteness}% (required: 80%)`,
      `Active for ${daysSinceJoin} days (required: 90 days)`
    );
    return {
      level: 'top_rated',
      reasons,
      nextLevel: 'pro',
      nextLevelRequirements: [
        'Complete 100 total orders',
        'Earn ₹500,000 total',
        'Maintain 4.9+ average rating',
        'Maintain 95%+ response rate',
        'Maintain 95%+ success score',
        'Complete 90%+ profile',
        'Be active for 180 days',
      ],
    };
  }

  // Check for LEVEL2
  if (
    totalOrdersCompleted >= 20 &&
    totalEarnedINREquivalent >= 50000 &&
    avgRating >= 4.5 &&
    responseRate >= 80 &&
    successScore >= 85 &&
    profileCompleteness >= 70 &&
    daysSinceJoin >= 30
  ) {
    reasons.push(
      `Completed ${totalOrdersCompleted} orders (required: 20)`,
      `Earned ₹${totalEarnedINREquivalent.toLocaleString()} (required: ₹50,000)`,
      `Average rating: ${avgRating.toFixed(1)}/5 (required: 4.5)`,
      `Response rate: ${responseRate}% (required: 80%)`,
      `Success score: ${successScore}% (required: 85%)`,
      `Profile completeness: ${profileCompleteness}% (required: 70%)`,
      `Active for ${daysSinceJoin} days (required: 30 days)`
    );
    return {
      level: 'level2',
      reasons,
      nextLevel: 'top_rated',
      nextLevelRequirements: [
        'Complete 50 total orders',
        'Earn ₹200,000 total',
        'Maintain 4.8+ average rating',
        'Maintain 90%+ response rate',
        'Maintain 90%+ success score',
        'Complete 80%+ profile',
        'Be active for 90 days',
      ],
    };
  }

  // Check for LEVEL1
  if (
    totalOrdersCompleted >= 5 &&
    totalEarnedINREquivalent >= 10000 &&
    avgRating >= 4.0 &&
    responseRate >= 70 &&
    successScore >= 80 &&
    profileCompleteness >= 60
  ) {
    reasons.push(
      `Completed ${totalOrdersCompleted} orders (required: 5)`,
      `Earned ₹${totalEarnedINREquivalent.toLocaleString()} (required: ₹10,000)`,
      `Average rating: ${avgRating.toFixed(1)}/5 (required: 4.0)`,
      `Response rate: ${responseRate}% (required: 70%)`,
      `Success score: ${successScore}% (required: 80%)`,
      `Profile completeness: ${profileCompleteness}% (required: 60%)`
    );
    return {
      level: 'level1',
      reasons,
      nextLevel: 'level2',
      nextLevelRequirements: [
        'Complete 20 total orders',
        'Earn ₹50,000 total',
        'Maintain 4.5+ average rating',
        'Maintain 80%+ response rate',
        'Maintain 85%+ success score',
        'Complete 70%+ profile',
        'Be active for 30 days',
      ],
    };
  }

  // Default to NEW level
  const nextLevelRequirements: string[] = [];
  if (totalOrdersCompleted < 5) nextLevelRequirements.push(`Complete ${5 - totalOrdersCompleted} more orders`);
  if (totalEarnedINREquivalent < 10000) nextLevelRequirements.push(`Earn ₹${(10000 - totalEarnedINREquivalent).toLocaleString()} more`);
  if (avgRating < 4.0) nextLevelRequirements.push(`Improve rating to 4.0+`);
  if (responseRate < 70) nextLevelRequirements.push(`Improve response rate to 70%+`);
  if (successScore < 80) nextLevelRequirements.push(`Improve success score to 80%+`);
  if (profileCompleteness < 60) nextLevelRequirements.push(`Complete profile to 60%+`);

  return {
    level: 'new',
    reasons: ['New seller - complete more orders to level up'],
    nextLevel: 'level1',
    nextLevelRequirements,
  };
}

/**
 * Recalculate seller level for all sellers (for cron job)
 */
export async function recalculateAllSellerLevels(): Promise<{ updated: number; errors: number }> {
  const sellers = await User.find({ roles: 'seller' });
  let updated = 0;
  let errors = 0;

  for (const seller of sellers) {
    try {
      const result = await calculateSellerLevel(seller._id.toString());
      if (seller.sellerLevel !== result.level) {
        updated++;
      }
    } catch (error) {
      console.error(`Error calculating seller level for ${seller._id}:`, error);
      errors++;
    }
  }

  return { updated, errors };
}

/**
 * Get seller level requirements for display
 */
export function getSellerLevelRequirements(level: SellerLevel): {
  level: SellerLevel;
  name: string;
  color: string;
  requirements: string[];
  benefits: string[];
} {
  const requirementsMap: Record<SellerLevel, any> = {
    new: {
      level: 'new',
      name: 'New Seller',
      color: '#6B7280',
      requirements: [
        'Complete 5 orders',
        'Earn ₹10,000',
        'Maintain 4.0+ rating',
        '70%+ response rate',
        '80%+ success score',
        '60%+ profile completeness',
      ],
      benefits: [
        'Basic seller features',
        'Access to buyer requests',
        'Standard commission rates',
      ],
    },
    level1: {
      level: 'level1',
      name: 'Level 1 Seller',
      color: '#3B82F6',
      requirements: [
        'Complete 20 orders',
        'Earn ₹50,000',
        'Maintain 4.5+ rating',
        '80%+ response rate',
        '85%+ success score',
        '70%+ profile completeness',
        '30+ days active',
      ],
      benefits: [
        'Level 1 seller badge',
        'Reduced commission',
        'Priority in search',
        'Early access to buyer requests',
      ],
    },
    level2: {
      level: 'level2',
      name: 'Level 2 Seller',
      color: '#10B981',
      requirements: [
        'Complete 50 orders',
        'Earn ₹200,000',
        'Maintain 4.8+ rating',
        '90%+ response rate',
        '90%+ success score',
        '80%+ profile completeness',
        '90+ days active',
      ],
      benefits: [
        'Level 2 seller badge',
        'Further reduced commission',
        'Top search placement',
        'Verified seller badge',
        'Exclusive buyer requests',
      ],
    },
    top_rated: {
      level: 'top_rated',
      name: 'Top Rated Seller',
      color: '#F59E0B',
      requirements: [
        'Complete 100 orders',
        'Earn ₹500,000',
        'Maintain 4.9+ rating',
        '95%+ response rate',
        '95%+ success score',
        '90%+ profile completeness',
        '180+ days active',
      ],
      benefits: [
        'Top Rated badge',
        'Lowest commission',
        'Featured placement',
        'Priority support',
        'Exclusive features',
        'Dedicated account manager',
      ],
    },
    pro: {
      level: 'pro',
      name: 'Pro Seller',
      color: '#8B5CF6',
      requirements: [
        'Maintain top rated status',
        'Consistent excellence',
        'Community leadership',
      ],
      benefits: [
        'Pro seller badge',
        'Custom commission rates',
        'VIP support',
        'Exclusive partnerships',
        'Revenue sharing',
        'Brand collaboration opportunities',
      ],
    },
  };

  return requirementsMap[level];
}
