import { useEffect, type PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, RedirectToSignIn } from '@clerk/clerk-react';
import { useAuthStore } from '../../store/authStore';

interface SellerRouteProps extends PropsWithChildren {
  allowedRoles?: string[];
}

/**
 * SellerRoute — Route guard that allows specified roles.
 * By default allows seller, creator, admin, super_admin.
 * Unauthorized roles are silently redirected to /dashboard/user.
 * Unauthenticated users are redirected to sign-in.
 */
export function SellerRoute({ 
  children, 
  allowedRoles = ['seller', 'creator', 'admin', 'super_admin'] 
}: SellerRouteProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const hasAllowedRole = user.roles?.some(role => allowedRoles.includes(role)) ?? false;
      if (!hasAllowedRole) {
        // Unauthorized role — redirect silently to their dashboard
        navigate('/dashboard/user', { replace: true });
      }
    }
  }, [isLoaded, isSignedIn, user, navigate, allowedRoles]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
      </div>
    );
  }

  // Signed in but MongoDB user not yet synced — show loading
  if (isSignedIn && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Syncing your account...</p>
        </div>
      </div>
    );
  }

  if (isSignedIn && user) {
    const hasAllowedRole = user.roles?.some(role => allowedRoles.includes(role)) ?? false;
    return hasAllowedRole ? <>{children}</> : null;
  }

  return <RedirectToSignIn />;
}
