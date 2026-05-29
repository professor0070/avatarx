import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

interface WishlistItem {
  id: string;
  gigId: string;
  gigTitle: string;
  gigDescription: string;
  gigCategory: string;
  gigPrice: number;
  gigCurrency: string;
  gigImage: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  sellerRating: number;
  addedAt: string;
}

export function WishlistManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
type SortOption = 'date_added' | 'price_low' | 'price_high' | 'rating';

  const [sortBy, setSortBy] = useState<SortOption>('date_added');

  // Fetch wishlist
  const { data: wishlistData, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const response = await api.get('/api/search/wishlist');
      return response.data;
    },
  });

  // Remove from wishlist mutation
  const removeFromWishlist = useMutation({
    mutationFn: async (gigId: string) => {
      await api.post('/api/search/wishlist/remove', { gigId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRemoveFromWishlist = (gigId: string) => {
    if (confirm('Are you sure you want to remove this item from your wishlist?')) {
      removeFromWishlist.mutate(gigId);
    }
  };

  const filteredAndSortedItems = wishlistData?.wishlist
    ?.filter((item: WishlistItem) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.gigTitle.toLowerCase().includes(query) ||
        item.gigDescription.toLowerCase().includes(query) ||
        item.sellerName.toLowerCase().includes(query) ||
        item.gigCategory.toLowerCase().includes(query)
      );
    })
    ?.sort((a: WishlistItem, b: WishlistItem) => {
      switch (sortBy) {
        case 'date_added':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'price_low':
          return a.gigPrice - b.gigPrice;
        case 'price_high':
          return b.gigPrice - a.gigPrice;
        case 'rating':
          return b.sellerRating - a.sellerRating;
        default:
          return 0;
      }
    }) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="animate-pulse">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          My Wishlist
        </h2>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {filteredAndSortedItems.length} items
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wishlist..."
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 pl-10 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" strokeWidth={1.1} />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        >
          <option value="date_added">Date Added</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="rating">Seller Rating</option>
        </select>
      </div>

      {/* Wishlist Items */}
      {filteredAndSortedItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-12 border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❤️</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            {searchQuery ? 'No items found' : 'Your wishlist is empty'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Start adding gigs to your wishlist to keep track of services you like'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/browse')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Browse Gigs
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedItems.map((item: WishlistItem) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Gig Image */}
              <div className="relative h-48 bg-slate-100 dark:bg-slate-700">
                <img
                  src={item.gigImage || '/default-gig.png'}
                  alt={item.gigTitle}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveFromWishlist(item.gigId)}
                  disabled={removeFromWishlist.isPending}
                  className="absolute top-2 right-2 p-2 bg-white dark:bg-slate-800 rounded-full shadow-md hover:shadow-lg transition-shadow"
                  title="Remove from wishlist"
                >
                  <X className="w-4 h-4 text-red-500" strokeWidth={1.1} />
                </button>
              </div>

              {/* Gig Info */}
              <div className="p-4">
                <div className="mb-3">
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {item.gigCategory}
                  </span>
                </div>
                
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                  {item.gigTitle}
                </h3>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                  {item.gigDescription}
                </p>

                {/* Seller Info */}
                <div className="flex items-center gap-2 mb-4">
                  <img
                    src={item.sellerAvatar || '/default-avatar.png'}
                    alt={item.sellerName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {item.sellerName}
                    </p>
                    {item.sellerRating > 0 && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {item.sellerRating.toFixed(1)}⭐
                      </p>
                    )}
                  </div>
                </div>

                {/* Price and Actions */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.gigPrice, item.gigCurrency)}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Added {formatDate(item.addedAt)}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/gig/${item.gigId}`)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    View Gig
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
