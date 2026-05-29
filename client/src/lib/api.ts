import axios, { type AxiosHeaders } from 'axios';
import { useAuthStore } from '../store/authStore';

const apiBaseUrl = import.meta.env.VITE_API_URL as string | undefined;

export const api = axios.create({
  baseURL: apiBaseUrl ?? '',
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  // Try to get token from Clerk first (it auto-refreshes if expired)
  let token: string | null | undefined = null;
  
  if (typeof window !== 'undefined' && (window as any).Clerk?.session) {
    try {
      token = await (window as any).Clerk.session.getToken();
    } catch (err) {
      console.warn('Failed to get Clerk token:', err);
    }
  }

  // Fallback to legacy AuthStore token (if still needed during transition)
  if (!token) {
    const { accessToken } = useAuthStore.getState();
    token = accessToken;
  }

  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as AxiosHeaders).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear the LOCAL auth store — do NOT call Clerk.signOut().
      // Calling Clerk.signOut() on any 401 causes spurious logouts when:
      //   - The Clerk token is briefly refreshing (race condition on page load)
      //   - A protected endpoint returns 401 because the user lacks a role
      //   - Any transient network error briefly drops the auth header
      // Clerk manages its own session lifecycle. If the session truly expires,
      // the Clerk SDK will redirect to sign-in on its own.
      useAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  }
);
