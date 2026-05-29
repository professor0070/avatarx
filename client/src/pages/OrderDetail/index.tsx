import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { DisputeModal } from '../../components/orders/DisputeModal';
import { ArrowLeft, Clock, Shield, MessageCircle, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface StatusEntry {
  status: string;
  timestamp: string;
  comment?: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  totalPrice: number;
  currency: string;
  paymentStatus: string;
  createdAt: string;
  deliveryTimeDays: number;
  requirements?: string;
  statusHistory: StatusEntry[];
  gigId: {
    _id: string;
    title: string;
    thumbnail: string;
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
  dispute?: {
    isDisputed: boolean;
    reason?: string;
    description?: string;
    evidence?: string[];
    status?: 'pending' | 'investigating' | 'resolved';
    resolution?: string;
    createdAt?: string;
    resolvedAt?: string;
  };
  review?: {
    rating?: number;
    comment?: string;
  };
}

export function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await api.get(`/api/orders/${orderId}`);
      return res.data.order as OrderDetail;
    },
    enabled: !!orderId && !!user,
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-red-700 dark:text-red-300">Order not found or access denied.</p>
          <Link to="/orders" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const isBuyer = order.buyerId._id === user.id;
  const otherParty = isBuyer ? order.sellerId : order.buyerId;
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const disputableStatuses = ['in_progress', 'delivered', 'revision_requested', 'in_revision'];
  const canDispute = disputableStatuses.includes(order.status) && !order.dispute?.isDisputed;

  const statusLabel = order.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress':
      case 'in_revision': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'delivered': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'cancelled':
      case 'refunded': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'payment_pending':
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Helmet>
        <title>Order #{order.orderNumber} | AvatarX</title>
      </Helmet>

      {/* Back button */}
      <button
        onClick={() => navigate('/orders')}
        className="mb-6 flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Order #{order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {order.gigId.title}
            </p>
          </div>
          <span className={`inline-flex self-start rounded-full px-3 py-1 text-sm font-bold ${getStatusColor(order.status)}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Order Timeline</h2>
            {order.statusHistory && order.statusHistory.length > 0 ? (
              <OrderTimeline statusHistory={order.statusHistory} />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No status updates recorded yet.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
              Order Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={order.gigId.thumbnail}
                  alt=""
                  className="h-14 w-20 rounded-lg object-cover"
                />
                <div>
                  <Link
                    to={`/gig/${order.gigId._id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                  >
                    {order.gigId.title}
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Clock className="h-4 w-4" />
                {order.deliveryTimeDays} days delivery
              </div>
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Total</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {order.currency} {order.totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Payment</span>
                  <span className="font-medium capitalize text-slate-900 dark:text-white">
                    {order.paymentStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Other Party */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
              {isBuyer ? 'Seller' : 'Buyer'}
            </h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                {otherParty.avatar ? (
                  <img src={otherParty.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
                    {otherParty.displayName[0]}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {otherParty.displayName}
                </p>
                <Link
                  to={`/profile/${otherParty._id}`}
                  className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  View Profile
                </Link>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                to={`/messages`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Message
              </Link>
              {isBuyer && order.status === 'completed' && (
                <Link
                  to={`/orders`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Leave a Review
                </Link>
              )}
            </div>
          </div>

          {/* Dispute */}
          {order.dispute?.isDisputed ? (
            <div className={`rounded-2xl border p-4 ${
              order.dispute.status === 'resolved'
                ? 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30'
                : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30'
            }`}>
              <div className="flex items-start gap-2">
                {order.dispute.status === 'resolved' ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${
                    order.dispute.status === 'resolved'
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}>
                    {order.dispute.status === 'resolved' ? 'Dispute Resolved' : 'Dispute Open'}
                  </p>
                  <p className={`mt-0.5 text-xs ${
                    order.dispute.status === 'resolved'
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}>
                    {order.dispute.status === 'resolved'
                      ? order.dispute.resolution || 'This dispute has been resolved.'
                      : `Reason: ${order.dispute.reason || 'N/A'}`}
                  </p>
                  {order.dispute.description && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {order.dispute.description}
                    </p>
                  )}
                  {(order.dispute.evidence?.length || 0) > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                        Evidence ({order.dispute.evidence?.length})
                      </summary>
                      <ul className="mt-1 space-y-1">
                        {order.dispute.evidence?.map((url, i) => (
                          <li key={i}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:underline dark:text-indigo-400 truncate block"
                            >
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ) : canDispute ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Having an issue?</p>
                  <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                    If something is wrong with this order, you can open a dispute for moderation.
                  </p>
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline hover:text-amber-900 dark:text-amber-300"
                  >
                    Open a Dispute
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showDisputeModal && (
        <DisputeModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          onClose={() => setShowDisputeModal(false)}
        />
      )}
    </div>
  );
}
