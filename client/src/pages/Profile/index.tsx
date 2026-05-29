import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

type SellerLevel = 'new' | 'level1' | 'level2' | 'top_rated' | 'pro';
type BadgeType = 'AP' | 'VIP' | 'Marriage Pack' | 'Age Verified';

interface FullProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  imvuId: string | null;
  imvuUsername: string;
  credits: number;
  role: string;
  avatar: string;
  badges: BadgeType[];
  sellerLevel: SellerLevel;
  isEmailVerified: boolean;
  isAgeVerified: boolean;
  isCloudinaryVerified: boolean;
  isIdVerified: boolean;
  isProfileVerified: boolean;
  verificationBadge: boolean;
  isAvailable: boolean;
  outOfOfficeUntil: string | null;
  outOfOfficeMessage: string;
  isOnline: boolean;
  lastSeen: string | null;
  bio: string;
  skills: string[];
  languages: string[];
  certifications: string[];
  portfolio: { url: string; type: 'image' | 'video'; title: string }[];
  totalOrdersCompleted?: number;
  totalEarnedINR?: number;
  totalEarnedUSD?: number;
  crWalletBalance?: number;
  successScore?: number;
  responseRate?: number;
  avgResponseTimeMinutes?: number;
  profileCompleteness?: number;
  createdAt: string;
  updatedAt: string;
}

const sellerLevelLabels: Record<SellerLevel, string> = {
  new: 'New Seller',
  level1: 'Level 1',
  level2: 'Level 2',
  top_rated: 'Top Rated',
  pro: 'Pro',
};

const sellerLevelColors: Record<SellerLevel, string> = {
  new: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  level1: 'bg-bronze-100 text-bronze-700 dark:bg-bronze-900/20 dark:text-bronze-400',
  level2: 'bg-silver-100 text-silver-700 dark:bg-silver-900/20 dark:text-silver-400',
  top_rated: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
};

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-24 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="flex-1">
            <div className="h-6 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="mt-4 h-2 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="mt-3 h-6 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-profile', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return null;
      const res = await api.get(`/api/users/${authUser.id}`);
      return res.data as { ok: boolean; user: FullProfile };
    },
    enabled: !!authUser?.id,
  });

  const profile: FullProfile | null = userData?.user ?? (authUser as unknown as FullProfile | null);

  if (!authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Please log in to view your profile</div>
      </div>
    );
  }

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  const isSeller = ['seller', 'creator', 'admin', 'super_admin'].includes(profile?.role ?? '');

  return (
    <div className="flex flex-col gap-6">
      <Helmet>
        <title>{profile?.displayName || 'Profile'} | AvatarX</title>
        <meta name="description" content="View your AvatarX profile, stats, and portfolio." />
      </Helmet>

      {/* Profile Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <img
            src={profile?.avatar || '/default-avatar.png'}
            alt={profile?.displayName || 'Avatar'}
            className="h-24 w-24 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {profile?.displayName || 'User'}
              </h1>
              {profile?.verificationBadge && (
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  ✓ Verified
                </span>
              )}
              {profile?.sellerLevel && isSeller && (
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${sellerLevelColors[profile.sellerLevel]}`}>
                  {sellerLevelLabels[profile.sellerLevel]}
                </span>
              )}
              {profile?.isOnline && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Online
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {profile?.email} {profile?.imvuUsername ? `• @${profile.imvuUsername}` : ''}
            </p>
            {profile?.bio && (
              <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-w-2xl">
                {profile.bio}
              </p>
            )}
            {!profile?.bio && (
              <p className="mt-3 text-sm text-slate-400 italic">No bio added yet</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {profile?.badges?.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                >
                  {badge}
                </span>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => navigate('/settings')}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Edit Profile
              </button>
              {isSeller && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 transition-colors"
                >
                  Dashboard
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {profile?.totalOrdersCompleted ?? 0}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Orders Completed</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              ${profile?.totalEarnedUSD ?? 0}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Total Earned (USD)</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {profile?.successScore ?? 0}%
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Success Score</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {profile?.responseRate ?? 0}%
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Response Rate</p>
          </div>
        </div>
      </section>

      {/* Skills & Languages */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Skills</h2>
          {profile?.skills && profile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No skills listed</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Languages</h2>
          {profile?.languages && profile.languages.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.languages.map((lang, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"
                >
                  {lang}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No languages listed</p>
          )}
        </section>
      </div>

      {/* Certifications */}
      {profile?.certifications && profile.certifications.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Certifications</h2>
          <div className="flex flex-wrap gap-2">
            {profile.certifications.map((cert, i) => (
              <span
                key={i}
                className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              >
                {cert}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Portfolio</h2>
          <button
            onClick={() => navigate('/settings')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Manage Portfolio
          </button>
        </div>
        {profile?.portfolio && profile.portfolio.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {profile.portfolio.map((item, i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
              >
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <video
                    src={item.url}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={(e) => {
                      const v = e.target as HTMLVideoElement;
                      v.pause();
                      v.currentTime = 0;
                    }}
                  />
                )}
                {item.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 dark:border-slate-800">
            <div className="mb-3 text-3xl text-slate-300">🎨</div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">No portfolio items</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Showcase your work by adding portfolio items
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Add Portfolio Item
            </button>
          </div>
        )}
      </section>

      {/* Verification Status */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Verification</h2>
          <button
            onClick={() => navigate('/verification')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Manage Verifications
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className={`rounded-lg p-3 ${profile?.isEmailVerified ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Email</p>
            <p className={`text-xs ${profile?.isEmailVerified ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
              {profile?.isEmailVerified ? '✓ Verified' : 'Not verified'}
            </p>
          </div>
          <div className={`rounded-lg p-3 ${profile?.isAgeVerified ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Age</p>
            <p className={`text-xs ${profile?.isAgeVerified ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
              {profile?.isAgeVerified ? '✓ 18+' : 'Not verified'}
            </p>
          </div>
          <div className={`rounded-lg p-3 ${profile?.isCloudinaryVerified ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Cloudinary</p>
            <p className={`text-xs ${profile?.isCloudinaryVerified ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
              {profile?.isCloudinaryVerified ? '✓ Verified' : 'Not verified'}
            </p>
          </div>
          <div className={`rounded-lg p-3 ${profile?.isIdVerified ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
            <p className="text-sm font-medium text-slate-900 dark:text-white">ID</p>
            <p className={`text-xs ${profile?.isIdVerified ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
              {profile?.isIdVerified ? '✓ Verified' : 'Not verified'}
            </p>
          </div>
          <div className={`rounded-lg p-3 ${profile?.isProfileVerified ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Profile</p>
            <p className={`text-xs ${profile?.isProfileVerified ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
              {profile?.isProfileVerified ? '✓ Verified' : 'Not verified'}
            </p>
          </div>
        </div>
      </section>

      {/* Member Since */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-600">
        Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Unknown'}
      </div>
    </div>
  );
}
