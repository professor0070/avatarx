import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { UserManagement } from '../../components/admin/UserManagement';
import { AdminOrderManagement } from '../../components/admin/OrderManagement';
import { GigModeration } from '../../components/admin/GigModeration';
import { SystemAnalytics } from '../../components/admin/SystemAnalytics';
import { SystemSettingsPage as SystemSettings } from '../../components/admin/SystemSettings';

interface Activity {
  type: string;
  description: string;
  timestamp: string;
}

export function AdminPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/admin/stats');
      return response.data;
    },
    enabled: user?.roles?.includes('admin') || user?.roles?.includes('super_admin'),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/admin/activity');
      return response.data;
    },
    enabled: user?.roles?.includes('admin') || user?.roles?.includes('super_admin'),
  });

  useEffect(() => {
    if (user && !user.roles?.includes('admin') && !user.roles?.includes('super_admin')) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (!user || (!user.roles?.includes('admin') && !user.roles?.includes('super_admin'))) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Access denied</div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'gigs', label: 'Gigs' },
    { id: 'orders', label: 'Orders' },
    { id: 'analytics', label: 'Analytics' },
    ...(user.roles?.includes('super_admin') ? [{ id: 'settings', label: 'Settings' }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Helmet>
        <title>Admin Panel | AvatarX</title>
        <meta name="description" content="Admin panel for managing users, gigs, and platform settings." />
      </Helmet>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Admin Panel
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage users, gigs, orders, and platform settings
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

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Users</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {stats?.totalUsers || 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Gigs</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {stats?.totalGigs || 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-600 dark:text-slate-400">Active Orders</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {stats?.activeOrders || 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-600 dark:text-slate-400">Revenue</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  ${stats?.totalRevenue || 0}
                </p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Recent Activity
                </h2>
              </div>
              <div className="p-6">
                {recentActivity?.activities?.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.activities.map((activity: Activity, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-slate-900 dark:text-white">
                            {activity.description}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No recent activity
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'gigs' && <GigModeration />}

        {activeTab === 'orders' && (
          <AdminOrderManagement />
        )}

        {activeTab === 'analytics' && <SystemAnalytics />}

        {activeTab === 'settings' && user.roles?.includes('super_admin') && (
          <SystemSettings />
        )}
      </div>
    </div>
  );
}
