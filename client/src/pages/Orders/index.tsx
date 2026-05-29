import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReviewFormModal } from '../../components/common/ReviewFormModal';
import { Star } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  gigId: {
    _id: string;
    title: string;
    thumbnail: string;
    category: string;
  };
  sellerId: {
    _id: string;
    displayName: string;
    avatar?: string;
  };
  buyerId: {
    _id: string;
    displayName: string;
    avatar?: string;
  };
  totalPrice: number;
  currency: string;
  status: 'pending' | 'payment_pending' | 'payment_failed' | 'payment_completed' | 'requirements_submitted' | 'in_progress' | 'revision_requested' | 'in_revision' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
  paymentStatus: string;
  createdAt: string;
  deliveryTimeDays: number;
  review?: {
    rating?: number;
    comment?: string;
  };
}

export function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const isSellerOrCreator = ['seller', 'creator', 'admin', 'super_admin'].includes(user?.role ?? '');
  const [role, setRole] = useState<'buyer' | 'seller'>(isSellerOrCreator ? 'seller' : 'buyer');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { role, status: statusFilter }],
    queryFn: async () => {
      const response = await api.get('/api/orders', {
        params: { role, status: statusFilter || undefined }
      });
      return response.data;
    },
    enabled: !!user,
  });

  const orders: Order[] = data?.orders || [];

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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Helmet>
        <title>My Orders | AvatarX</title>
        <meta name="description" content="Manage your buying and selling orders." />
      </Helmet>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Orders</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track and manage your service orders
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => setRole('buyer')}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${
              role === 'buyer'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Buying
          </button>
          {isSellerOrCreator && (
            <button
              onClick={() => setRole('seller')}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${
                role === 'seller'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Selling
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['', 'active', 'delivered', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              statusFilter === status
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
            }`}
          >
            {status === '' ? 'All Orders' : formatStatus(status)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Order</th>
                  <th className="hidden px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 md:table-cell">
                    {role === 'buyer' ? 'Seller' : 'Buyer'}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Total</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((order) => (
                  <tr key={order.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={order.gigId.thumbnail} 
                          alt="" 
                          className="h-10 w-12 rounded object-cover shadow-sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {order.gigId.title}
                          </p>
                          <p className="text-xs text-slate-500">#{order.orderNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 md:table-cell">
                      <div className="flex items-center gap-2">
                        {role === 'buyer' ? (
                          <>
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden dark:bg-slate-800">
                              {order.sellerId.avatar ? (
                                <img src={order.sellerId.avatar} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[10px]">{order.sellerId.displayName[0]}</span>
                              )}
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{order.sellerId.displayName}</span>
                          </>
                        ) : (
                          <>
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden dark:bg-slate-800">
                              {order.buyerId.avatar ? (
                                <img src={order.buyerId.avatar} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[10px]">{order.buyerId.displayName[0]}</span>
                              )}
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{order.buyerId.displayName}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                      {order.currency} {order.totalPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${getStatusColor(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {role === 'buyer' && order.status === 'completed' && (
                        order.review?.rating ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Star className="w-3.5 h-3.5 fill-green-600 dark:fill-green-400" strokeWidth={1.1} />
                            Reviewed
                          </span>
                        ) : (
                          <button
                            onClick={() => setReviewOrder(order)}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95"
                          >
                            Write a Review
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-32 dark:border-slate-800">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900">
            <span className="text-4xl text-slate-300">📦</span>
          </div>
          <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">No orders found</h3>
          <p className="mt-2 text-slate-500">
            {statusFilter 
              ? `You don't have any ${statusFilter} orders at the moment.` 
              : role === 'buyer' 
                ? "You haven't placed any orders yet. Start browsing gigs to find what you need!" 
                : "You haven't received any orders yet. Keep your profile and gigs updated!"}
          </p>
          {role === 'buyer' && !statusFilter && (
            <Link
              to="/browse"
              className="mt-8 rounded-full bg-indigo-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95"
            >
              Browse Gigs
            </Link>
          )}
        </div>
      )}

      {reviewOrder && (
        <ReviewFormModal
          orderId={reviewOrder.id}
          orderNumber={reviewOrder.orderNumber}
          gigTitle={reviewOrder.gigId.title}
          onClose={() => setReviewOrder(null)}
        />
      )}
    </div>
  );
}
