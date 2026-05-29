import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Pause, Play, Trash2 } from 'lucide-react';

interface Gig {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  status: 'active' | 'paused' | 'draft' | 'rejected';
  tier: {
    name: string;
    price: number;
    deliveryTime: number;
  };
  stats: {
    views: number;
    orders: number;
    revenue: number;
    rating: number;
  };
  createdAt: string;
  updatedAt: string;
}

export function GigManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all');

  // Fetch gigs
  const { data: gigsData, isLoading } = useQuery({
    queryKey: ['my-gigs', filter],
    queryFn: async () => {
      const response = await api.get(`/api/gigs/my-gigs?status=${filter}`);
      return response.data;
    },
  });

  // Toggle gig status mutation
  const toggleGigStatus = useMutation({
    mutationFn: async ({ gigId, status }: { gigId: string; status: string }) => {
      const response = await api.patch(`/api/gigs/${gigId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-gigs'] });
    },
  });

  // Delete gig mutation
  const deleteGig = useMutation({
    mutationFn: async (gigId: string) => {
      await api.delete(`/api/gigs/${gigId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-gigs'] });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const handleToggleStatus = (gig: Gig) => {
    const newStatus = gig.status === 'active' ? 'paused' : 'active';
    toggleGigStatus.mutate({ gigId: gig.id, status: newStatus });
  };

  const handleDeleteGig = (gigId: string) => {
    if (confirm('Are you sure you want to delete this gig? This action cannot be undone.')) {
      deleteGig.mutate(gigId);
    }
  };

  const filteredGigs = gigsData?.gigs?.filter((gig: Gig) => {
    if (filter === 'all') return true;
    return gig.status === filter;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="animate-pulse">
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
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
          My Gigs
        </h2>
        <button
          onClick={() => navigate('/create-gig')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Create New Gig
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'paused', 'draft'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Gigs List */}
      {filteredGigs.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-12 border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No gigs found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {filter === 'all' 
              ? 'Create your first gig to start earning on AvatarX'
              : `No ${filter} gigs found`
            }
          </p>
          {filter === 'all' && (
            <button
              onClick={() => navigate('/create-gig')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Your First Gig
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGigs.map((gig: Gig) => (
            <div
              key={gig.id}
              className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {gig.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(gig.status)}`}>
                      {gig.status}
                    </span>
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {gig.description}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Price</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {formatCurrency(gig.price, gig.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Orders</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {gig.stats.orders}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Revenue</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {formatCurrency(gig.stats.revenue, gig.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Rating</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {gig.stats.rating ? `${gig.stats.rating}⭐` : 'No ratings'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span>Category: {gig.category}</span>
                    <span>•</span>
                    <span>Created: {formatDate(gig.createdAt)}</span>
                    <span>•</span>
                    <span>Views: {gig.stats.views}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/gig/${gig.id}`)}
                    className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    title="View Gig"
                  >
                    <Eye className="w-5 h-5" strokeWidth={1.1} />
                  </button>
                  
                  <button
                    onClick={() => navigate(`/edit-gig/${gig.id}`)}
                    className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    title="Edit Gig"
                  >
                    <Edit className="w-5 h-5" strokeWidth={1.1} />
                  </button>

                  {gig.status !== 'rejected' && (
                    <button
                      onClick={() => handleToggleStatus(gig)}
                      disabled={toggleGigStatus.isPending}
                      className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      title={gig.status === 'active' ? 'Pause Gig' : 'Activate Gig'}
                    >
                      {gig.status === 'active' ? (
                        <Pause className="w-5 h-5" strokeWidth={1.1} />
                      ) : (
                        <Play className="w-5 h-5" strokeWidth={1.1} />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteGig(gig.id)}
                    disabled={deleteGig.isPending}
                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete Gig"
                  >
                    <Trash2 className="w-5 h-5" strokeWidth={1.1} />
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
