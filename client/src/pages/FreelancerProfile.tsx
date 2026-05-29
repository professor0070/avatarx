import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface PortfolioItem {
  type: 'image' | 'video';
  url: string;
  title: string;
}

interface Gig {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail?: string;
  category?: string;
  currency?: string;
  tiers?: { price: number }[];
}

export function FreelancerProfilePage() {
  const { userId } = useParams();

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await api.get(`/api/users/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });

  const { data: gigsData } = useQuery({
    queryKey: ['user-gigs', userId],
    queryFn: async () => {
      const response = await api.get(`/api/gigs?sellerId=${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });

  const user = userData?.user;
  const gigs = gigsData?.gigs || [];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-slate-600 dark:text-slate-400">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Helmet>
        <title>{user.displayName} - AvatarX</title>
        <meta name="description" content={user.bio || 'IMVU Freelancer on AvatarX'} />
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-6">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.displayName}
              className="h-24 w-24 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {user.displayName}
                </h1>
                {user.verificationBadge && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    ✓ Verified
                  </span>
                )}
                {user.sellerLevel && (
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                    {user.sellerLevel}
                  </span>
                )}
              </div>
              <p className="mt-2 text-slate-600 dark:text-slate-400">{user.bio || 'No bio available'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.badges && user.badges.map((badge: string) => (
                  <span key={badge} className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-800">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{gigs.length}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Active Gigs</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-800">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">0</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Reviews</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-800">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">0%</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Rating</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-800">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{user.isAvailable ? 'Yes' : 'No'}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Available</p>
            </div>
          </div>
        </div>

        {/* Skills */}
        {user.skills && user.skills.length > 0 && (
          <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.skills.map((skill: string, idx: number) => (
                <span key={idx} className="rounded-md bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {user.languages && user.languages.length > 0 && (
          <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Languages</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.languages.map((lang: string, idx: number) => (
                <span key={idx} className="rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {user.portfolio && user.portfolio.length > 0 && (
          <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Portfolio</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {user.portfolio.map((item: PortfolioItem, idx: number) => (
                <div key={idx} className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-800">
                  {item.type === 'image' ? (
                    <img src={item.url} alt={item.title} className="h-40 w-full object-cover" />
                  ) : (
                    <video src={item.url} className="h-40 w-full object-cover" controls />
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Gigs */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Gigs</h2>
          {gigs.length === 0 ? (
            <p className="mt-3 text-slate-600 dark:text-slate-400">No active gigs</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              {gigs.map((gig: Gig) => (
                <div
                  key={gig.id}
                  onClick={() => window.location.href = `/gig/${gig.id}`}
                  className="cursor-pointer rounded-lg border border-slate-200 p-4 hover:border-indigo-500 dark:border-slate-800 dark:hover:border-indigo-500"
                >
                  <div className="flex gap-4">
                    <img
                      src={gig.thumbnail || '/default-gig.png'}
                      alt={gig.title}
                      className="h-20 w-20 rounded-md object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{gig.title}</h3>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{gig.category}</p>
                      <p className="mt-1 text-sm font-medium text-green-600 dark:text-green-400">
                        {gig.currency} {gig.tiers?.[0]?.price || 0}+
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
