import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { OrderManagement } from '../../components/dashboard/OrderManagement';
import { ClientAnalytics } from '../../components/dashboard/ClientAnalytics';
import { WishlistManagement } from '../../components/dashboard/WishlistManagement';

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setActiveMode = useAuthStore((s) => s.setActiveMode);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', 'client'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/client/stats');
      return response.data.stats;
    },
    enabled: !!user,
  });

  // Sync activeMode to 'buyer' when this page loads (handles direct URL, refresh, bookmarks)
  useEffect(() => {
    setActiveMode('buyer');
  }, [setActiveMode]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Please log in to access the dashboard</div>
      </div>
    );
  }

  const clientTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'orders', label: 'Orders' },
    { id: 'wishlist', label: 'Wishlist' },
    { id: 'analytics', label: 'Analytics' },
  ];

  const tabs = clientTabs;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Helmet>
        <title>Dashboard | AvatarX</title>
        <meta name="description" content="Track your orders and activity." />
      </Helmet>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track your orders and activity
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Active Orders
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.totalOrders || 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Total Spent
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                ${stats?.totalRevenue || 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-600 dark:text-slate-400">Rating</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.averageRating || 0}/5
              </p>
            </div>
          </div>
        )}

        {/* Client Tabs */}
        {activeTab === 'orders' && <OrderManagement />}
        {activeTab === 'wishlist' && <WishlistManagement />}
        {activeTab === 'analytics' && <ClientAnalytics />}
      </div>
    </div>
  );
}
