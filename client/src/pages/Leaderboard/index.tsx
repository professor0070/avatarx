import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { SellerLevelBadge } from '../../components/common/SellerLevelBadge';
import { StarRating } from '../../components/common/StarRating';
import { Trophy, TrendingUp, DollarSign, BadgeCheck } from 'lucide-react';

interface LeaderboardSeller {
  id: string;
  displayName: string;
  avatar: string;
  sellerLevel: string;
  verificationBadge: boolean;
  totalOrdersCompleted: number;
  totalEarnedUSD: number;
  successScore: number;
  responseRate: number;
  badges: string[];
  averageRating: number;
  totalGigs: number;
}

const tabs = [
  { key: 'rating', label: 'Top Rated', icon: Trophy },
  { key: 'orders', label: 'Most Orders', icon: TrendingUp },
  { key: 'earnings', label: 'Top Earners', icon: DollarSign },
] as const;

function formatPrice(amount: number) {
  if (amount >= 1000) {
    return '$' + (amount / 1000).toFixed(1) + 'k';
  }
  return '$' + amount.toLocaleString();
}

export function LeaderboardPage() {
  const [sort, setSort] = useState<string>('rating');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', sort],
    queryFn: async () => {
      const res = await api.get('/api/users/leaderboard', { params: { sort } });
      return res.data.sellers as LeaderboardSeller[];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Helmet>
        <title>Leaderboard | AvatarX</title>
        <meta name="description" content="Top sellers and freelancers on AvatarX." />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Leaderboard
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Discover top-performing sellers based on ratings, orders, and earnings.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setSort(tab.key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                sort === tab.key
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">#</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Seller</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Level</th>
                {sort === 'rating' && <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Rating</th>}
                {sort === 'orders' && <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Orders</th>}
                {sort === 'earnings' && <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Earnings</th>}
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Success</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((seller, index) => (
                <tr key={seller.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                      {index === 0 ? (
                        <span className="text-yellow-500">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-slate-400">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-amber-700">🥉</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">{index + 1}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/profile/${seller.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        {seller.avatar ? (
                          <img src={seller.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
                            {seller.displayName[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                            {seller.displayName}
                          </span>
                          {seller.verificationBadge && (
                            <BadgeCheck className="h-3.5 w-3.5 text-indigo-500 fill-indigo-500" strokeWidth={1.1} />
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{seller.totalGigs} gigs</span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <SellerLevelBadge level={seller.sellerLevel} />
                  </td>
                  {sort === 'rating' && (
                    <td className="px-6 py-4">
                      <StarRating rating={seller.averageRating} size="sm" showCount count={seller.totalOrdersCompleted} />
                    </td>
                  )}
                  {sort === 'orders' && (
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                      {seller.totalOrdersCompleted.toLocaleString()}
                    </td>
                  )}
                  {sort === 'earnings' && (
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {formatPrice(seller.totalEarnedUSD)}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${
                      seller.successScore >= 90 ? 'text-green-600 dark:text-green-400' :
                      seller.successScore >= 70 ? 'text-amber-600 dark:text-amber-400' :
                      'text-slate-600 dark:text-slate-400'
                    }`}>
                      {seller.successScore}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {seller.responseRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-32 dark:border-slate-800">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900">
            <Trophy className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">No sellers yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            Leaderboard will populate as sellers start completing orders.
          </p>
        </div>
      )}

      {/* Level Info */}
      <div className="mt-12">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Seller Levels</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { level: 'new', label: 'New Seller', desc: 'Basic seller features, access to buyer requests, standard commission' },
            { level: 'level1', label: 'Level 1', desc: 'Reduced commission, priority in search, early access to buyer requests' },
            { level: 'level2', label: 'Level 2', desc: 'Lower commission, top search placement, verified seller badge' },
            { level: 'top_rated', label: 'Top Rated', desc: 'Lowest commission, featured placement, priority support, exclusive features' },
            { level: 'pro', label: 'Pro', desc: 'Custom commission rates, VIP support, exclusive partnerships, revenue sharing' },
          ].map((item) => (
            <div key={item.level} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2">
                <SellerLevelBadge level={item.level} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link
            to="/dashboard"
            className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            View your seller level on your Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
