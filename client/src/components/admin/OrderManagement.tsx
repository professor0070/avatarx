import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import { Search, X } from 'lucide-react';

interface AdminOrder {
  id: string;
  orderNumber: string;
  gigId: {
    _id: string;
    title: string;
    thumbnail: string;
    category: string;
  };
  buyerId: {
    _id: string;
    displayName: string;
    avatar?: string;
  };
  sellerId: {
    _id: string;
    displayName: string;
    avatar?: string;
  };
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  deliveryTimeDays: number;
  dispute?: {
    isDisputed: boolean;
    status?: string;
  };
}

export function AdminOrderManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        role: 'admin',
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await api.get(`/api/orders?${params.toString()}`);
      return response.data;
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status, comment }: { orderId: string; status: string; comment?: string }) => {
      const response = await api.patch(`/api/orders/${orderId}/status`, { status, comment });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });

  const resolveDispute = useMutation({
    mutationFn: async ({ orderId, resolution, action }: { orderId: string; resolution: string; action: string }) => {
      const response = await api.post(`/api/orders/${orderId}/dispute/resolve`, { orderId, resolution, action });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });

  const orders: AdminOrder[] = ordersData?.orders || [];
  const pagination = ordersData?.pagination;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress':
      case 'in_revision': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'delivered': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'cancelled':
      case 'refunded': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'payment_pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredOrders = orders.filter((order: AdminOrder) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      order.gigId?.title?.toLowerCase().includes(q) ||
      order.buyerId?.displayName?.toLowerCase().includes(q) ||
      order.sellerId?.displayName?.toLowerCase().includes(q)
    );
  });

  const handleStatusUpdate = (order: AdminOrder, newStatus: string) => {
    const label = formatStatus(newStatus);
    if (confirm(`Update order ${order.orderNumber} to "${label}"?`)) {
      updateOrderStatus.mutate({ orderId: order.id, status: newStatus });
    }
  };

  const statusFilters = ['all', 'payment_pending', 'in_progress', 'delivered', 'completed', 'cancelled', 'refunded'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Order Management
        </h3>
        <div className="text-sm text-slate-500">
          {pagination ? `${pagination.total} orders total` : ''}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                statusFilter === status
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
              }`}
            >
              {status === 'all' ? 'All Orders' : formatStatus(status)}
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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      ) : filteredOrders.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Order</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Buyer</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Seller</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Total</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Dispute</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={order.gigId?.thumbnail || '/default-gig.png'}
                            alt=""
                            className="h-10 w-12 rounded object-cover shadow-sm"
                          />
                          <div className="min-w-0 max-w-[200px]">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {order.gigId?.title || 'Deleted Gig'}
                            </p>
                            <p className="text-xs text-slate-500">#{order.orderNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden dark:bg-slate-800">
                            {order.buyerId?.avatar ? (
                              <img src={order.buyerId.avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-medium text-slate-500">{order.buyerId?.displayName?.[0] || '?'}</span>
                            )}
                          </div>
                          <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                            {order.buyerId?.displayName || 'Deleted'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden dark:bg-slate-800">
                            {order.sellerId?.avatar ? (
                              <img src={order.sellerId.avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-medium text-slate-500">{order.sellerId?.displayName?.[0] || '?'}</span>
                            )}
                          </div>
                          <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                            {order.sellerId?.displayName || 'Deleted'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                        {order.currency} {order.totalPrice?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${getStatusColor(order.status)}`}>
                          {formatStatus(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {order.dispute?.isDisputed ? (
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            order.dispute.status === 'resolved'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {order.dispute.status === 'resolved' ? 'Resolved' : 'Open'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-2.5 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            View
                          </button>
                          {order.status === 'payment_pending' && (
                            <button
                              onClick={() => handleStatusUpdate(order, 'cancelled')}
                              disabled={updateOrderStatus.isPending}
                              className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                          {order.status === 'delivered' && (
                            <button
                              onClick={() => handleStatusUpdate(order, 'completed')}
                              disabled={updateOrderStatus.isPending}
                              className="px-2.5 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.pages}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 dark:border-slate-800">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900">
            <span className="text-3xl text-slate-300">📦</span>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No orders found</h3>
          <p className="mt-2 text-sm text-slate-500">
            {searchQuery ? 'Try adjusting your search terms' : 'No orders match the current filter'}
          </p>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Order #{selectedOrder.orderNumber}
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" strokeWidth={1.1} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src={selectedOrder.gigId?.thumbnail || '/default-gig.png'} alt="" className="h-12 w-16 rounded object-cover" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedOrder.gigId?.title || 'Deleted Gig'}</p>
                  <p className="text-xs text-slate-500">{selectedOrder.gigId?.category || ''}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Buyer</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedOrder.buyerId?.displayName || 'Deleted'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Seller</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedOrder.sellerId?.displayName || 'Deleted'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedOrder.currency} {selectedOrder.totalPrice?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500">Delivery</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedOrder.deliveryTimeDays} days</p>
                </div>
                <div>
                  <p className="text-slate-500">Payment</p>
                  <p className="font-medium text-slate-900 dark:text-white capitalize">{selectedOrder.paymentStatus?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-slate-500">Created</p>
                  <p className="font-medium text-slate-900 dark:text-white">{format(new Date(selectedOrder.createdAt), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              {selectedOrder.dispute?.isDisputed && selectedOrder.dispute.status !== 'resolved' && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">Open Dispute</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        if (confirm('Resolve dispute by refunding the buyer?')) {
                          resolveDispute.mutate({
                            orderId: selectedOrder.id,
                            resolution: 'Admin resolved in favor of buyer',
                            action: 'refund_buyer',
                          });
                          setSelectedOrder(null);
                        }
                      }}
                      disabled={resolveDispute.isPending}
                      className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Refund Buyer
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Resolve dispute by completing the order?')) {
                          resolveDispute.mutate({
                            orderId: selectedOrder.id,
                            resolution: 'Admin resolved in favor of seller',
                            action: 'complete_order',
                          });
                          setSelectedOrder(null);
                        }
                      }}
                      disabled={resolveDispute.isPending}
                      className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Complete Order
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {selectedOrder.status === 'delivered' && (
                  <button
                    onClick={() => {
                      handleStatusUpdate(selectedOrder, 'completed');
                      setSelectedOrder(null);
                    }}
                    className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Mark Completed
                  </button>
                )}
                {['pending', 'payment_pending', 'in_progress'].includes(selectedOrder.status) && (
                  <button
                    onClick={() => {
                      handleStatusUpdate(selectedOrder, 'cancelled');
                      setSelectedOrder(null);
                    }}
                    className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
