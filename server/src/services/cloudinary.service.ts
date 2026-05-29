import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  resourceType: 'image' | 'video';
  format: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // for videos
  thumbnails?: string[]; // for videos
}

export interface CloudinaryUploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'auto';
  transformation?: any;
  eager?: any[]; // for generating thumbnails/transformations
  overwrite?: boolean;
  unique_filename?: boolean;
  use_filename?: boolean;
  filename_as_public_id?: boolean;
}

/**
 * Upload a file to Cloudinary
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const {
    folder = 'avatarx/gigs',
    resourceType = 'auto',
    transformation,
    eager,
    overwrite = true,
    unique_filename = true,
    use_filename = false,
    filename_as_public_id = false,
  } = options;

  try {
    const uploadOptions: any = {
      folder,
      resource_type: resourceType,
      overwrite,
      unique_filename: unique_filename,
      use_filename: use_filename,
      filename_as_public_id: filename_as_public_id,
    };

    // Add transformations if provided
    if (transformation) {
      uploadOptions.transformation = transformation;
    }

    // Add eager transformations for thumbnails (especially for videos)
    if (eager && eager.length > 0) {
      uploadOptions.eager = eager as any[];
    }

    let result: UploadApiResponse;

    if (typeof file === 'string') {
      // Upload from URL
      result = await cloudinary.uploader.upload(file, uploadOptions);
    } else {
      // Upload from buffer
      result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, uploadResult) => {
            if (error) reject(error);
            else resolve(uploadResult as UploadApiResponse);
          }
        ).end(file);
      });
    }

    // Extract thumbnails from eager transformations
    const thumbnails = result.eager?.map((e: any) => e.secure_url) || [];

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type as 'image' | 'video',
      format: result.format,
      size: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration, // for videos
      thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
    };
  } catch (error) {
    console.error('[avatarx-server] Cloudinary upload error:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'video' | 'auto' = 'auto'): Promise<void> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Failed to delete file: ${result.result}`);
    }
  } catch (error) {
    console.error('[avatarx-server] Cloudinary delete error:', error);
    throw new Error('Failed to delete file from Cloudinary');
  }
}

/**
 * Generate optimized image URL
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: number;
    format?: string;
  } = {}
): string {
  const {
    width,
    height,
    crop = 'fill',
    quality = 80,
    format = 'auto',
  } = options;

  const transformation: any = {
    quality,
    fetch_format: format,
  };

  if (width || height) {
    transformation.width = width;
    transformation.height = height;
    transformation.crop = crop;
  }

  return cloudinary.url(publicId, {
    transformation,
    secure: true,
  });
}

/**
 * Generate video thumbnail URL
 */
export function getVideoThumbnailUrl(publicId: string, options: {
  width?: number;
  height?: number;
  timeOffset?: string;
} = {}): string {
  const {
    width = 400,
    height = 300,
    timeOffset = '00:00:01',
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: [
      {
        width,
        height,
        crop: 'fill',
      },
      {
        start_offset: timeOffset,
      },
    ],
    secure: true,
    format: 'jpg',
  });
}

/**
 * Upload gig gallery images with automatic optimization
 */
export async function uploadGigGallery(
  files: Array<{ buffer: Buffer; originalname: string; mimetype: string }>,
  gigId: string
): Promise<CloudinaryUploadResult[]> {
  const uploadPromises = files.map(async (file, index) => {
    const isVideo = file.mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const uploadOptions: CloudinaryUploadOptions = {
      folder: `avatarx/gigs/${gigId}`,
      resourceType,
      use_filename: true,
      unique_filename: true,
    };

    // Add transformations for images
    if (!isVideo) {
      uploadOptions.transformation = {
        quality: 'auto:good',
        fetch_format: 'auto',
      };
    }

    // Generate thumbnails for videos
    if (isVideo) {
      uploadOptions.eager = [
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
      ];
    }

    return uploadToCloudinary(file.buffer, uploadOptions);
  });

  return Promise.all(uploadPromises);
}

/**
 * Delete entire gig gallery
 */
export async function deleteGigGallery(gigId: string): Promise<void> {
  try {
    const folder = `avatarx/gigs/${gigId}`;
    
    // Get all resources in the folder
    const resources = await cloudinary.search
      .expression(`folder:${folder}`)
      .execute();

    if (resources.resources.length === 0) {
      return; // No files to delete
    }

    // Delete all resources
    const deletePromises = resources.resources.map((resource: any) => {
      return deleteFromCloudinary(resource.public_id, resource.resource_type);
    });

    await Promise.all(deletePromises);
  } catch (error) {
    console.error('[avatarx-server] Failed to delete gig gallery:', error);
    throw new Error('Failed to delete gig gallery');
  }
}

/**
 * Validate Cloudinary configuration
 */
export function validateCloudinaryConfig(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export { cloudinary };
