import { Router } from 'express';
import {
  uploadAssetHandler,
  getUserAssetsHandler,
  getAssetByIdHandler,
  deleteAssetHandler,
  syncAssetToIMVUHandler,
  getAllAssetsHandler,
} from '../controllers/asset.controller';
import { authenticate } from '../middleware/auth.middleware';

export const assetRouter = Router();

// Public routes
assetRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'asset/status' });
});

// Public route - browse all published assets
assetRouter.get('/browse', getAllAssetsHandler);

// Protected routes (require authentication)
assetRouter.get('/my-assets', authenticate, getUserAssetsHandler);
assetRouter.post('/upload', authenticate, uploadAssetHandler);

// Public route - get asset details by ID
assetRouter.get('/:assetId', getAssetByIdHandler);
assetRouter.post('/:assetId/sync-imvu', authenticate, syncAssetToIMVUHandler);
assetRouter.delete('/:assetId', authenticate, deleteAssetHandler);
