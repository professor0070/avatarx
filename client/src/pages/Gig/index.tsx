import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { AdultContentGate } from '../../components/common/AdultContentGate';
import { GlassmorphismCard } from '../../components/GlassmorphismCard';
import { StarRating } from '../../components/common/StarRating';
import { SellerLevelBadge } from '../../components/common/SellerLevelBadge';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { Clock, Check, Heart } from 'lucide-react';
import { format } from 'date-fns';

// Type definitions
interface GigTier {
  name: string;
  price: number;
  currency: 'INR' | 'USD';
  deliveryTimeDays: number;
  description: string;
  revisions: number;
  features?: string[];
}

interface GigExtra {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'INR' | 'USD';
  deliveryTimeDays?: number;
}

interface GigMedia {
  url: string;
  type: 'image' | 'video';
  title?: string;
  order: number;
}

interface GigFAQ {
  question: string;
  answer: string;
  order: number;
}

interface Gig {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: 'product' | 'service' | 'both';
  category: string;
  isAdultContent: boolean;
  tags: string[];
  sellerId: string;
  sellerDisplayName: string;
  sellerAvatar: string;
  sellerLevel: string;
  sellerVerificationBadge: boolean;
  sellerRating: number;
  sellerTotalOrders: number;
  gallery: GigMedia[];
  thumbnail: string;
  tiers: GigTier[];
  extras: GigExtra[];
  deliveryType: 'instant' | 'manual';
  instantDownloadFiles?: string[];
  requirements?: {
    enabled: boolean;
    questions: string[];
  };
  requestToOrder: boolean;
  faqs: GigFAQ[];
  totalReviews: number;
  averageRating: number;
}

interface Review {
  rating: number;
  comment: string;
  submittedAt: string;
  buyer: {
    displayName: string;
    avatar: string | null;
  };
}

interface SimilarGig {
  id: string;
  title: string;
  thumbnail: string;
  sellerDisplayName: string;
  sellerAvatar: string | null;
  averageRating: number;
  totalReviews: number;
  currency: string;
  tiers: GigTier[];
}

export function GigPage() {
  const { gigId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Fetch gig details first
  const { data: gig, isLoading, error } = useQuery<Gig | null>({
    queryKey: ['gig', gigId],
    queryFn: async () => {
      if (!gigId) return null;
      const response = await api.get(`/api/gigs/${gigId}`);
      return response.data.gig;
    },
    enabled: !!gigId,
  });

  const queryClient = useQueryClient();
  const { addToRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    if (gigId) addToRecentlyViewed(gigId);
  }, [gigId, addToRecentlyViewed]);

  const { data: similarGigs } = useQuery<SimilarGig[]>({
    queryKey: ['similar-gigs', gigId],
    queryFn: async () => {
      if (!gigId) return [];
      const res = await api.get(`/api/gigs/${gigId}/similar`);
      return res.data.gigs || [];
    },
    enabled: !!gigId,
  });

  const { data: reviewsData } = useQuery<Review[]>({
    queryKey: ['gig-reviews', gigId],
    queryFn: async () => {
      if (!gigId) return [];
      const res = await api.get(`/api/gigs/${gigId}/reviews`);
      return res.data.reviews || [];
    },
    enabled: !!gigId,
  });

  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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
    return new Set<string>(wishlistData.map((g: { _id?: string; id?: string }) => g._id?.toString?.() || g.id?.toString() || ''));
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

  // Sync selectedTier when gig data loads
  useEffect(() => {
    if (gig?.tiers?.length && !selectedTier) {
      setSelectedTier(gig.tiers[0].name);
    }
  }, [gig, selectedTier]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const calculateTotalPrice = () => {
    if (!gig) return 0;
    
    const tier = gig.tiers.find((t: GigTier) => t.name === selectedTier);
    if (!tier) return 0;

    let total = tier.price;
    
    const extrasTotal = gig.extras
      .filter((extra: GigExtra) => selectedExtras.includes(extra.id))
      .reduce((sum: number, extra: GigExtra) => sum + extra.price, 0);

    return total + extrasTotal;
  };

  const handleOrder = () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!gig) return;

    const selectedTierData = gig.tiers.find((t: GigTier) => t.name === selectedTier);
    const orderData = {
      gigId: gig.id,
      tierName: selectedTier,
      extras: selectedExtras,
      totalPrice: calculateTotalPrice(),
      currency: selectedTierData?.currency || 'INR',
    };

    // Navigate to checkout with order data
    navigate(`/checkout?data=${encodeURIComponent(JSON.stringify(orderData))}`);
  };

  const renderStars = (rating: number) => {
    return <StarRating rating={rating} showCount count={gig?.totalReviews || 0} />;
  };

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          Gig not found or has been removed.
        </div>
      </div>
    );
  }

  if (isLoading || !gig) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 w-3/4 bg-slate-100 dark:bg-slate-800 rounded mb-4" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="h-64 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="mt-3 flex gap-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-6 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <Helmet>
        <title>{gig.title} | AvatarX</title>
        <meta name="description" content={gig.description.substring(0, 160)} />
      </Helmet>

      <AdultContentGate content={{ isAdultContent: gig.isAdultContent, category: gig.category }}>

        {/* ── Full-width Gallery ───────────────────────────────────────── */}
        <GlassmorphismCard className="mb-8">
          <div className="space-y-4">
            {/* Main viewer — full page width, 16:9 aspect ratio */}
            <div className="relative w-full">
              {gig.gallery[selectedImageIndex]?.type === 'video' ? (
                <video
                  src={gig.gallery[selectedImageIndex]?.url}
                  className="w-full aspect-video rounded-xl object-contain bg-black"
                  controls
                />
              ) : (
                <img
                  src={gig.gallery[selectedImageIndex]?.url || gig.thumbnail}
                  alt={gig.title}
                  loading="lazy"
                  className="w-full aspect-video rounded-xl object-cover"
                />
              )}
              {gig.isAdultContent && (
                <div className="absolute top-4 right-4 rounded-full bg-amber-600 px-3 py-1 text-sm font-medium text-white">
                  18+ Content
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {gig.gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {gig.gallery.map((media: GigMedia, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index
                        ? 'border-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {media.type === 'video' ? (
                      <video src={media.url} className="w-20 h-20 object-cover" muted />
                    ) : (
                      <img
                        src={media.url}
                        alt={`Gallery ${index + 1}`}
                        loading="lazy"
                        className="w-20 h-20 object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </GlassmorphismCard>

        {/* ── Details + Sidebar ─────────────────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gig Details */}
          <GlassmorphismCard>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              {gig.title}
            </h1>

            {/* Seller Info */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center">
                <img
                  src={gig.sellerAvatar || '/default-avatar.png'}
                  alt={gig.sellerDisplayName}
                  loading="lazy"
                  className="h-12 w-12 rounded-full mr-3"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {gig.sellerDisplayName}
                    </h3>
                    {gig.sellerVerificationBadge && (
                      <span className="text-indigo-600">✓</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <SellerLevelBadge level={gig.sellerLevel} />
                    <span>{gig.sellerTotalOrders} orders</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {user && (
                  <button
                    onClick={() => toggleWishlist.mutate(gig.id)}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-sm font-medium text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  >
                    <Heart className={`w-5 h-5 ${wishlistIds.has(gig.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                )}
                <button
                  onClick={() => navigate('/messages')}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  Contact Seller
                </button>
              </div>
            </div>

            {/* Rating */}
            {gig.totalReviews > 0 && (
              <div className="mb-6">
                {renderStars(gig.averageRating)}
              </div>
            )}

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                About This Gig
              </h2>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {gig.description}
                </p>
              </div>
            </div>

            {/* Tags */}
            {gig.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {gig.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm dark:bg-slate-800 dark:text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs */}
            {gig.faqs.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-4">
                  {gig.faqs.map((faq: GigFAQ, index: number) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 dark:border-slate-800">
                      <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                        {faq.question}
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviewsData && reviewsData.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Reviews ({reviewsData.length})
                </h3>
                <div className="space-y-4">
                  {reviewsData.map((review: Review, index: number) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 dark:border-slate-800">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden dark:bg-slate-800">
                          {review.buyer.avatar ? (
                            <img src={review.buyer.avatar} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-slate-500">{review.buyer.displayName[0]}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {review.buyer.displayName}
                          </p>
                          <StarRating rating={review.rating} size="sm" />
                        </div>
                        <span className="ml-auto text-xs text-slate-400">
                          {format(new Date(review.submittedAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassmorphismCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          <GlassmorphismCard className="sticky top-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Choose a Package
            </h2>

            {/* Tiers */}
            <div className="space-y-3 mb-6">
              {gig.tiers.map((tier: GigTier) => (
                <div
                  key={tier.name}
                  onClick={() => setSelectedTier(tier.name)}
                  className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedTier === tier.name
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {tier.name}
                    </h3>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatPrice(tier.price, tier.currency)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {tier.deliveryTimeDays} days
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {tier.description}
                  </p>
                  <div className="text-xs text-slate-500">
                    {tier.revisions} revisions included
                  </div>
                </div>
              ))}
            </div>

            {/* Extras */}
            {gig.extras.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                  Extras (Optional)
                </h3>
                <div className="space-y-2">
                  {gig.extras.map((extra: GigExtra) => (
                    <label key={extra.id} className="flex items-start">
                      <input
                        type="checkbox"
                        checked={selectedExtras.includes(extra.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExtras([...selectedExtras, extra.id]);
                          } else {
                            setSelectedExtras(selectedExtras.filter(id => id !== extra.id));
                          }
                        }}
                        className="mt-1 mr-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-950"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {extra.name}
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {formatPrice(extra.price, extra.currency)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {extra.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Total Price */}
            <div className="border-t border-slate-200 pt-4 mb-6 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  Total
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatPrice(calculateTotalPrice(), gig.tiers.find((t: GigTier) => t.name === selectedTier)?.currency || 'INR')}
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              {gig.requestToOrder ? (
                <button
                  onClick={handleOrder}
                  className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  Request to Order
                </button>
              ) : (
                <button
                  onClick={handleOrder}
                  className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  Continue ({formatPrice(calculateTotalPrice(), gig.tiers.find((t: GigTier) => t.name === selectedTier)?.currency || 'INR')})
                </button>
              )}

              <button
                onClick={() => navigate('/messages')}
                className="w-full rounded-lg border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                Contact Seller
              </button>
            </div>

            {/* Delivery Info */}
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4" strokeWidth={1.1} />
                {gig.deliveryType === 'instant' ? 'Instant delivery' : `${gig.tiers.find((t: GigTier) => t.name === selectedTier)?.deliveryTimeDays} days delivery`}
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" strokeWidth={1.1} />
                {gig.tiers.find((t: GigTier) => t.name === selectedTier)?.revisions} revisions included
              </div>
            </div>
          </GlassmorphismCard>
        </div>
        </div>{/* end Details+Sidebar grid */}

      {/* Similar Gigs */}
      {similarGigs && similarGigs.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Similar Gigs</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similarGigs.map((sg: SimilarGig) => (
              <div
                key={sg.id}
                onClick={() => navigate(`/gig/${sg.id}`)}
                className="group cursor-pointer rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative overflow-hidden rounded-t-xl">
                  <img
                    src={sg.thumbnail || '/placeholder.svg'}
                    alt={sg.title}
                    loading="lazy"
                    className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden dark:bg-slate-800">
                      {sg.sellerAvatar ? (
                        <img src={sg.sellerAvatar} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500">{sg.sellerDisplayName?.[0]}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{sg.sellerDisplayName}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {sg.title}
                  </h3>
                  {sg.totalReviews > 0 && (
                    <div className="mt-2">
                      <StarRating rating={sg.averageRating || 0} size="sm" showCount count={sg.totalReviews} />
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {sg.currency || 'INR'} {sg.tiers?.[0]?.price?.toLocaleString() || 0}
                    </span>
                    <span className="text-xs text-slate-500">{sg.tiers?.[0]?.deliveryTimeDays || 0} days</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </AdultContentGate>
    </div>
  );
}

