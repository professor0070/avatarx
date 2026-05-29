import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

interface Order {
  id: string;
  _id: string;
  orderNumber: string;
  gigId?: {
    _id: string;
    title: string;
    thumbnail: string;
  };
  buyerId?: {
    displayName: string;
    avatar: string;
  };
  creatorId?: {
    displayName: string;
    avatar: string;
  };
  tierName: string;
  total: number;
  currency: string;
  status: 'pending' | 'escrow_locked' | 'payment_pending' | 'payment_completed' | 'requirements_submitted' | 'in_progress' | 'delivered' | 'completed' | 'cancelled' | 'refunded' | 'disputed';
  createdAt: string;
  updatedAt: string;
  deliveryTime: number;
  requirements: {
    enabled: boolean;
    submitted: boolean;
  };
  revisions: {
    current: number;
    max: number;
  };
}

export function OrderManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['my-contracts', filter],
    queryFn: async () => {
      const response = await api.get('/api/orders/my-contracts', {
        params: {
          status: filter === 'all' ? undefined : filter
        }
      });
      return response.data;
    },
    refetchInterval: 30000,
  });

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status, note }: { orderId: string; status: string; note?: string }) => {
      const response = await api.patch(`/api/orders/${orderId}/status`, { status, note });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-contracts'] });
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
      case 'pending':
      case 'escrow_locked':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'delivered':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'cancelled':
      case 'refunded':
      case 'disputed':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleStatusUpdate = (order: Order, newStatus: string) => {
    if (confirm(`Are you sure you want to update this order to ${getStatusLabel(newStatus)}?`)) {
      updateOrderStatus.mutate({
        orderId: order.id,
        status: newStatus,
      });
    }
  };

  const filteredOrders = ordersData?.orders?.filter((order: Order) => {
    const matchesFilter = filter === 'all' || order.status === filter;
    const matchesSearch = !searchQuery || 
      order.gigId?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyerId?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent z-10" />
            <div className="animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
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
          Order Management
        </h2>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
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
            placeholder="Search orders..."
            className="w-full sm:w-64 rounded-lg border border-slate-200 bg-white px-4 py-2 pl-10 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" strokeWidth={1.1} />
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl p-16 border border-slate-200/50 dark:border-slate-800/50 text-center flex flex-col items-center shadow-2xl shadow-indigo-500/5">
          <div className="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6">
            <span className="text-4xl filter drop-shadow-lg">✨</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            No active metaverse agreements found.
          </h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery 
              ? 'We couldn\'t find any active contracts matching those terms. Try adjusting your search matrix.'
              : filter === 'all'
              ? 'Your contract board is currently empty. They will seamlessly appear here when users initiate new agreements.'
              : `No contracts found matching the '${filter}' state constraint.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order: Order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {order.gigId?.title || 'Unknown Gig'}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={order.buyerId?.avatar || order.creatorId?.avatar || '/default-avatar.png'}
                        alt="User Avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {order.buyerId?.displayName || 'Client'}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {order.orderNumber}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Package</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {order.tierName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {formatCurrency(order.total, order.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Delivery</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {order.deliveryTime} days
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Revisions</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {order.revisions.current}/{order.revisions.max}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span>Created: {formatDate(order.createdAt)}</span>
                    <span>•</span>
                    <span>Updated: {formatDate(order.updatedAt)}</span>
                    {order.requirements.enabled && (
                      <>
                        <span>•</span>
                        <span className={order.requirements.submitted ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                          Requirements: {order.requirements.submitted ? 'Submitted' : 'Pending'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    View Details
                  </button>

                  {/* Status Actions */}
                  {order.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusUpdate(order, 'delivered')}
                      disabled={updateOrderStatus.isPending}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                    >
                      Mark as Delivered
                    </button>
                  )}

                  {order.status === 'delivered' && (
                    <button
                      onClick={() => handleStatusUpdate(order, 'completed')}
                      disabled={updateOrderStatus.isPending}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-500/20 transition-all hover:scale-105"
                    >
                      Release Funds from Escrow
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
