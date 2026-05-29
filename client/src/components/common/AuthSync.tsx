import { useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';

export function AuthSync() {
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { setSession, clearSession, user } = useAuthStore();
  const syncingRef = useRef(false);
  const retryCountRef = useRef(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  // ── Primary sync effect ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded) return;

    if (clerkUser) {
      // Only sync if we don't yet have this Clerk user's profile in the store.
      // Compare clerkId (Clerk user ID) — NOT id (MongoDB _id) — to avoid infinite re-sync loops.
      if (!user || user.clerkId !== clerkUser.id) {
        if (syncingRef.current) return; // prevent duplicate concurrent syncs
        syncingRef.current = true;
        setSyncError(null);

        const syncUser = async () => {
          try {
            const token = await getToken();
            if (!token) {
              syncingRef.current = false;
              return;
            }

            const res = await api.post('/api/auth/sync', {}, {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.user) {
              setSession({ accessToken: token, user: res.data.user });
              retryCountRef.current = 0;
            }
            syncingRef.current = false;
          } catch (err: any) {
            console.error('[AuthSync] Failed to sync user from backend:', err);

            if (retryCountRef.current < 3) {
              retryCountRef.current++;
              const delay = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s
              setTimeout(syncUser, delay);
            } else {
              setSyncError('Unable to sync your account. Please refresh the page or try again later.');
              retryCountRef.current = 0;
              syncingRef.current = false;
            }
          }
        };

        syncUser();
      }
    } else {
      // Clerk says the user is signed out — clear local session too.
      // Only clear if there was a real user (not the mock dev user).
      if (user && user.id !== 'mock-user-b') {
        clearSession();
      }
      setSyncError(null);
      retryCountRef.current = 0;
    }
  }, [clerkUser, isAuthLoaded, isUserLoaded, getToken, setSession, clearSession, user]);

  // ── Token refresh effect ────────────────────────────────────────────────
  // Clerk access tokens expire every 60 seconds by default.
  // Refresh the stored token every 45 seconds so the store always has a fresh one.
  // The api.ts interceptor also gets a fresh token per-request, but this keeps
  // the stored accessToken usable for any component reading it directly.
  useEffect(() => {
    if (!clerkUser) return;

    const refreshToken = async () => {
      try {
        const token = await getToken();
        if (token && user) {
          setSession({ accessToken: token, user });
        }
      } catch {
        // silent — token refresh is best-effort
      }
    };

    const intervalId = setInterval(refreshToken, 45_000); // every 45 seconds
    return () => clearInterval(intervalId);
  }, [clerkUser, getToken, setSession, user]);

  // ── Error banner ────────────────────────────────────────────────────────
  if (syncError) {
    return (
      <div className="fixed top-4 right-4 z-[9999] max-w-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg dark:bg-red-900/30 dark:border-red-800 dark:text-red-300">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium">{syncError}</p>
        </div>
      </div>
    );
  }

  return null;
}
