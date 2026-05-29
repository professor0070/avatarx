import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { StarRating } from '../../components/common/StarRating';
import { Heart, Search } from 'lucide-react';
import { useState } from 'react';

interface GigItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  tiers: { name: string; price: number; currency: string; deliveryTimeDays?: number }[];
  sellerDisplayName: string;
  sellerAvatar: string;
  sellerLevel: string;
  averageRating: number;
  totalReviews: number;
  tags: string[];
  isAdultContent: boolean;
}

export function WishlistPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'price_asc' | 'price_desc' | 'rating'>('date');

  const { data: wishlistData, isLoading } = useQuery({
    queryKey: ['wishlist-page'],
    queryFn: async () => {
      const res = await api.get('/api/search/wishlist');
      return res.data.wishlist as GigItem[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (gigId: string) => {
      await api.post('/api/search/wishlist/remove', { gigId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-page'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-ids'] });
    },
  });

  const formatPrice = (amount: number, currency = 'INR') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  const items = (wishlistData || [])
    .filter((g) =>
      !searchQuery ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.sellerDisplayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_asc': return (a.tiers?.[0]?.price || 0) - (b.tiers?.[0]?.price || 0);
        case 'price_desc': return (b.tiers?.[0]?.price || 0) - (a.tiers?.[0]?.price || 0);
        case 'rating': return (b.averageRating || 0) - (a.averageRating || 0);
        default: return 0;
      }
    });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Helmet>
        <title>My Wishlist | AvatarX</title>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">My Wishlist</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {items.length} {items.length === 1 ? 'gig' : 'gigs'} saved
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wishlist..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        >
          <option value="date">Date Added</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Rating</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-32 dark:border-slate-800">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900">
            <Heart className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
            {searchQuery ? 'No matches found' : 'Your wishlist is empty'}
          </h3>
          <p className="mt-2 text-slate-500">
            {searchQuery ? 'Try a different search term' : 'Save gigs you love by tapping the heart icon'}
          </p>
          {!searchQuery && (
            <Link
              to="/browse"
              className="mt-8 rounded-full bg-indigo-600 px-8 py-3 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Browse Gigs
            </Link>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((gig) => (
            <div
              key={gig._id}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="relative" onClick={() => navigate(`/gig/${gig._id}`)}>
                <div className="h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={gig.thumbnail || '/default-gig.png'}
                    alt={gig.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMutation.mutate(gig._id);
                  }}
                  disabled={removeMutation.isPending}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900"
                >
                  <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                </button>
              </div>

              <div className="p-4" onClick={() => navigate(`/gig/${gig._id}`)}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    {gig.sellerAvatar ? (
                      <img src={gig.sellerAvatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] font-medium text-slate-500">
                        {gig.sellerDisplayName?.[0]}
                      </span>
                    )}
                  </div>
                  <span className="truncate text-sm text-slate-600 dark:text-slate-400">
                    {gig.sellerDisplayName}
                  </span>
                </div>

                <h3 className="mb-1 text-sm font-semibold text-slate-900 line-clamp-2 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {gig.title}
                </h3>

                {gig.averageRating > 0 && (
                  <div className="mb-3">
                    <StarRating rating={gig.averageRating} size="sm" showCount count={gig.totalReviews} />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {formatPrice(gig.tiers?.[0]?.price || 0, gig.tiers?.[0]?.currency || 'INR')}
                  </span>
                  <span className="text-xs text-slate-500">
                    {(gig.tiers?.[0]?.deliveryTimeDays || 0) > 0
                      ? `${gig.tiers[0].deliveryTimeDays} days`
                      : 'Instant delivery'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
