import { useAuthStore } from '../store/authStore';
import type { AvatarXRole } from '../types/auth';

export function useRole() {
  const user = useAuthStore((s) => s.user);

  return {
    activeRole: user?.activeRole ?? 'buyer',
    roles: user?.roles ?? ['buyer'],
    hasRole: (role: string) => user?.roles?.includes(role as AvatarXRole) ?? false,
    isSeller: user?.roles?.includes('seller') || user?.roles?.includes('creator'),
    isBuyer: user?.roles?.includes('buyer'),
    isAdmin: user?.roles?.includes('admin') || user?.roles?.includes('super_admin'),
  };
}
