import { Router } from 'express';
import {
  searchAutocompleteHandler,
  getSearchHistoryHandler,
  saveSearchHistoryHandler,
  clearSearchHistoryHandler,
  getPopularSearchesHandler,
  getWishlistHandler,
  addToWishlistHandler,
  removeFromWishlistHandler,
} from '../controllers/search.controller';
import { authenticate } from '../middleware/auth.middleware';

export const searchRouter = Router();

// Public routes
searchRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'search/status' });
});

searchRouter.get('/autocomplete', searchAutocompleteHandler);
searchRouter.get('/popular', getPopularSearchesHandler);

// Protected routes (require authentication)
searchRouter.get('/history', authenticate, getSearchHistoryHandler);
searchRouter.post('/history', authenticate, saveSearchHistoryHandler);
searchRouter.delete('/history', authenticate, clearSearchHistoryHandler);

// Wishlist routes
searchRouter.get('/wishlist', authenticate, getWishlistHandler);
searchRouter.post('/wishlist/add', authenticate, addToWishlistHandler);
searchRouter.post('/wishlist/remove', authenticate, removeFromWishlistHandler);
