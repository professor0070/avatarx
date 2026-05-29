import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AvatarXUser } from '../types/auth';

export type AuthSession = {
  accessToken: string | null;
  user: AvatarXUser | null;
};

type AuthState = AuthSession & {
  activeMode: 'buyer' | 'creator';
  setActiveMode: (mode: 'buyer' | 'creator') => void;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      activeMode: 'buyer',
      setActiveMode: (mode) => set({ activeMode: mode }),
      setSession: (session) => set({
        accessToken: session.accessToken,
        user: session.user,
        activeMode: (session.user?.activeRole === 'seller' || session.user?.activeRole === 'creator') ? 'creator' : 'buyer',
      }),
      clearSession: () => set({ accessToken: null, user: null, activeMode: 'buyer' }),
    }),
    {
      name: 'avatarx-auth-v1',        // localStorage key
      // Only persist the user profile and activeMode — NOT the access token
      partialize: (state) => ({ user: state.user, activeMode: state.activeMode }),
    }
  )
);
