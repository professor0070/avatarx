import { Router } from 'express';
import {
  createGigHandler,
  getGigsHandler,
  getGigByIdHandler,
  updateGigHandler,
  deleteGigHandler,
  toggleGigStatusHandler,
  getMyGigsHandler,
  getFeaturedGigsHandler,
  getGigsByIdsHandler,
  getGigReviewsHandler,
  getSimilarGigsHandler,
  getCategoriesHandler,
} from '../controllers/gig.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { adultContentGate } from '../middleware/adult.middleware';

export const gigRouter = Router();

// Public routes
gigRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'gig/status' });
});

gigRouter.get('/explore', getGigsHandler); // Browse gigs with filters
gigRouter.get('/featured', getFeaturedGigsHandler); // Get featured/trending gigs
gigRouter.get('/categories', getCategoriesHandler); // Get all categories
gigRouter.get('/list/by-ids', getGigsByIdsHandler); // Get gigs by comma-separated IDs
gigRouter.get('/my-gigs', authenticate, getMyGigsHandler); // Get current user's gigs
gigRouter.get('/:gigId/reviews', getGigReviewsHandler); // Get reviews for a gig
gigRouter.get('/:gigId/similar', getSimilarGigsHandler); // Get similar gigs
gigRouter.get('/:id', getGigByIdHandler); // Get gig by ID (with adult content check if needed)

// Protected routes (require authentication)
gigRouter.post('/create', authenticate, requireRole('seller', 'creator', 'admin', 'super_admin'), createGigHandler);
gigRouter.put('/:id', authenticate, updateGigHandler);
gigRouter.delete('/:id', authenticate, deleteGigHandler);
gigRouter.patch('/:id/status', authenticate, toggleGigStatusHandler); // pause/unpause/publish

// Adult content routes (require age verification and badges)
gigRouter.get('/adult/:id', authenticate, adultContentGate, getGigByIdHandler); // Adult gig details
gigRouter.patch('/adult/:id', authenticate, adultContentGate, updateGigHandler); // Update adult gig
