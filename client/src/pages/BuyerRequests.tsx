import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

const categories = [
  'All',
  'Game Credits',
  'Adult Triggers Male',
  'Adult Triggers Female',
  'Adult Rooms',
  'Outfits Male',
  'Outfits Female',
  'Badges',
  'Room Decoration',
  'Adult Triggers Making',
  'Brand Ambassador Management',
  'Agency Management',
  'Instagram Reels',
  'Marriage Videographer',
  'Photo Editor',
  'Custom Services',
];

interface BuyerRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: {
    currency: string;
    min: number;
    max: number;
  };
  status: string;
  proposalsCount: number;
  proposalCount?: number;
  views?: number;
  clientAvatar?: string;
  clientName?: string;
  createdAt: string;
}

export function BuyerRequestsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('open');

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['buyer-requests', category, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== 'All') params.append('category', category);
      if (status !== 'all') params.append('status', status);
      const response = await api.get(`/api/buyer-requests?${params}`);
      return response.data;
    },
  });

  const requests = requestsData?.requests || [];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Helmet>
        <title>Buyer Requests - AvatarX</title>
        <meta name="description" content="Browse buyer requests and submit proposals" />
      </Helmet>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Buyer Requests
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Find projects that match your skills and submit proposals
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {user && user.activeRole === 'buyer' && (
            <button
              onClick={() => navigate('/buyer-requests/create')}
              className="self-end rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Post a Request
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-600 dark:text-slate-400">Loading requests...</div>
          </div>
        )}

        {/* Requests List */}
        {!isLoading && requests.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-slate-600 dark:text-slate-400">No buyer requests found</p>
          </div>
        )}

        {!isLoading && requests.length > 0 && (
          <div className="grid gap-4">
            {requests.map((request: BuyerRequest) => (
              <div
                key={request.id}
                onClick={() => navigate(`/buyer-requests/${request.id}`)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white p-6 hover:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {request.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {request.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                        {request.category}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                        {request.budget.currency} {request.budget.min} - {request.budget.max}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {request.proposalCount} proposals
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {request.views} views
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end">
                    <img
                      src={request.clientAvatar || '/default-avatar.png'}
                      alt={request.clientName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {request.clientName}
                    </p>
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
