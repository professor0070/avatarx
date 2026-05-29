import { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { SearchSuggestions } from '../components/search/SearchSuggestions';
import { GlassmorphismCard } from '../components/GlassmorphismCard';
import { StarRating } from '../components/common/StarRating';
import { SellerLevelBadge } from '../components/common/SellerLevelBadge';
import { Heart } from 'lucide-react';

type GigCategory = 
  | 'Game Credits'
  | 'Adult Triggers Male'
  | 'Adult Triggers Female'
  | 'Adult Rooms'
  | 'Outfits Male'
  | 'Outfits Female'
  | 'Badges'
  | 'Room Decoration'
  | 'Adult Triggers Making'
  | 'Brand Ambassador Management'
  | 'Agency Management'
  | 'Instagram Reels'
  | 'Marriage Videographer'
  | 'Photo Editor'
  | 'Custom Services';

type GigType = 'product' | 'service' | 'both';
type SortOption = 'createdAt' | 'price' | 'rating' | 'orders';

interface Gig {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: GigType;
  category: GigCategory;
  isAdultContent: boolean;
  tags: string[];
  sellerId: string;
  sellerDisplayName: string;
  sellerAvatar: string;
  sellerLevel: string;
  sellerVerificationBadge: boolean;
  sellerRating: number;
  sellerTotalOrders: number;
  thumbnail: string;
  tiers: Array<{
    name: string;
    price: number;
    currency: string;
    deliveryTimeDays: number;
  }>;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
}

const categories: GigCategory[] = [
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

const adultCategories = [
  'Adult Triggers Male',
  'Adult Triggers Female',
  'Adult Rooms',
  'Adult Triggers Making',
];

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get filter values from URL params
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const type = searchParams.get('type') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const deliveryTime = searchParams.get('deliveryTime') || '';
  const sellerLevel = searchParams.get('sellerLevel') || '';
  const sort = searchParams.get('sort') || 'createdAt';
  const order = searchParams.get('order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1');
  const isAdultContent = searchParams.get('isAdultContent') === 'true';

  // Local state for filters
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    search,
    category,
    type,
    minPrice,
    maxPrice,
    deliveryTime,
    sellerLevel,
    sort,
    order,
    isAdultContent,
    page: page.toString(),
    tags: '',
    minRating: '',
    hasReviews: '',
    onlineOnly: '',
    verifiedOnly: '',
    instantDelivery: '',
  });

  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // Fetch gigs
  const { data: gigsData, isLoading, error } = useQuery({
    queryKey: ['gigs', searchParams.toString()],
    queryFn: async () => {
      const params = new URLSearchParams(searchParams);
      const response = await api.get(`/api/gigs/explore?${params.toString()}`);
      return response.data;
    },
  });

  // Fetch wishlist
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist-ids'],
    queryFn: async () => {
      const res = await api.get('/api/search/wishlist');
      return res.data.wishlist || [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const wishlistIds = useMemo(() => {
    if (!wishlistData) return new Set<string>();
    return new Set<string>(wishlistData.map((g: { _id: string; id?: string }) => g._id?.toString?.() || g.id));
  }, [wishlistData]);

  const toggleWishlist = useMutation({
    mutationFn: async (gigId: string) => {
      if (wishlistIds.has(gigId)) {
        await api.post('/api/search/wishlist/remove', { gigId });
      } else {
        await api.post('/api/search/wishlist/add', { gigId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-ids'] });
    },
  });

  const updateFilters = useCallback((newFilters: Partial<typeof localFilters>) => {
    const updated = { ...localFilters, ...newFilters };
    setLocalFilters(updated);

    // Update URL params
    const params = new URLSearchParams();
    Object.entries(updated).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value.toString());
      }
    });
    setSearchParams(params);
  }, [localFilters, setSearchParams]);

  const handleSearch = useCallback(() => {
    updateFilters({ search: localFilters.search });
  }, [localFilters.search, updateFilters]);

  const handleCategoryChange = useCallback((newCategory: string) => {
    const isAdult = adultCategories.includes(newCategory);
    updateFilters({ category: newCategory, isAdultContent: isAdult });
  }, [updateFilters]);

  const handleSortChange = useCallback((newSort: SortOption, newOrder: 'asc' | 'desc') => {
    updateFilters({ sort: newSort, order: newOrder });
  }, [updateFilters]);

  const handlePageChange = useCallback((newPage: number) => {
    updateFilters({ page: newPage.toString() });
  }, [updateFilters]);

  const clearFilters = useCallback(() => {
    setLocalFilters({
      search: '',
      category: '',
      type: '',
      minPrice: '',
      maxPrice: '',
      deliveryTime: '',
      sellerLevel: '',
      sort: 'createdAt',
      order: 'desc',
      isAdultContent: false,
      page: '1',
      tags: '',
      minRating: '',
      hasReviews: '',
      onlineOnly: '',
      verifiedOnly: '',
      instantDelivery: '',
    });
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const formatPrice = useCallback((price: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  }, []);

  const renderStars = useCallback((rating: number, totalReviews: number) => {
    return <StarRating rating={rating} showCount count={totalReviews} />;
  }, []);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          Failed to load gigs. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <Helmet>
        <title>Browse Gigs | AvatarX</title>
        <meta name="description" content="Find the perfect gig for your metaverse needs on AvatarX" />
      </Helmet>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
          Browse Gigs
        </h1>
        
        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="flex-1">
            <SearchSuggestions
              value={localFilters.search}
              onChange={(value) => setLocalFilters(prev => ({ ...prev, search: value }))}
              onSelect={() => handleSearch()}
              placeholder="Search gigs, categories, sellers..."
              showHistory={true}
              showPopular={true}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-lg border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            {showFilters ? 'Hide Filters' : 'Filters'}
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-80 flex-shrink-0">
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-6">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    value={localFilters.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Gig Type
                  </label>
                  <div className="space-y-2">
                    {(['product', 'service', 'both'] as GigType[]).map((typeOption) => (
                      <label key={typeOption} className="flex items-center">
                        <input
                          type="radio"
                          value={typeOption}
                          checked={localFilters.type === typeOption}
                          onChange={(e) => updateFilters({ type: e.target.value })}
                          className="mr-2"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                          {typeOption}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Price Range (₹)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={localFilters.minPrice}
                      onChange={(e) => updateFilters({ minPrice: e.target.value })}
                      placeholder="Min"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <input
                      type="number"
                      value={localFilters.maxPrice}
                      onChange={(e) => updateFilters({ maxPrice: e.target.value })}
                      placeholder="Max"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Delivery Time */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Max Delivery Time
                  </label>
                  <select
                    value={localFilters.deliveryTime}
                    onChange={(e) => updateFilters({ deliveryTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="">Any</option>
                    <option value="1">1 day</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </select>
                </div>

                {/* Seller Level */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Seller Level
                  </label>
                  <select
                    value={localFilters.sellerLevel}
                    onChange={(e) => updateFilters({ sellerLevel: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="">Any</option>
                    <option value="new">New Seller</option>
                    <option value="level1">Level 1</option>
                    <option value="level2">Level 2</option>
                    <option value="top_rated">Top Rated</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>

                {/* Adult Content */}
                {localFilters.isAdultContent && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      Adult Content Filtered
                    </div>
                    <div className="text-xs text-amber-900/80 dark:text-amber-100/80 mt-1">
                      Showing only adult content gigs
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          {/* Sort Options */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {isLoading ? 'Loading...' : gigsData && (
                <>
                  Showing {gigsData.pagination.total} gigs
                  {gigsData.pagination.total > 0 && (
                    <span> (Page {gigsData.pagination.page} of {gigsData.pagination.pages})</span>
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Sort by:</span>
              <select
                value={`${localFilters.sort}-${localFilters.order}`}
                onChange={(e) => {
                  const [sort, order] = e.target.value.split('-');
                  handleSortChange(sort as SortOption, order as 'asc' | 'desc');
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Highest Rated</option>
                <option value="rating-asc">Lowest Rated</option>
                <option value="orders-desc">Most Orders</option>
                <option value="orders-asc">Fewest Orders</option>
              </select>
            </div>
          </div>

          {/* Gig Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="h-40 w-full rounded-lg bg-slate-100 dark:bg-slate-800 mb-4 animate-pulse" />
                  <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 mb-2 animate-pulse" />
                  <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 mb-4 animate-pulse" />
                  <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ))}
            </div>
          ) : gigsData?.gigs?.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gigsData.gigs.map((gig: Gig) => (
                  <GlassmorphismCard key={gig.id} className="cursor-pointer">
                    <div onClick={() => navigate(`/gig/${gig.id}`)}>
                      {/* Thumbnail */}
                      <div className="relative mb-4">
                        <img
                          src={gig.thumbnail}
                          alt={gig.title}
                          loading="lazy"
                          className="h-40 w-full rounded-lg object-cover"
                        />
                        {gig.isAdultContent && (
                          <div className="absolute top-2 left-2 rounded-full bg-amber-600 px-2 py-1 text-xs font-medium text-white">
                            18+
                          </div>
                        )}
                        {user && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleWishlist.mutate(gig.id); }}
                            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                wishlistIds.has(gig.id)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-slate-600 dark:text-slate-300'
                              }`}
                              strokeWidth={1.1}
                            />
                          </button>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                        {gig.title}
                      </h3>

                      {/* Seller Info */}
                      <div className="flex items-center mb-3">
                        {gig.sellerAvatar ? (
                          <img
                            src={gig.sellerAvatar}
                            alt={gig.sellerDisplayName}
                            loading="lazy"
                            className="h-6 w-6 rounded-full mr-2"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full mr-2 bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            {gig.sellerDisplayName?.[0] || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                            {gig.sellerDisplayName}
                          </p>
                          <div className="flex items-center gap-2">
                            <SellerLevelBadge level={gig.sellerLevel} />
                            {gig.sellerVerificationBadge && (
                              <span className="text-xs text-indigo-600">✓</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rating */}
                      {gig.totalReviews > 0 && (
                        <div className="mb-3">
                          {renderStars(gig.averageRating, gig.totalReviews)}
                        </div>
                      )}

                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold text-slate-900 dark:text-white">
                            {formatPrice(gig.tiers[0]?.price || 0, gig.tiers[0]?.currency || 'INR')}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">
                            {gig.tiers[0]?.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {gig.tiers[0]?.deliveryTimeDays} days
                        </div>
                      </div>

                      {/* Tags */}
                      {gig.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {gig.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded dark:bg-slate-800 dark:text-slate-400"
                            >
                              {tag}
                            </span>
                          ))}
                          {gig.tags.length > 3 && (
                            <span className="text-xs text-slate-500">
                              +{gig.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </GlassmorphismCard>
                ))}
              </div>

              {/* Pagination */}
              {gigsData.pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: gigsData.pagination.pages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium ${
                        pageNum === page
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= gigsData.pagination.pages}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-slate-600 dark:text-slate-400 mb-4">
                No gigs found matching your criteria.
              </div>
              <button
                onClick={clearFilters}
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
