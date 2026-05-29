import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ComposedChart, Line, Legend
} from 'recharts';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalGigs: number;
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    newUsersToday: number;
    newGigsToday: number;
    newOrdersToday: number;
    revenueToday: number;
  };
  userGrowth: Array<{
    date: string;
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
  }>;
  gigStats: Array<{
    category: string;
    count: number;
    avgPrice: number;
    totalRevenue: number;
  }>;
  orderStats: Array<{
    status: string;
    count: number;
    totalValue: number;
  }>;
  revenueData: Array<{
    date: string;
    revenue: number;
    orders: number;
    commission: number;
  }>;
  topPerformers: Array<{
    type: 'freelancer' | 'gig';
    name: string;
    value: number;
    metric: string;
  }>;
}

export function SystemAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'gigs' | 'revenue' | 'performers'>('overview');

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['system-analytics', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/admin/analytics?range=${timeRange}`);
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <div className="animate-pulse">
                <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="animate-pulse">
            <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const data = analyticsData?.data as AnalyticsData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          System Analytics
        </h2>
        
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {range === '7d' && '7 Days'}
              {range === '30d' && '30 Days'}
              {range === '90d' && '90 Days'}
              {range === '1y' && '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex space-x-8">
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'users', label: 'User Growth' },
            { id: 'gigs', label: 'Gig Analytics' },
            { id: 'revenue', label: 'Revenue' },
            { id: 'performers', label: 'Top Performers' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Users
                </p>
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatNumber(data?.overview.totalUsers || 0)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                +{data?.overview.newUsersToday || 0} today
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Gigs
                </p>
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatNumber(data?.overview.totalGigs || 0)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                +{data?.overview.newGigsToday || 0} today
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Orders
                </p>
                <span className="text-2xl">📦</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatNumber(data?.overview.totalOrders || 0)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                +{data?.overview.newOrdersToday || 0} today
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Platform Revenue
                </p>
                <span className="text-2xl">💰</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(data?.overview.totalRevenue || 0)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                +{formatCurrency(data?.overview.revenueToday || 0)} today
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Order Status Distribution
              </h3>
              <div className="space-y-3">
                {data?.orderStats?.map((stat) => (
                  <div key={stat.status} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {stat.status.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {stat.count}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        ({formatCurrency(stat.totalValue)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Gig Categories
              </h3>
              <div className="space-y-3">
                {data?.gigStats?.slice(0, 5).map((stat) => (
                  <div key={stat.category} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {stat.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {stat.count}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        ({formatCurrency(stat.avgPrice)} avg)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Growth Tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            User Growth Trends
          </h3>
          
          {data?.userGrowth && data.userGrowth.length > 0 ? (
            <div className="space-y-4">
              <div className="h-72 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.userGrowth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickFormatter={(val) => formatDate(val)} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      labelFormatter={(label) => formatDate(label as string)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="newUsers" name="New Users" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {/* Growth Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Users</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(data.userGrowth[data.userGrowth.length - 1]?.totalUsers || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Avg. New Users/Day</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {Math.round(data.userGrowth.reduce((sum, item) => sum + item.newUsers, 0) / data.userGrowth.length)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Active Users</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(data.userGrowth[data.userGrowth.length - 1]?.activeUsers || 0)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-600 dark:text-slate-400">
              No user growth data available for the selected period
            </div>
          )}
        </div>
      )}

      {/* Gig Analytics Tab */}
      {activeTab === 'gigs' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Gig Performance by Category
            </h3>
            
            {data?.gigStats && data.gigStats.length > 0 ? (
              <div className="space-y-4">
                {data.gigStats.map((stat) => (
                  <div key={stat.category} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {stat.category}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {stat.count} gigs
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {formatCurrency(stat.avgPrice)}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {formatCurrency(stat.totalRevenue)} total
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                No gig data available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Revenue Analytics
          </h3>
          
          {data?.revenueData && data.revenueData.length > 0 ? (
            <div className="space-y-4">
              <div className="h-72 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickFormatter={(val) => formatDate(val)} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#d97706" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <RechartsTooltip 
                      labelFormatter={(label) => formatDate(label as string)}
                      formatter={(value: any, name: any) => [formatCurrency(Number(value)), name === 'revenue' ? 'Total Revenue' : 'Commission']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Area yAxisId="left" type="monotone" dataKey="revenue" name="Total Revenue" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    <Line yAxisId="right" type="monotone" dataKey="commission" name="Commission" stroke="#d97706" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              {/* Revenue Summary */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(data.revenueData.reduce((sum, item) => sum + item.revenue, 0))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Orders</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(data.revenueData.reduce((sum, item) => sum + item.orders, 0))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Commission Earned</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(data.revenueData.reduce((sum, item) => sum + item.commission, 0))}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-600 dark:text-slate-400">
              No revenue data available for the selected period
            </div>
          )}
        </div>
      )}

      {/* Top Performers Tab */}
      {activeTab === 'performers' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Top Performers
          </h3>
          
          {data?.topPerformers && data.topPerformers.length > 0 ? (
            <div className="space-y-4">
              {data.topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {performer.name}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {performer.type === 'freelancer' ? 'Freelancer' : 'Gig'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {performer.type === 'freelancer' 
                        ? formatCurrency(performer.value)
                        : formatNumber(performer.value)
                      }
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {performer.metric}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No performer data available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
