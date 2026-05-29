import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Search, Eye, Trash2 } from 'lucide-react';

interface Gig {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  status: 'active' | 'paused' | 'draft' | 'rejected' | 'pending_approval';
  seller: {
    id: string;
    displayName: string;
    avatar: string;
    email: string;
  };
  tier: {
    name: string;
    price: number;
    deliveryTime: number;
  };
  tags: string[];
  adultContent: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    views: number;
    orders: number;
    revenue: number;
    rating: number;
  };
  media: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }>;
  reported: boolean;
  reportCount: number;
}

export function GigModeration() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'rejected' | 'reported'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch gigs for moderation
  const { data: gigsData, isLoading } = useQuery({
    queryKey: ['admin-gigs', filter],
    queryFn: async () => {
      const response = await api.get(`/api/admin/gigs?status=${filter}`);
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Approve gig mutation
  const approveGig = useMutation({
    mutationFn: async (gigId: string) => {
      const response = await api.patch(`/api/admin/gigs/${gigId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gigs'] });
    },
  });

  // Reject gig mutation
  const rejectGig = useMutation({
    mutationFn: async ({ gigId, reason }: { gigId: string; reason: string }) => {
      const response = await api.patch(`/api/admin/gigs/${gigId}/reject`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gigs'] });
      setSelectedGig(null);
      setRejectionReason('');
    },
  });

  // Pause/Resume gig mutation
  const toggleGigStatus = useMutation({
    mutationFn: async ({ gigId, status }: { gigId: string; status: string }) => {
      const response = await api.patch(`/api/admin/gigs/${gigId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gigs'] });
    },
  });

  // Delete gig mutation
  const deleteGig = useMutation({
    mutationFn: async (gigId: string) => {
      await api.delete(`/api/admin/gigs/${gigId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gigs'] });
      setSelectedGig(null);
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
      case 'pending_approval':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const handleApprove = (gigId: string) => {
    if (confirm('Are you sure you want to approve this gig?')) {
      approveGig.mutate(gigId);
    }
  };

  const handleReject = () => {
    if (!selectedGig || !rejectionReason.trim()) return;
    
    rejectGig.mutate({
      gigId: selectedGig.id,
      reason: rejectionReason.trim(),
    });
  };

  const handleStatusToggle = (gig: Gig) => {
    const newStatus = gig.status === 'active' ? 'paused' : 'active';
    toggleGigStatus.mutate({ gigId: gig.id, status: newStatus });
  };

  const handleDelete = (gigId: string) => {
    if (confirm('Are you sure you want to delete this gig? This action cannot be undone.')) {
      deleteGig.mutate(gigId);
    }
  };

  const filteredGigs = gigsData?.gigs?.filter((gig: Gig) => {
    const matchesFilter = filter === 'all' || 
      (filter === 'pending' && gig.status === 'pending_approval') ||
      (filter === 'active' && gig.status === 'active') ||
      (filter === 'rejected' && gig.status === 'rejected') ||
      (filter === 'reported' && gig.reported);
    
    const matchesSearch = !searchQuery || 
      gig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.seller.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
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
          Gig Moderation
        </h2>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {filteredGigs.length} gigs found
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {(['all', 'pending', 'active', 'rejected', 'reported'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gigs..."
            className="w-full sm:w-64 rounded-lg border border-slate-200 bg-white px-4 py-2 pl-10 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" strokeWidth={1.1} />
        </div>
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
          <p className="text-slate-600 dark:text-slate-400">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : filter === 'all'
              ? 'No gigs match the current filter'
              : `No ${filter.replace('_', ' ')} gigs found`
            }
          </p>
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
                      {gig.status.replace('_', ' ')}
                    </span>
                    {gig.adultContent && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        18+
                      </span>
                    )}
                    {gig.reported && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                        Reported ({gig.reportCount})
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={gig.seller.avatar || '/default-avatar.png'}
                        alt={gig.seller.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {gig.seller.displayName}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {gig.seller.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {gig.description}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Category</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {gig.category}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Price</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {formatCurrency(gig.price, gig.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Delivery</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {gig.tier.deliveryTime} days
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Performance</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {gig.stats.rating ? `${gig.stats.rating}⭐` : 'No ratings'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span>Created: {formatDate(gig.createdAt)}</span>
                    <span>•</span>
                    <span>Views: {gig.stats.views}</span>
                    <span>•</span>
                    <span>Orders: {gig.stats.orders}</span>
                    {gig.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span>Tags: {gig.tags.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/gigs/${gig.id}`)}
                    className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    title="View Gig"
                  >
                    <Eye className="w-5 h-5" strokeWidth={1.1} />
                  </button>

                  {/* Status-specific actions */}
                  {gig.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => handleApprove(gig.id)}
                        disabled={approveGig.isPending}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setSelectedGig(gig)}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {gig.status === 'active' && (
                    <button
                      onClick={() => handleStatusToggle(gig)}
                      disabled={toggleGigStatus.isPending}
                      className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      Pause
                    </button>
                  )}

                  {gig.status === 'paused' && (
                    <button
                      onClick={() => handleStatusToggle(gig)}
                      disabled={toggleGigStatus.isPending}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Resume
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(gig.id)}
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

      {/* Rejection Modal */}
      {selectedGig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Reject Gig
              </h3>
              <div className="mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Gig: {selectedGig.title}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Seller: {selectedGig.seller.displayName}
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedGig(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectGig.isPending || !rejectionReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject Gig
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
