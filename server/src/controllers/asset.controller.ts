import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware';
import { Asset } from '../models/asset.model';
import { uploadToCloudinary, deleteFromCloudinary, uploadGigGallery } from '../services/cloudinary.service';
import { User } from '../models/user.model';

function sanitizeAsset(asset: any) {
  return {
    id: asset._id?.toString(),
    assetId: asset.assetId,
    name: asset.name,
    description: asset.description,
    type: asset.type,
    category: asset.category,
    subcategory: asset.subcategory,
    tags: asset.tags,
    price: asset.price,
    currency: asset.currency,
    creditsPrice: asset.creditsPrice,
    files: asset.files,
    thumbnails: asset.thumbnails,
    previewVideo: asset.previewVideo,
    imvuStatus: asset.imvuStatus,
    imvuProductId: asset.imvuProductId,
    imvuSyncStatus: asset.imvuSyncStatus,
    moderationStatus: asset.moderationStatus,
    isAdultContent: asset.isAdultContent,
    viewCount: asset.viewCount,
    downloadCount: asset.downloadCount,
    purchaseCount: asset.purchaseCount,
    rating: asset.rating,
    ratingCount: asset.ratingCount,
    revenue: asset.revenue,
    status: asset.status,
    isPublished: asset.isPublished,
    publishedAt: asset.publishedAt,
    sellerId: asset.sellerId?.toString(),
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

// Upload asset to IMVU marketplace
export async function uploadAssetHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const {
      name,
      description,
      type,
      category,
      subcategory,
      tags,
      price,
      currency,
      creditsPrice,
      isAdultContent,
    } = req.body;

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ ok: false, error: { message: 'No files uploaded' } });
      return;
    }

    if (!name || !type || !category || !price) {
      res.status(400).json({ ok: false, error: { message: 'Missing required fields: name, type, category, price' } });
      return;
    }

    // Verify user is a seller/creator
    const user = await User.findById(req.userId);
    if (!user || !user.roles.some(r => ['seller', 'creator', 'admin', 'super_admin'].includes(r))) {
      res.status(403).json({ ok: false, error: { message: 'Only sellers and creators can upload assets' } });
      return;
    }

    // Upload files to Cloudinary
    const uploadResults = await uploadGigGallery(files, req.userId);

    // Separate thumbnails from other files
    const thumbnails = uploadResults
      .filter(result => result.width && result.height)
      .map(result => ({
        url: result.url,
        cloudinaryPublicId: result.publicId,
        width: result.width!,
        height: result.height!,
      }));

    const assetFiles = uploadResults.map(result => ({
      id: result.publicId,
      filename: files.find(f => f.originalname)?.originalname || 'unknown',
      url: result.url,
      type: result.resourceType === 'image' ? 'image' : 'preview',
      size: result.size,
      cloudinaryPublicId: result.publicId,
      uploadedAt: new Date(),
    }));

    // Generate asset ID
    const assetId = (Asset as any).generateAssetId();

    // Create asset record
    const asset = new Asset({
      assetId,
      sellerId: req.userId,
      name,
      description: description || '',
      type,
      category,
      subcategory,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
      price: parseFloat(price),
      currency: currency || 'credits',
      creditsPrice: creditsPrice ? parseFloat(creditsPrice) : undefined,
      files: assetFiles,
      thumbnails,
      isAdultContent: isAdultContent || false,
      status: 'uploaded',
      imvuStatus: 'pending',
      imvuSyncStatus: 'pending',
      moderationStatus: 'pending',
    });

    await asset.save();

    // Note: In production, you would call IMVU marketplace API here
    // to actually publish the asset to their platform

    res.status(201).json({
      ok: true,
      message: 'Asset uploaded successfully',
      asset: sanitizeAsset(asset),
    });
  } catch (error) {
    console.error('[avatarx-server] uploadAsset error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get user's uploaded assets
export async function getUserAssetsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { page = 1, limit = 20, status, category } = req.query;

    const query: any = { sellerId: req.userId };
    if (status) query.status = status;
    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);

    const [assets, total] = await Promise.all([
      Asset.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Asset.countDocuments(query),
    ]);

    res.json({
      ok: true,
      assets: assets.map(sanitizeAsset),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getUserAssets error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get asset details
export async function getAssetByIdHandler(req: Request, res: Response) {
  try {
    const { assetId } = req.params;

    const asset = await Asset.findOne({ assetId }).lean();

    if (!asset) {
      res.status(404).json({ ok: false, error: { message: 'Asset not found' } });
      return;
    }

    res.json({
      ok: true,
      asset: sanitizeAsset(asset),
    });
  } catch (error) {
    console.error('[avatarx-server] getAssetById error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Delete asset
export async function deleteAssetHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { assetId } = req.params;

    const asset = await Asset.findOne({ assetId });

    if (!asset) {
      res.status(404).json({ ok: false, error: { message: 'Asset not found' } });
      return;
    }

    // Check if user owns the asset
    if (asset.sellerId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    // Delete files from Cloudinary
    for (const file of asset.files) {
      if (file.cloudinaryPublicId) {
        try {
          await deleteFromCloudinary(file.cloudinaryPublicId);
        } catch (error) {
          console.error(`Failed to delete file ${file.cloudinaryPublicId}:`, error);
        }
      }
    }

    for (const thumbnail of asset.thumbnails) {
      try {
        await deleteFromCloudinary(thumbnail.cloudinaryPublicId);
      } catch (error) {
        console.error(`Failed to delete thumbnail ${thumbnail.cloudinaryPublicId}:`, error);
      }
    }

    // Delete asset from database
    await Asset.deleteOne({ assetId });

    res.json({
      ok: true,
      message: 'Asset deleted successfully',
    });
  } catch (error) {
    console.error('[avatarx-server] deleteAsset error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Sync asset with IMVU marketplace
export async function syncAssetToIMVUHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { assetId } = req.params;

    const asset = await Asset.findOne({ assetId });

    if (!asset) {
      res.status(404).json({ ok: false, error: { message: 'Asset not found' } });
      return;
    }

    if (asset.sellerId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    // Set pending sync state — a background job picks up pending items
    // and calls the IMVU Marketplace API. On success it updates to 'synced';
    // on failure it updates to 'failed' with error details.
    asset.imvuStatus = 'uploading';
    asset.imvuSyncStatus = 'pending';
    await asset.save();

    res.json({
      ok: true,
      message: 'Sync request submitted',
      asset: sanitizeAsset(asset),
    });
  } catch (error) {
    console.error('[avatarx-server] syncAssetToIMVU error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get all assets (public browse)
export async function getAllAssetsHandler(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, category, type, status = 'published' } = req.query;

    const query: any = { status, isPublished: true };
    if (category) query.category = category;
    if (type) query.type = type;

    const skip = (Number(page) - 1) * Number(limit);

    const [assets, total] = await Promise.all([
      Asset.find(query)
        .populate('sellerId', 'displayName avatar sellerLevel')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Asset.countDocuments(query),
    ]);

    res.json({
      ok: true,
      assets: assets.map(sanitizeAsset),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getAllAssets error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}
