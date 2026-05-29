import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import type { AvatarXRole } from '../../types/auth';

export function RoleInterceptor() {
  const { user, setSession, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If there's no user, or their role is not the unassigned 'user', don't intercept.
  // Also handle case where user exists but role is undefined/null
  if (!user || (!user.role && !user.activeRole) || (user.role !== 'user' && user.activeRole !== 'user')) {
    return null;
  }

  const handleRoleSelection = async (role: AvatarXRole) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const API_URL = import.meta.env.VITE_API_URL || '';
      
      const response = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update role');
      }

      // Update local state directly so the interceptor unmounts immediately
      setSession({
        accessToken,
        user: { 
          ...user, 
          role: data.user.role || role,
          activeRole: data.user.activeRole || role,
          roles: data.user.roles || [role]
        },
      });

      // Route them smoothly based on their selection
      if (role === 'buyer') {
        navigate('/');
      } else {
        navigate('/dashboard');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white/80 p-8 shadow-2xl backdrop-blur-3xl dark:bg-slate-900/80 sm:p-12 border border-white/20 dark:border-slate-800/50"
      >
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Choose Your Path
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Welcome to AvatarX! How are you planning to use the marketplace?
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Buyer Option */}
          <button
            onClick={() => handleRoleSelection('buyer')}
            disabled={isSubmitting}
            className="group relative flex flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-8 transition-all hover:border-indigo-500 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950/50 hover:dark:border-indigo-500 disabled:opacity-50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all dark:bg-indigo-900/30 dark:text-indigo-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-xl">Buyer</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">I want to hire talent and buy products.</p>
            </div>
          </button>

          {/* Seller Option */}
          <button
            onClick={() => handleRoleSelection('seller')}
            disabled={isSubmitting}
            className="group relative flex flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-8 transition-all hover:border-purple-500 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950/50 hover:dark:border-purple-500 disabled:opacity-50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all dark:bg-purple-900/30 dark:text-purple-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-xl">Seller</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">I want to offer my freelance services.</p>
            </div>
          </button>

          {/* Creator Option */}
          <button
            onClick={() => handleRoleSelection('creator')}
            disabled={isSubmitting}
            className="group relative flex flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-8 transition-all hover:border-fuchsia-500 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950/50 hover:dark:border-fuchsia-500 disabled:opacity-50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-600 group-hover:scale-110 group-hover:bg-fuchsia-600 group-hover:text-white transition-all dark:bg-fuchsia-900/30 dark:text-fuchsia-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-xl">Creator</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">I want to sell digital products & assets.</p>
            </div>
          </button>
        </div>

        {isSubmitting && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 rounded-3xl">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
