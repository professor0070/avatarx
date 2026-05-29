
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import type { AvatarXUser } from '../types/auth';

export function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  if (!user || (!user.roles?.includes('admin') && !user.roles?.includes('super_admin'))) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: async () => {
      const response = await api.get('/api/admin/verifications');
      return response.data.users as AvatarXUser[];
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      await api.patch(`/api/admin/verifications/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 sm:p-10">
      <Helmet>
        <title>Seller Verifications | Admin</title>
      </Helmet>

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Seller Verifications</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Review and approve new sellers and creators.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending:</span>
            <span className="ml-2 text-lg font-bold text-indigo-600 dark:text-indigo-400">{data?.length || 0}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">All Caught Up!</h3>
            <p className="text-slate-500 dark:text-slate-400">There are no pending verifications at this time.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {data.map((seller: any) => (
              <div key={seller.id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  {seller.avatar ? (
                    <img src={seller.avatar} alt={seller.displayName} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
                      {seller.displayName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {seller.displayName}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase tracking-wider">
                        {seller.role}
                      </span>
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{seller.email}</p>
                    <p className="text-xs text-slate-400 mt-1">Joined: {new Date(seller.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => mutation.mutate({ id: seller.id, status: 'rejected' })}
                    disabled={mutation.isPending}
                    className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => mutation.mutate({ id: seller.id, status: 'approved' })}
                    disabled={mutation.isPending}
                    className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 shadow-sm shadow-green-500/20 transition-all disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
