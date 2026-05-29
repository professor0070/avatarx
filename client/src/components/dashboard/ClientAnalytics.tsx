import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface ClientAnalyticsData {
  overview: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    completedOrders: number;
    cancelledOrders: number;
  };
  spendingData: Array<{
    date: string;
    amount: number;
    orders: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    spent: number;
  }>;
  orderStatusBreakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  topSellers: Array<{
    sellerName: string;
    sellerAvatar: string;
    orders: number;
    spent: number;
  }>;
}

export function ClientAnalytics() {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('90d');

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['client-analytics', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/client/analytics?range=${timeRange}`);
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

  const data = analyticsData?.data as ClientAnalyticsData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Spending Analytics
        </h2>
        
        <div className="flex gap-2">
          {(['30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {range === '30d' && '30 Days'}
              {range === '90d' && '90 Days'}
              {range === '1y' && '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Orders
            </p>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {data?.overview.totalOrders || 0}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            All time orders
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Spent
            </p>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(data?.overview.totalSpent || 0)}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Lifetime spending
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Average Order
            </p>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(data?.overview.averageOrderValue || 0)}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Per order average
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Success Rate
            </p>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {data?.overview.totalOrders > 0 
              ? Math.round((data.overview.completedOrders / data.overview.totalOrders) * 100)
              : 0}%
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {data?.overview.completedOrders || 0} completed
          </p>
        </div>
      </div>

      {/* Spending Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Spending Trend
        </h3>
        
        {data?.spendingData && data.spendingData.length > 0 ? (
          <div className="space-y-4">
            {/* Simple bar chart representation */}
            <div className="flex items-end gap-2 h-64">
              {data.spendingData.map((item, index) => {
                const maxValue = Math.max(...data.spendingData.map(d => d.amount));
                const height = (item.amount / maxValue) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center">
                      <div 
                        className="w-full bg-indigo-600 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${formatCurrency(item.amount)} on ${formatDate(item.date)}`}
                      />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 text-center">
                      {formatDate(item.date)}
                    </p>
                  </div>
                );
              })}
            </div>
            
            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-600 rounded" />
                <span className="text-slate-600 dark:text-slate-400">Daily Spending</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-600 dark:text-slate-400">
            No spending data available for the selected period
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Spending by Category
          </h3>
          
          {data?.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {data.categoryBreakdown.map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {category.category}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {category.count} orders
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ 
                          width: `${(category.spent / (data.categoryBreakdown.reduce((sum, c) => sum + c.spent, 0))) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {formatCurrency(category.spent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No category data available
            </div>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Order Status Distribution
          </h3>
          
          {data?.orderStatusBreakdown && data.orderStatusBreakdown.length > 0 ? (
            <div className="space-y-3">
              {data.orderStatusBreakdown.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                        {status.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {status.count} orders
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          status.status === 'completed' ? 'bg-green-600' :
                          status.status === 'in_progress' ? 'bg-blue-600' :
                          status.status === 'cancelled' ? 'bg-red-600' :
                          'bg-yellow-600'
                        }`}
                        style={{ width: `${status.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {status.percentage}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No order status data available
            </div>
          )}
        </div>
      </div>

      {/* Top Sellers */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Top Sellers You've Worked With
        </h3>
        
        {data?.topSellers && data.topSellers.length > 0 ? (
          <div className="space-y-3">
            {data.topSellers.map((seller, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {index + 1}
                    </span>
                  </div>
                  <img
                    src={seller.sellerAvatar || '/default-avatar.png'}
                    alt={seller.sellerName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {seller.sellerName}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {seller.orders} orders
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {formatCurrency(seller.spent)}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Total spent
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            No seller data available
          </div>
        )}
      </div>
    </div>
  );
}
