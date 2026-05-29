import { Router } from 'express';
import {
  createCustomOfferHandler,
  getReceivedOffersHandler,
  getSentOffersHandler,
  acceptOfferHandler,
  declineOfferHandler,
  deleteOfferHandler,
} from '../controllers/custom-offer.controller';
import { authenticate } from '../middleware/auth.middleware';

export const customOfferRouter = Router();

// Public routes
customOfferRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'custom-offer/status' });
});

// Protected routes (require authentication)
customOfferRouter.post('/', authenticate, createCustomOfferHandler);
customOfferRouter.get('/received', authenticate, getReceivedOffersHandler);
customOfferRouter.get('/sent', authenticate, getSentOffersHandler);
customOfferRouter.patch('/:offerId/accept', authenticate, acceptOfferHandler);
customOfferRouter.patch('/:offerId/decline', authenticate, declineOfferHandler);
customOfferRouter.delete('/:offerId', authenticate, deleteOfferHandler);
