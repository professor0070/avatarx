import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Plus, Package, Briefcase, TrendingUp, Star, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Gig {
  id: string;
  title: string;
  type: 'product' | 'service';
  status: string;
  thumbnail: string;
  averageRating: number;
  totalReviews: number;
  orders: number;
  tiers: { price: number }[];
}

export function CreatorDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const setActiveMode = useAuthStore(s => s.setActiveMode);

  // Sync activeMode when this page is loaded (handles direct URL, refresh, bookmarks)
  useEffect(() => {
    setActiveMode('creator');
  }, [setActiveMode]);

  const { data: gigs, isLoading, refetch } = useQuery<Gig[]>({
    queryKey: ['my-gigs'],
    queryFn: async () => {
      const response = await api.get('/api/gigs/my-gigs');
      return response.data.gigs || [];
    },
    enabled: !!user,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Creator Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your premium assets and services.</p>
        </div>
        <button
          onClick={() => navigate('/create-gig')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Create Gig
        </button>
      </div>

      {/* Stats row placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Active Listings', value: gigs?.length || 0, icon: Package, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20' },
          { label: 'Total Orders', value: gigs?.reduce((acc, g) => acc + (g.orders || 0), 0) || 0, icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Avg. Rating', value: '5.0', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Listings Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Portfolio</h2>
        </div>
        
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : gigs?.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No listings yet</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">You haven't created any products or services. Start building your portfolio now!</p>
            <button
              onClick={() => navigate('/create-gig')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Create First Listing
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {gigs?.map((gig) => (
              <div key={gig.id} className="p-6 flex flex-col md:flex-row gap-6 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-full md:w-48 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex-shrink-0 relative">
                  {gig.thumbnail ? (
                    <img src={gig.thumbnail} alt={gig.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur text-xs font-bold rounded-md uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {gig.type}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{gig.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500" /> {gig.averageRating || '0.0'} ({gig.totalReviews || 0})</span>
                        <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4" /> {gig.orders || 0} Orders</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium text-xs capitalize">
                          {gig.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Starting at</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">₹{gig.tiers?.[0]?.price || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
