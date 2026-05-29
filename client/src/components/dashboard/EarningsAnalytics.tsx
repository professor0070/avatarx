import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { X, Check, Building2, CreditCard } from 'lucide-react';

interface EarningsData {
  totalEarnings: number;
  currentMonthEarnings: number;
  lastMonthEarnings: number;
  pendingEarnings: number;
  completedOrders: number;
  averageOrderValue: number;
  monthlyData: Array<{
    month: string;
    earnings: number;
    orders: number;
  }>;
  recentTransactions: Array<{
    id: string;
    orderNumber: string;
    gigTitle: string;
    amount: number;
    currency: string;
    status: 'completed' | 'pending' | 'refunded';
    date: string;
  }>;
}

export function EarningsAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Fetch earnings data
  const { data: earningsData, isLoading } = useQuery({
    queryKey: ['earnings-analytics', timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/freelancer/earnings?range=${timeRange}`);
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'refunded':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
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

  const data = earningsData?.data as EarningsData;
  const growth = calculateGrowth(data?.currentMonthEarnings || 0, data?.lastMonthEarnings || 0);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [showBankModal, setShowBankModal] = useState(false);
  const [showPaypalModal, setShowPaypalModal] = useState(false);
  const [bankForm, setBankForm] = useState({ accountHolderName: '', accountNumber: '', bankName: '', ifscCode: '' });
  const [paypalEmail, setPaypalEmail] = useState('');

  const payoutMethods = (user as any)?.payoutMethods || {};

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.patch('/api/users/me', data);
      return res.data;
    },
    onSuccess: (res) => {
      useAuthStore.setState({ user: res.user });
      queryClient.invalidateQueries({ queryKey: ['earnings-analytics'] });
    },
  });

  const handleSaveBank = () => {
    saveMutation.mutate({ payoutMethods: { ...payoutMethods, bankTransfer: { ...bankForm } } });
  };

  const handleSavePaypal = () => {
    saveMutation.mutate({ payoutMethods: { ...payoutMethods, paypal: { email: paypalEmail } } });
  };

  const handleRemoveBank = () => {
    const updated = { ...payoutMethods };
    delete updated.bankTransfer;
    saveMutation.mutate({ payoutMethods: updated });
    setShowBankModal(false);
  };

  const handleRemovePaypal = () => {
    const updated = { ...payoutMethods };
    delete updated.paypal;
    saveMutation.mutate({ payoutMethods: updated });
    setShowPaypalModal(false);
  };

  const openBankModal = () => {
    if (payoutMethods.bankTransfer) {
      setBankForm({
        accountHolderName: payoutMethods.bankTransfer.accountHolderName || '',
        accountNumber: payoutMethods.bankTransfer.accountNumber || '',
        bankName: payoutMethods.bankTransfer.bankName || '',
        ifscCode: payoutMethods.bankTransfer.ifscCode || '',
      });
    }
    setShowBankModal(true);
  };

  const openPaypalModal = () => {
    if (payoutMethods.paypal) {
      setPaypalEmail(payoutMethods.paypal.email || '');
    }
    setShowPaypalModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Earnings Analytics
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Earnings
            </p>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(data?.totalEarnings || 0)}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            All time earnings
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              This Month
            </p>
            <span className="text-2xl">📈</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(data?.currentMonthEarnings || 0)}
            </p>
            {growth !== 0 && (
              <span className={`text-sm font-medium ${
                growth > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            vs {formatCurrency(data?.lastMonthEarnings || 0)} last month
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Pending Earnings
            </p>
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(data?.pendingEarnings || 0)}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            From active orders
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
            {formatCurrency(data?.averageOrderValue || 0)}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Per completed order
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Earnings Trend
        </h3>
        
        {data?.monthlyData && data.monthlyData.length > 0 ? (
          <div className="space-y-4">
            {/* Simple bar chart representation */}
            <div className="flex items-end gap-2 h-64">
              {data.monthlyData.map((item, index) => {
                const maxValue = Math.max(...data.monthlyData.map(d => d.earnings));
                const height = (item.earnings / maxValue) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center">
                      <div 
                        className="w-full bg-indigo-600 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${formatCurrency(item.earnings)} - ${item.orders} orders`}
                      />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 text-center">
                      {item.month}
                    </p>
                  </div>
                );
              })}
            </div>
            
            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-600 rounded" />
                <span className="text-slate-600 dark:text-slate-400">Earnings</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-600 dark:text-slate-400">
            No earnings data available for the selected period
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Recent Transactions
        </h3>
        
        {data?.recentTransactions && data.recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {data.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {transaction.gigTitle}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {transaction.orderNumber} • {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            No recent transactions
          </div>
        )}
      </div>

      {/* Withdrawal Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Withdrawal Options
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h4 className="font-medium text-slate-900 dark:text-white">Bank Transfer</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Withdraw directly to your bank account
            </p>
            {payoutMethods.bankTransfer ? (
              <div className="space-y-2">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Connected</span>
                  <p className="mt-1">{payoutMethods.bankTransfer.bankName} ••••{payoutMethods.bankTransfer.accountNumber?.slice(-4)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={openBankModal} className="px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 border border-indigo-600 rounded-lg">Update</button>
                  <button onClick={handleRemoveBank} className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 border border-red-600 rounded-lg">Remove</button>
                </div>
              </div>
            ) : (
              <button onClick={openBankModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                Set Up Bank Transfer
              </button>
            )}
          </div>
          
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h4 className="font-medium text-slate-900 dark:text-white">PayPal</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Withdraw to your PayPal account
            </p>
            {payoutMethods.paypal ? (
              <div className="space-y-2">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Connected</span>
                  <p className="mt-1">{payoutMethods.paypal.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={openPaypalModal} className="px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 border border-indigo-600 rounded-lg">Update</button>
                  <button onClick={handleRemovePaypal} className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 border border-red-600 rounded-lg">Remove</button>
                </div>
              </div>
            ) : (
              <button onClick={openPaypalModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                Connect PayPal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bank Transfer Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Bank Transfer Details</h3>
              <button onClick={() => setShowBankModal(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Holder Name</label>
                <input type="text" value={bankForm.accountHolderName} onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
                <input type="text" value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                <input type="text" value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IFSC Code</label>
                <input type="text" value={bankForm.ifscCode} onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setShowBankModal(false)} className="px-4 py-2 text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300">Cancel</button>
              <button onClick={handleSaveBank} disabled={saveMutation.isPending || !bankForm.accountHolderName || !bankForm.accountNumber} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PayPal Modal */}
      {showPaypalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">PayPal Details</h3>
              <button onClick={() => setShowPaypalModal(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PayPal Email</label>
                <input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setShowPaypalModal(false)} className="px-4 py-2 text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300">Cancel</button>
              <button onClick={handleSavePaypal} disabled={saveMutation.isPending || !paypalEmail} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
