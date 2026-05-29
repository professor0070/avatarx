import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Gig, type IGig } from '../models/gig.model';
import { Order } from '../models/order.model';
import { User } from '../models/user.model';
import type { AuthRequest } from '../middleware/auth.middleware';
import { checkAdultContentAccess } from '../middleware/adult.middleware';

function sanitizeGig(gig: any) {
  return {
    id: gig._id?.toString(),
    title: gig.title,
    slug: gig.slug,
    description: gig.description,
    type: gig.type,
    category: gig.category,
    isAdultContent: gig.isAdultContent,
    tags: gig.tags,
    sellerId: gig.sellerId?.toString(),
    sellerDisplayName: gig.sellerDisplayName,
    sellerAvatar: gig.sellerAvatar,
    sellerLevel: gig.sellerLevel,
    sellerVerificationBadge: gig.sellerVerificationBadge,
    sellerRating: gig.sellerRating,
    sellerTotalOrders: gig.sellerTotalOrders,
    gallery: gig.gallery,
    thumbnail: gig.thumbnail,
    tiers: gig.tiers,
    extras: gig.extras,
    upgrades: gig.upgrades,
    comboPricing: gig.comboPricing,
    deliveryType: gig.deliveryType,
    instantDownloadFiles: gig.instantDownloadFiles,
    requirements: gig.requirements,
    requestToOrder: gig.requestToOrder,
    isPaused: gig.isPaused,
    pauseReason: gig.pauseReason,
    seoTitle: gig.seoTitle,
    seoDescription: gig.seoDescription,
    impressions: gig.impressions,
    clicks: gig.clicks,
    orders: gig.orders,
    conversionRate: gig.conversionRate,
    totalReviews: gig.totalReviews,
    averageRating: gig.averageRating,
    lastTwoMonthsRating: gig.lastTwoMonthsRating,
    faqs: gig.faqs,
    status: gig.status,
    createdAt: gig.createdAt,
    updatedAt: gig.updatedAt,
  };
}

function validateGigData(data: any) {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (data.title.length > 80) {
    errors.push('Title must be 80 characters or less');
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push('Description is required');
  } else if (data.description.length > 3000) {
    errors.push('Description must be 3000 characters or less');
  }

  if (!data.type || !['product', 'service'].includes(data.type)) {
    errors.push('Valid gig type is required');
  }

  if (!data.category || typeof data.category !== 'string') {
    errors.push('Category is required');
  }

  if (!data.tiers || !Array.isArray(data.tiers) || data.tiers.length === 0) {
    errors.push('At least one pricing tier is required');
  } else {
    const tierNames = data.tiers.map((t: any) => t.name);
    const requiredTiers = ['Basic', 'Standard', 'Premium'];
    const hasRequiredTiers = requiredTiers.some(name => tierNames.includes(name));
    if (!hasRequiredTiers) {
      errors.push('At least one Basic, Standard, or Premium tier is required');
    }

    data.tiers.forEach((tier: any, index: number) => {
      if (!tier.name || !['Basic', 'Standard', 'Premium'].includes(tier.name)) {
        errors.push(`Tier ${index + 1}: Invalid tier name`);
      }
      if (!tier.price || typeof tier.price !== 'number' || tier.price < 5) {
        errors.push(`Tier ${index + 1}: Price must be at least ₹5`);
      }
      if (!tier.deliveryTimeDays || typeof tier.deliveryTimeDays !== 'number' || tier.deliveryTimeDays < 1) {
        errors.push(`Tier ${index + 1}: Delivery time must be at least 1 day`);
      }
      if (typeof tier.revisions !== 'number' || tier.revisions < 0) {
        errors.push(`Tier ${index + 1}: Revisions must be 0 or more`);
      }
    });
  }

  if (!data.thumbnail || typeof data.thumbnail !== 'string') {
    errors.push('Thumbnail is required');
  }

  if (data.tags && (!Array.isArray(data.tags) || data.tags.length > 5)) {
    errors.push('Maximum 5 tags allowed');
  }

  return errors;
}

export async function createGigHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    // Get seller info
    const seller = await User.findById(req.userId);
    if (!seller) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    const allowedRoles = ['seller', 'creator', 'admin', 'super_admin'];
    if (!allowedRoles.includes(seller.role)) {
      res.status(403).json({ ok: false, error: { message: 'Only sellers and creators can create gigs' } });
      return;
    }

    if (!seller.hasAcceptedCreatorPolicy) {
      res.status(403).json({ ok: false, error: { message: 'You must accept the Creator Policy in your settings before creating a gig' } });
      return;
    }

    if (seller.verificationStatus === 'pending' || seller.verificationStatus === 'rejected') {
      res.status(403).json({ ok: false, error: { message: 'Your seller account is pending verification or rejected. You cannot create gigs at this time.' } });
      return;
    }

    // Validate gig data
    const validationErrors = validateGigData(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({ 
        ok: false, 
        error: { 
          message: 'Validation failed', 
          details: validationErrors 
        } 
      });
      return;
    }

    // Check adult content if applicable
    if (req.body.isAdultContent) {
      const adultCheck = await checkAdultContentAccess(req.userId);
      if (!adultCheck.allowed && adultCheck.error) {
        res.status(403).json({ ok: false, error: adultCheck.error });
        return;
      }
    }

    // Check seller's gig limit based on level
    const activeGigsCount = await Gig.countDocuments({ 
      sellerId: req.userId, 
      status: { $in: ['active', 'paused'] } 
    });

    const gigLimits: Record<string, number> = {
      'new': 7,
      'level1': 10,
      'level2': 20,
      'top_rated': 30,
      'pro': 50,
    };

    const maxGigs = gigLimits[seller.sellerLevel] || 7;
    if (activeGigsCount >= maxGigs) {
      res.status(403).json({ 
        ok: false, 
        error: { 
          message: `Gig limit reached. Maximum ${maxGigs} gigs allowed for ${seller.sellerLevel} sellers.` 
        } 
      });
      return;
    }

    // Create gig
    const gigData = {
      ...req.body,
      sellerId: req.userId,
      sellerDisplayName: seller.displayName,
      sellerAvatar: seller.avatar || '',
      sellerLevel: seller.sellerLevel,
      sellerVerificationBadge: seller.verificationBadge,
      sellerRating: 0, // Will be calculated from reviews
      sellerTotalOrders: seller.totalOrdersCompleted,
      status: 'draft',
    };

    const gig = new Gig(gigData);
    await gig.save();

    res.status(201).json({ 
      ok: true, 
      gig: sanitizeGig(gig) 
    });

  } catch (error) {
    console.error('[avatarx-server] createGig error:', error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ 
        ok: false, 
        error: { message: 'Invalid gig data' } 
      });
    } else if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(409).json({ 
        ok: false, 
        error: { message: 'Gig with this title already exists' } 
      });
    } else {
      res.status(500).json({ 
        ok: false, 
        error: { message: 'Internal server error' } 
      });
    }
  }
}

export async function getGigsHandler(req: Request, res: Response) {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      type,
      minPrice,
      maxPrice,
      deliveryTime,
      sellerLevel,
      search,
      sort = 'createdAt',
      order = 'desc',
      isAdultContent,
      tags,
      minRating,
      hasReviews,
      onlineOnly,
      verifiedOnly,
      instantDelivery,
    } = req.query;

    // Build filter
    const filter: any = { status: 'active' };

    if (category) filter.category = category;
    if (type) filter.type = type;
    if (sellerLevel) filter.sellerLevel = sellerLevel;
    if (isAdultContent !== undefined) filter.isAdultContent = isAdultContent === 'true';

    // Tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filter.tags = { $in: tagArray };
    }

    // Rating filter
    if (minRating) {
      filter.averageRating = { $gte: Number(minRating) };
    }

    // Reviews filter
    if (hasReviews === 'true') {
      filter.totalReviews = { $gt: 0 };
    }

    // Verified sellers only
    if (verifiedOnly === 'true') {
      filter.sellerVerificationBadge = true;
    }

    // Instant delivery only
    if (instantDelivery === 'true') {
      filter.deliveryType = 'instant';
    }

    // Price filter
    if (minPrice || maxPrice) {
      filter['tiers.price'] = {};
      if (minPrice) filter['tiers.price'].$gte = Number(minPrice);
      if (maxPrice) filter['tiers.price'].$lte = Number(maxPrice);
    }

    // Delivery time filter
    if (deliveryTime) {
      const maxDays = Number(deliveryTime);
      filter['tiers.deliveryTimeDays'] = { $lte: maxDays };
    }

    // Search filter
    if (search) {
      filter.$text = { $search: search as string };
    }

    // Build sort
    const sortOptions: any = {};
    switch (sort) {
      case 'price':
        sortOptions['tiers.0.price'] = order === 'asc' ? 1 : -1;
        break;
      case 'rating':
        sortOptions.averageRating = order === 'asc' ? 1 : -1;
        break;
      case 'orders':
        sortOptions.orders = order === 'asc' ? 1 : -1;
        break;
      case 'relevance':
        if (search) {
          sortOptions.score = { $meta: 'textScore' };
        } else {
          sortOptions.createdAt = order === 'asc' ? 1 : -1;
        }
        break;
      case 'createdAt':
      default:
        sortOptions.createdAt = order === 'asc' ? 1 : -1;
        break;
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    let gigs;
    let total;

    if (onlineOnly === 'true') {
      const pipeline = [
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'sellerId',
            foreignField: '_id',
            as: 'seller',
          },
        },
        { $match: { 'seller.isOnline': true } },
        { $unwind: '$seller' },
        { $sort: sortOptions },
        { $skip: skip },
        { $limit: limitNum },
      ];

      const [gigResults, countResults] = await Promise.all([
        Gig.aggregate(pipeline),
        Gig.aggregate([
          { $match: filter },
          {
            $lookup: {
              from: 'users',
              localField: 'sellerId',
              foreignField: '_id',
              as: 'seller',
            },
          },
          { $match: { 'seller.isOnline': true } },
          { $count: 'total' },
        ]),
      ]);

      gigs = gigResults;
      total = countResults[0]?.total || 0;
    } else {
      // Standard query
      [gigs, total] = await Promise.all([
        Gig.find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .populate('sellerId', 'displayName avatar sellerLevel verificationBadge isOnline')
          .lean(),
        Gig.countDocuments(filter),
      ]);
    }

    const sanitizedGigs = gigs.map(gig => sanitizeGig(gig));

    res.json({
      ok: true,
      gigs: sanitizedGigs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      filters: {
        applied: {
          category,
          type,
          minPrice,
          maxPrice,
          deliveryTime,
          sellerLevel,
          search,
          tags,
          minRating,
          hasReviews,
          onlineOnly,
          verifiedOnly,
          instantDelivery,
          isAdultContent,
        },
        available: {
          categories: [
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
          types: ['product', 'service', 'both'],
          sellerLevels: ['new', 'level1', 'level2', 'top_rated', 'pro'],
          sortOptions: [
            { value: 'createdAt', label: 'Newest First' },
            { value: 'price', label: 'Price' },
            { value: 'rating', label: 'Rating' },
            { value: 'orders', label: 'Orders' },
            { value: 'relevance', label: 'Relevance' },
          ],
        },
      },
    });

  } catch (error) {
    console.error('[avatarx-server] getGigs error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function getGigByIdHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ ok: false, error: { message: 'Invalid gig ID' } });
      return;
    }

    const gig = await Gig.findById(id)
      .populate('sellerId', 'displayName avatar sellerLevel verificationBadge rating totalOrdersCompleted')
      .lean();

    if (!gig) {
      res.status(404).json({ ok: false, error: { message: 'Gig not found' } });
      return;
    }

    if (gig.status !== 'active') {
      res.status(404).json({ ok: false, error: { message: 'Gig not available' } });
      return;
    }

    // Increment impressions
    await Gig.findByIdAndUpdate(id, { $inc: { impressions: 1 } });

    res.json({
      ok: true,
      gig: sanitizeGig(gig),
    });

  } catch (error) {
    console.error('[avatarx-server] getGigById error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function updateGigHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ ok: false, error: { message: 'Invalid gig ID' } });
      return;
    }

    const gig = await Gig.findById(id);
    if (!gig) {
      res.status(404).json({ ok: false, error: { message: 'Gig not found' } });
      return;
    }

    // Check ownership
    if (gig.sellerId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Not authorized to edit this gig' } });
      return;
    }

    const seller = await User.findById(req.userId);
    if (!seller?.hasAcceptedCreatorPolicy) {
      res.status(403).json({ ok: false, error: { message: 'You must accept the Creator Policy in your settings before editing a gig' } });
      return;
    }

    // Validate updated data
    const validationErrors = validateGigData(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({ 
        ok: false, 
        error: { 
          message: 'Validation failed', 
          details: validationErrors 
        } 
      });
      return;
    }

    // Check adult content if applicable
    if (req.body.isAdultContent && !gig.isAdultContent) {
      const adultCheck = await checkAdultContentAccess(req.userId);
      if (!adultCheck.allowed && adultCheck.error) {
        res.status(403).json({ ok: false, error: adultCheck.error });
        return;
      }
    }

    // Update gig
    Object.assign(gig, req.body);
    await gig.save();

    res.json({
      ok: true,
      gig: sanitizeGig(gig),
    });

  } catch (error) {
    console.error('[avatarx-server] updateGig error:', error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ 
        ok: false, 
        error: { message: 'Invalid gig data' } 
      });
    } else {
      res.status(500).json({ 
        ok: false, 
        error: { message: 'Internal server error' } 
      });
    }
  }
}

export async function deleteGigHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ ok: false, error: { message: 'Invalid gig ID' } });
      return;
    }

    const gig = await Gig.findById(id);
    if (!gig) {
      res.status(404).json({ ok: false, error: { message: 'Gig not found' } });
      return;
    }

    // Check ownership or admin
    const user = await User.findById(req.userId);
    const isAdmin = user?.role === 'admin';
    const isOwner = gig.sellerId.toString() === req.userId;

    if (!isOwner && !isAdmin) {
      res.status(403).json({ ok: false, error: { message: 'Not authorized to delete this gig' } });
      return;
    }

    // Soft delete
    gig.status = 'deleted';
    await gig.save();

    res.json({ ok: true });

  } catch (error) {
    console.error('[avatarx-server] deleteGig error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function toggleGigStatusHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { id } = req.params;
    const { action, reason } = req.body; // action: 'pause' | 'unpause' | 'publish'

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ ok: false, error: { message: 'Invalid gig ID' } });
      return;
    }

    const gig = await Gig.findById(id);
    if (!gig) {
      res.status(404).json({ ok: false, error: { message: 'Gig not found' } });
      return;
    }

    // Check ownership
    if (gig.sellerId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Not authorized to modify this gig' } });
      return;
    }

    switch (action) {
      case 'pause':
        gig.isPaused = true;
        gig.pauseReason = reason || '';
        gig.status = 'paused';
        break;
      case 'unpause':
        gig.isPaused = false;
        gig.pauseReason = '';
        gig.status = 'active';
        break;
      case 'publish':
        if (gig.status === 'draft') {
          gig.status = 'active';
        }
        break;
      default:
        res.status(400).json({ ok: false, error: { message: 'Invalid action' } });
        return;
    }

    await gig.save();

    res.json({
      ok: true,
      gig: sanitizeGig(gig),
    });

  } catch (error) {
    console.error('[avatarx-server] toggleGigStatus error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function getMyGigsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { page = 1, limit = 20, status } = req.query;

    const filter: any = { sellerId: req.userId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [gigs, total] = await Promise.all([
      Gig.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Gig.countDocuments(filter)
    ]);

    const sanitizedGigs = gigs.map(gig => sanitizeGig(gig));

    res.json({
      ok: true,
      gigs: sanitizedGigs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    console.error('[avatarx-server] getMyGigs error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function getFeaturedGigsHandler(req: Request, res: Response) {
  try {
    const { limit = 6 } = req.query;
    const limitNum = Math.min(Number(limit), 12);

    const featuredGigs = await Gig.find({
      status: 'active',
      isPaused: false,
    })
      .sort({ orders: -1, averageRating: -1, createdAt: -1 })
      .limit(limitNum)
      .lean();

    const sanitizedGigs = featuredGigs.map(gig => ({
      id: gig._id?.toString(),
      title: gig.title,
      description: gig.description,
      category: gig.category,
      price: gig.tiers[0]?.price || 0,
      currency: gig.tiers[0]?.currency || 'USD',
      sellerName: gig.sellerDisplayName,
      sellerAvatar: gig.sellerAvatar,
      sellerRating: gig.averageRating || 0,
      sellerLevel: gig.sellerLevel,
      thumbnail: gig.thumbnail,
      tags: gig.tags,
      isAdultContent: gig.isAdultContent,
    }));

    res.json({
      ok: true,
      gigs: sanitizedGigs,
    });
  } catch (error) {
    console.error('[avatarx-server] getFeaturedGigs error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function getSimilarGigsHandler(req: Request, res: Response) {
  try {
    const { gigId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      res.status(400).json({ ok: false, error: { message: 'Invalid gig ID' } });
      return;
    }

    const gig = await Gig.findById(gigId).lean();
    if (!gig) {
      res.status(404).json({ ok: false, error: { message: 'Gig not found' } });
      return;
    }

    const similar = await Gig.find({
      _id: { $ne: gig._id },
      status: 'active',
      isPaused: false,
      $or: [
        { category: gig.category },
        { tags: { $in: gig.tags || [] } },
      ],
    })
      .sort({ averageRating: -1, orders: -1 })
      .limit(6)
      .lean();

    res.json({
      ok: true,
      gigs: similar.map((g) => sanitizeGig(g)),
    });
  } catch (error) {
    console.error('[avatarx-server] getSimilarGigs error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function getGigsByIdsHandler(req: Request, res: Response) {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') {
      res.json({ ok: true, gigs: [] });
      return;
    }

    const idList = ids.split(',').filter((id) => mongoose.Types.ObjectId.isValid(id));
    const gigs = await Gig.find({ _id: { $in: idList }, status: 'active', isPaused: false })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    res.json({ ok: true, gigs: gigs.map((g) => sanitizeGig(g)) });
  } catch (error) {
    console.error('[avatarx-server] getGigsByIds error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function getGigReviewsHandler(req: Request, res: Response) {
  try {
    const { gigId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      res.status(400).json({ ok: false, error: { message: 'Invalid gig ID' } });
      return;
    }

    const reviews = await Order.find({
      gigId,
      status: 'completed',
      'review.rating': { $exists: true },
    })
      .populate('buyerId', 'displayName avatar')
      .sort({ 'review.submittedAt': -1 })
      .lean();

    const sanitized = reviews.map((order: any) => ({
      rating: order.review?.rating || 0,
      comment: order.review?.comment || '',
      submittedAt: order.review?.submittedAt,
      buyer: {
        displayName: order.buyerId?.displayName || 'Anonymous',
        avatar: order.buyerId?.avatar || null,
      },
    }));

    res.json({ ok: true, reviews: sanitized });
  } catch (error) {
    console.error('[avatarx-server] getGigReviews error:', error);
    res.status(500).json({
      ok: false,
      error: { message: 'Internal server error' },
    });
  }
}

export async function getCategoriesHandler(req: Request, res: Response) {
  try {
    const categories = [
      { id: 'game-credits', name: 'Game Credits', icon: '💎', gigCount: 0 },
      { id: 'adult-triggers-male', name: 'Adult Triggers Male', icon: '👨', gigCount: 0 },
      { id: 'adult-triggers-female', name: 'Adult Triggers Female', icon: '👩', gigCount: 0 },
      { id: 'adult-rooms', name: 'Adult Rooms', icon: '🏠', gigCount: 0 },
      { id: 'outfits-male', name: 'Outfits Male', icon: '👔', gigCount: 0 },
      { id: 'outfits-female', name: 'Outfits Female', icon: '👗', gigCount: 0 },
      { id: 'badges', name: 'Badges', icon: '🏅', gigCount: 0 },
      { id: 'room-decoration', name: 'Room Decoration', icon: '🎨', gigCount: 0 },
      { id: 'adult-triggers-making', name: 'Adult Triggers Making', icon: '⚡', gigCount: 0 },
      { id: 'brand-ambassador', name: 'Brand Ambassador Management', icon: '🌟', gigCount: 0 },
      { id: 'agency-management', name: 'Agency Management', icon: '🏢', gigCount: 0 },
      { id: 'instagram-reels', name: 'Instagram Reels', icon: '📱', gigCount: 0 },
      { id: 'marriage-videographer', name: 'Marriage Videographer', icon: '🎬', gigCount: 0 },
      { id: 'photo-editor', name: 'Photo Editor', icon: '📷', gigCount: 0 },
      { id: 'custom-services', name: 'Custom Services', icon: '✨', gigCount: 0 },
    ];

    // Get gig counts for each category
    const categoryCounts = await Gig.aggregate([
      { $match: { status: 'active', isPaused: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const categoryCountMap = new Map(
      categoryCounts.map((item: any) => [item._id, item.count])
    );

    const categoriesWithCounts = categories.map(cat => ({
      ...cat,
      gigCount: categoryCountMap.get(cat.id) || 0,
    }));

    res.json({
      ok: true,
      categories: categoriesWithCounts,
    });
  } catch (error) {
    console.error('[avatarx-server] getCategories error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}
