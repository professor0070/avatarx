import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface CustomOffer {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  deliveryTimeDays: number;
  status: string;
  gigTitle?: string;
  expiresAt: string;
  freelancerAvatar?: string;
  clientAvatar?: string;
  freelancerName?: string;
  clientName?: string;
}

export function CustomOffersPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: offersData, isLoading } = useQuery({
    queryKey: ['custom-offers', tab, statusFilter],
    queryFn: async () => {
      const endpoint = tab === 'received' ? '/api/custom-offers/received' : '/api/custom-offers/sent';
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await api.get(`${endpoint}?${params}`);
      return response.data;
    },
    enabled: !!user,
  });

  const offers = offersData?.offers || [];

  const acceptMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await api.patch(`/api/custom-offers/${offerId}/accept`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-offers'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await api.patch(`/api/custom-offers/${offerId}/decline`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-offers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await api.delete(`/api/custom-offers/${offerId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-offers'] });
    },
  });

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-slate-600 dark:text-slate-400">Please log in to view custom offers</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Helmet>
        <title>Custom Offers - AvatarX</title>
        <meta name="description" content="Manage custom offers" />
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Custom Offers
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {tab === 'received' ? 'View offers sent to you' : 'View offers you sent'}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setTab('received')}
            className={`pb-2 text-sm font-medium ${
              tab === 'received'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Received Offers
          </button>
          <button
            onClick={() => setTab('sent')}
            className={`pb-2 text-sm font-medium ${
              tab === 'sent'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Sent Offers
          </button>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-600 dark:text-slate-400">Loading offers...</div>
          </div>
        )}

        {/* Offers List */}
        {!isLoading && offers.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-slate-600 dark:text-slate-400">No custom offers found</p>
          </div>
        )}

        {!isLoading && offers.length > 0 && (
          <div className="space-y-4">
            {offers.map((offer: CustomOffer) => (
              <div
                key={offer.id}
                className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {offer.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {offer.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                        {offer.currency} {offer.price}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {offer.deliveryTimeDays} days
                      </span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                        offer.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        offer.status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                        offer.status === 'expired' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </span>
                    </div>

                    {offer.gigTitle && (
                      <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                        From gig: {offer.gigTitle}
                      </div>
                    )}

                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Expires: {new Date(offer.expiresAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col items-end gap-2">
                    <img
                      src={tab === 'received' ? offer.freelancerAvatar : offer.clientAvatar || '/default-avatar.png'}
                      alt={tab === 'received' ? offer.freelancerName : offer.clientName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {tab === 'received' ? offer.freelancerName : offer.clientName}
                    </p>

                    {tab === 'received' && offer.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptMutation.mutate(offer.id)}
                          disabled={acceptMutation.isPending}
                          className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => declineMutation.mutate(offer.id)}
                          disabled={declineMutation.isPending}
                          className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {tab === 'sent' && offer.status === 'pending' && (
                      <button
                        onClick={() => deleteMutation.mutate(offer.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
