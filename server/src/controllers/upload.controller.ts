import type { Request, Response } from 'express';
import multer from 'multer';
import type { AuthRequest } from '../middleware/auth.middleware';
import { uploadToCloudinary, type CloudinaryUploadResult } from '../services/cloudinary.service';
import { Gig } from '../models/gig.model';
import { User } from '../models/user.model';

// Extend AuthRequest to include file properties from multer
interface UploadRequest extends AuthRequest {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images and videos
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
    files: 10, // Max 10 files at once
  },
  fileFilter,
});

export async function uploadGigMediaHandler(req: Request, res: Response) {
  const uploadReq = req as UploadRequest;
  try {
    if (!(req as AuthRequest).userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const files = uploadReq.files;
    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ ok: false, error: { message: 'No files provided' } });
      return;
    }

    const { gigId } = req.body;

    // Upload files to Cloudinary
    const uploadPromises = files.map(async (file: Express.Multer.File) => {
      const isVideo = file.mimetype.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';

      const folder = gigId ? `avatarx/gigs/${gigId}` : `avatarx/temp/${(req as AuthRequest).userId}`;

      return uploadToCloudinary(file.buffer, {
        folder,
        resourceType,
        use_filename: true,
        unique_filename: true,
        transformation: isVideo ? undefined : {
          quality: 'auto:good',
          fetch_format: 'auto',
        },
        eager: isVideo ? [
          {
            width: 400,
            height: 300,
            crop: 'fill',
            format: 'jpg',
            start_offset: '00:00:01',
          },
          {
            width: 800,
            height: 600,
            crop: 'fill',
            format: 'jpg',
            start_offset: '00:00:01',
          },
        ] : undefined,
      });
    });

    const results = await Promise.all(uploadPromises);

    res.status(201).json({
      ok: true,
      files: results,
    });

  } catch (error) {
    console.error('[avatarx-server] uploadGigMedia error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Invalid file type')) {
        res.status(400).json({ ok: false, error: { message: error.message } });
      } else if (error.message.includes('File too large')) {
        res.status(400).json({ ok: false, error: { message: 'File size exceeds 25MB limit' } });
      } else {
        res.status(500).json({ ok: false, error: { message: 'Failed to upload files' } });
      }
    } else {
      res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
    }
  }
}

export async function uploadAvatarHandler(req: Request, res: Response) {
  const uploadReq = req as UploadRequest;
  try {
    if (!(req as AuthRequest).userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    if (!uploadReq.file) {
      res.status(400).json({ ok: false, error: { message: 'No file provided' } });
      return;
    }

    // Only allow images for avatars
    if (!uploadReq.file.mimetype.startsWith('image/')) {
      res.status(400).json({ ok: false, error: { message: 'Only images are allowed for avatars' } });
      return;
    }

    // Upload to Cloudinary with avatar-specific settings
    const result = await uploadToCloudinary(uploadReq.file.buffer, {
      folder: `avatarx/avatars/${(req as AuthRequest).userId}`,
      resourceType: 'image',
      use_filename: true,
      unique_filename: true,
      transformation: {
        width: 200,
        height: 200,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto:good',
        fetch_format: 'auto',
      },
    });

    // Update user's avatar URL in database
    await User.findByIdAndUpdate((req as AuthRequest).userId, { avatar: result.url });

    res.status(201).json({
      ok: true,
      avatar: result.url,
    });

  } catch (error) {
    console.error('[avatarx-server] uploadAvatar error:', error);
    res.status(500).json({ ok: false, error: { message: 'Failed to upload avatar' } });
  }
}

export async function uploadPortfolioHandler(req: Request, res: Response) {
  const uploadReq = req as UploadRequest;
  try {
    if (!(req as AuthRequest).userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const files = uploadReq.files;
    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ ok: false, error: { message: 'No files provided' } });
      return;
    }

    // Upload files to Cloudinary
    const uploadPromises = files.map(async (file: Express.Multer.File) => {
      const isVideo = file.mimetype.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';

      return uploadToCloudinary(file.buffer, {
        folder: `avatarx/portfolio/${(req as AuthRequest).userId}`,
        resourceType,
        use_filename: true,
        unique_filename: true,
        transformation: isVideo ? undefined : {
          quality: 'auto:good',
          fetch_format: 'auto',
        },
        eager: isVideo ? [
          {
            width: 400,
            height: 300,
            crop: 'fill',
            format: 'jpg',
            start_offset: '00:00:01',
          },
        ] : undefined,
      });
    });

    const results = await Promise.all(uploadPromises);

    res.status(201).json({
      ok: true,
      files: results,
    });

  } catch (error) {
    console.error('[avatarx-server] uploadPortfolio error:', error);
    res.status(500).json({ ok: false, error: { message: 'Failed to upload portfolio files' } });
  }
}
