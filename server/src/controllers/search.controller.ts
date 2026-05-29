import type { Request, Response } from 'express';
import { Gig } from '../models/gig.model';
import type { AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/user.model';
import { escapeRegex } from '../utils/validation';

interface SearchSuggestion {
  type: 'gig' | 'category' | 'tag' | 'seller';
  text: string;
  count?: number;
  gigId?: string;
  sellerId?: string;
  category?: string;
}

interface SearchHistory {
  id: string;
  query: string;
  timestamp: Date;
  resultsCount: number;
}

export async function searchAutocompleteHandler(req: Request, res: Response) {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.json({ ok: true, suggestions: [] });
      return;
    }

    const searchTerm = q.trim().toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    // Search gigs by title
    const gigResults = await Gig.find({
      status: 'active',
      title: { $regex: escapeRegex(searchTerm), $options: 'i' }
    })
    .select('title sellerId sellerDisplayName category')
    .limit(5)
    .lean();

    gigResults.forEach((gig) => {
      suggestions.push({
        type: 'gig',
        text: gig.title as string,
        gigId: gig._id?.toString(),
        sellerId: gig.sellerId?.toString(),
        category: gig.category as string,
      });
    });

    // Search categories
    const categories = [
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
    ];

    const matchingCategories = categories.filter(cat =>
      cat.toLowerCase().includes(searchTerm)
    );

    matchingCategories.forEach((category) => {
      suggestions.push({
        type: 'category',
        text: category,
        category,
      });
    });

    // Search tags
    const tagResults = await Gig.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$tags' },
      { $match: { tags: { $regex: escapeRegex(searchTerm), $options: 'i' } } },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    tagResults.forEach((result) => {
      suggestions.push({
        type: 'tag',
        text: result._id,
        count: result.count,
      });
    });

    // Search sellers
    const sellerResults = await User.find({
      role: { $in: ['seller', 'admin'] },
      displayName: { $regex: escapeRegex(searchTerm), $options: 'i' }
    })
    .select('displayName avatar sellerLevel totalOrdersCompleted')
    .limit(3)
    .lean();

    sellerResults.forEach((seller) => {
      suggestions.push({
        type: 'seller',
        text: seller.displayName as string,
        sellerId: seller._id?.toString(),
      });
    });

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
      index === self.findIndex((s) => s.text === suggestion.text && s.type === suggestion.type)
    ).slice(0, 10);

    res.json({ ok: true, suggestions: uniqueSuggestions });

  } catch (error) {
    console.error('[avatarx-server] searchAutocomplete error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function getSearchHistoryHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await User.findById(req.userId).select('searchHistory');
    
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    const searchHistory = (user.searchHistory || [])
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    res.json({ ok: true, history: searchHistory });

  } catch (error) {
    console.error('[avatarx-server] getSearchHistory error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function saveSearchHistoryHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { query, resultsCount } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ ok: false, error: { message: 'Valid search query is required' } });
      return;
    }

    const trimmedQuery = query.trim();

    const searchEntry: SearchHistory = {
      id: Date.now().toString(),
      query: trimmedQuery,
      timestamp: new Date(),
      resultsCount: resultsCount || 0,
    };

    // Atomically: remove any existing entry with the same query (case-insensitive),
    // then push the new entry at position 0 and cap the array to the 50 most recent.
    // MongoDB applies $pull before $push, so the duplicate is removed first,
    // then the new entry is inserted and $slice keeps only the first 50.
    await User.updateOne(
      { _id: req.userId },
      {
        $pull: { searchHistory: { query: { $regex: `^${escapeRegex(trimmedQuery)}$`, $options: 'i' } } },
        $push: { searchHistory: { $each: [searchEntry], $position: 0, $slice: 50 } },
      },
    );

    res.json({ ok: true });

  } catch (error) {
    console.error('[avatarx-server] saveSearchHistory error:', error);
    res.status(500).json({
      ok: false,
      error: { message: 'Internal server error' },
    });
  }
}

export async function clearSearchHistoryHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    user.searchHistory = [];
    await user.save();

    res.json({ ok: true });

  } catch (error) {
    console.error('[avatarx-server] clearSearchHistory error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function getPopularSearchesHandler(req: Request, res: Response) {
  try {
    // Get popular searches from aggregated search history
    const popularSearches = await User.aggregate([
      { $unwind: '$searchHistory' },
      { $group: { _id: '$searchHistory.query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get popular categories
    const categoryCounts = await Gig.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // Get popular tags
    const tagCounts = await Gig.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      ok: true,
      data: {
        searches: popularSearches.map((item: any) => ({
          query: item._id,
          count: item.count,
        })),
        categories: categoryCounts.map((item: any) => ({
          category: item._id,
          count: item.count,
        })),
        tags: tagCounts.map((item: any) => ({
          tag: item._id,
          count: item.count,
        })),
      },
    });

  } catch (error) {
    console.error('[avatarx-server] getPopularSearches error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function getWishlistHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await User.findById(req.userId).populate('wishlist');
    
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    res.json({ ok: true, wishlist: user.wishlist });

  } catch (error) {
    console.error('[avatarx-server] getWishlist error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function addToWishlistHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { gigId } = req.body;

    if (!gigId) {
      res.status(400).json({ ok: false, error: { message: 'Gig ID is required' } });
      return;
    }

    // Verify gig exists
    const gig = await Gig.findById(gigId);
    if (!gig) {
      res.status(404).json({ ok: false, error: { message: 'Gig not found' } });
      return;
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    // Add to wishlist if not already present
    if (!user.wishlist.includes(gigId as any)) {
      user.wishlist.push(gigId as any);
      await user.save();
    }

    res.json({ ok: true });

  } catch (error) {
    console.error('[avatarx-server] addToWishlist error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

export async function removeFromWishlistHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { gigId } = req.body;

    if (!gigId) {
      res.status(400).json({ ok: false, error: { message: 'Gig ID is required' } });
      return;
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    // Remove from wishlist
    user.wishlist = user.wishlist.filter((id: any) => id.toString() !== gigId);
    await user.save();

    res.json({ ok: true });

  } catch (error) {
    console.error('[avatarx-server] removeFromWishlist error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}
