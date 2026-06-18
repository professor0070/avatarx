import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Hero } from '../components/Hero';
import { VideoSection } from '../components/VideoSection';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useAuthStore } from '../store/authStore';

interface FeaturedGig {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  sellerName: string;
  sellerAvatar: string;
  sellerRating: number;
  sellerLevel: string;
  thumbnail: string;
  tags: string[];
  isAdultContent: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  gigCount: number;
}

interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  testimonial: string;
  date: string;
}

export function HomePage() {
  const navigate = useNavigate();
  const { recentlyViewedIds } = useRecentlyViewed();
  const { activeMode } = useAuthStore();

  const [showWakeupMessage, setShowWakeupMessage] = useState(false);

  // Fetch featured gigs
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['featured-gigs'],
    queryFn: async () => {
      const response = await api.get('/api/gigs/featured');
      return response.data;
    },
  });

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/api/gigs/categories');
      return response.data;
    },
  });

  // Fetch testimonials
  const { data: testimonialsData, isLoading: testimonialsLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const response = await api.get('/api/content/testimonials');
      return response.data;
    },
  });

  // Fetch recently viewed gigs
  const recentlyViewedQuery = useQuery({
    queryKey: ['recently-viewed', recentlyViewedIds],
    queryFn: async () => {
      if (recentlyViewedIds.length === 0) return { gigs: [] };
      const response = await api.get('/api/gigs/list/by-ids', {
        params: { ids: recentlyViewedIds.join(',') },
      });
      return response.data;
    },
    enabled: recentlyViewedIds.length > 0,
  });

  const isAnyLoading = featuredLoading || categoriesLoading || testimonialsLoading;

  useEffect(() => {
    let timer: any;
    if (isAnyLoading) {
      timer = setTimeout(() => {
        setShowWakeupMessage(true);
      }, 3000);
    } else {
      setShowWakeupMessage(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAnyLoading]);

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

  const featuredGigs = featuredData?.gigs || [];
  const categories = categoriesData?.categories || [];
  const testimonials = testimonialsData?.testimonials || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Helmet>
        <title>AvatarX - Virtual Freelance Marketplace | Hire Virtual Talent</title>
        <meta name="description" content="Hire talented virtual creators for custom 3D models, textures, rooms, outfits, and more. Safe payments with escrow protection." />
        <meta name="keywords" content="Virtual, freelance, marketplace, 3D models, textures, rooms, outfits, custom services, hire talent" />
        <link rel="canonical" href="https://avatarx-client.vercel.app" />
      </Helmet>

      {/* Hero Section */}
      <Hero />

      {/* Dynamic Server Wake-Up Alert */}
      {showWakeupMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-indigo-700 dark:border-indigo-950/30 dark:bg-indigo-950/20 dark:text-indigo-300 animate-fade-in flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
            <div>
              <p className="font-semibold text-sm">Waking up the server...</p>
              <p className="text-xs opacity-90 mt-0.5">The backend is hosted on a free Render tier and is waking up. The homepage content will load automatically once the server responds.</p>
            </div>
          </div>
        </div>
      )}

      {/* Popular Categories - Fiverr Style */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div className="text-center flex-1">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Popular Services
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Explore our most sought-after Virtual services
              </p>
            </div>
            {activeMode === 'creator' && (
              <button
                onClick={() => navigate('/create-gig')}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Create Gig
              </button>
            )}
          </div>

          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center p-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse mb-3" />
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {categories.map((category: Category) => (
                <button
                  key={category.id}
                  onClick={() => navigate(`/browse?category=${category.id}`)}
                  className="group flex flex-col items-center p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                    {category.icon}
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white text-center">
                    {category.name}
                  </h3>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Gigs - Fiverr Style Carousel */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Featured Gigs
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Top-rated services from verified creators
              </p>
            </div>
            <button
              onClick={() => navigate('/browse')}
              className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
            >
              View All
            </button>
          </div>

          {featuredLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
                  <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
                  <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : (
            featuredGigs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredGigs.slice(0, 8).map((gig: FeaturedGig) => (
                  <div
                    key={gig.id}
                    onClick={() => navigate(`/gig/${gig.id}`)}
                    className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                  >
                    {/* Gig Image */}
                    <div className="relative h-40 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <img
                        src={gig.thumbnail || '/default-gig.png'}
                        alt={gig.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {gig.isAdultContent && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded">
                          18+
                        </div>
                      )}
                    </div>

                    {/* Gig Info */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {gig.sellerAvatar ? (
                          <img
                            src={gig.sellerAvatar}
                            alt={gig.sellerName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            {gig.sellerName?.[0] || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {gig.sellerName}
                          </p>
                        </div>
                        {gig.sellerRating > 0 && (
                          <div className="flex items-center gap-1 text-sm text-yellow-500">
                            <span className="font-semibold">{gig.sellerRating.toFixed(1)}</span>
                            <span className="text-xs">★</span>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2 text-sm">
                        {gig.title}
                      </h3>
                      
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCurrency(gig.price, gig.currency)}
                        </p>
                        <span className="text-xs text-slate-500">
                          Level {gig.sellerLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {!featuredLoading && featuredGigs.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                No featured gigs yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                Explore our categories and find verified virtual talent for your next project.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button
                  onClick={() => navigate('/browse')}
                  className="px-6 py-3 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Browse Services
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Top Sellers — only shown when there is data */}
      {featuredGigs.length > 0 && (
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Top Sellers
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Meet our top-rated Virtual creators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredGigs.slice(0, 4).map((gig: FeaturedGig, index: number) => (
              <div
                key={`seller-${gig.sellerName}-${index}`}
                className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="relative w-20 h-20 mx-auto mb-4">
                  {gig.sellerAvatar ? (
                    <img
                      src={gig.sellerAvatar}
                      alt={gig.sellerName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-2xl font-medium text-indigo-600 dark:text-indigo-400">
                      {gig.sellerName?.[0] || '?'}
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-slate-700 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
                
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  {gig.sellerName}
                </h3>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Level {gig.sellerLevel} Seller
                </p>
                
                {gig.sellerRating > 0 && (
                  <div className="flex items-center justify-center gap-1 mb-3">
                    <span className="font-semibold text-yellow-500">{gig.sellerRating.toFixed(1)}</span>
                    <span className="text-yellow-500">★</span>
                  </div>
                )}
                
                <button
                  onClick={() => navigate(`/browse?seller=${gig.sellerName}`)}
                  className="w-full px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors"
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}


      {/* Trust Badges - Fiverr Style */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Why Choose AvatarX?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Trusted by thousands of users worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Secure Payments
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Escrow protection ensures your payment is safe until you're satisfied
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⭐</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Verified Sellers
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                All sellers are verified for quality and reliability
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                24/7 Support
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Our support team is always here to help you
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Fast Delivery
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Get your custom virtual content delivered on time
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      {recentlyViewedQuery.data?.gigs?.length > 0 && (
        <section className="py-16 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Recently Viewed
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  Pick up where you left off
                </p>
              </div>
              <button
                onClick={() => navigate('/browse')}
                className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentlyViewedQuery.data.gigs.map((gig: FeaturedGig) => (
                <div
                  key={gig.id}
                  onClick={() => navigate(`/gig/${gig.id}`)}
                  className="bg-slate-50 dark:bg-slate-700 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                >
                  <div className="relative h-40 bg-slate-100 dark:bg-slate-600 overflow-hidden">
                    <img
                      src={gig.thumbnail || '/default-gig.png'}
                      alt={gig.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {gig.sellerAvatar ? (
                        <img
                          src={gig.sellerAvatar}
                          alt={gig.sellerName}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          {gig.sellerName?.[0] || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {gig.sellerName}
                        </p>
                      </div>
                    </div>

                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2 text-sm">
                      {gig.title}
                    </h3>

                    <div className="flex items-center justify-between mt-3">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatCurrency(gig.price, gig.currency)}
                      </p>
                      <span className="text-xs text-slate-500">
                        {gig.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials & Social Proof - Fiverr Style */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Trusted by our Community
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              See what our users say about their experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonialsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-600" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-600 rounded" />
                      <div className="h-3 w-16 bg-slate-200 dark:bg-slate-600 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-600 rounded mb-2" />
                  <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-600 rounded" />
                </div>
              ))}
            </div>
          ) : (
            testimonials.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {testimonials.map((testimonial: Testimonial) => (
                  <div key={testimonial.id} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-sky-500/20 border border-sky-400 text-sky-400 flex items-center justify-center font-bold text-lg">
                        {testimonial.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          {testimonial.name}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {testimonial.role}
                        </p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={`text-lg ${
                                i < Math.floor(testimonial.rating) ? 'text-yellow-400' : 'text-slate-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 italic">
                      "{testimonial.testimonial}"
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {formatDate(testimonial.date)}
                    </p>
                  </div>
                ))}
              </div>
            )
          )}
          </div>

          {!testimonialsLoading && testimonials.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                Join Our Growing Community
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Be part of the future of the virtual freelance marketplace
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Get Started Today
              </button>
            </div>
          )}
        </div>
      </section>

      <VideoSection />
    </div>
  );
}
