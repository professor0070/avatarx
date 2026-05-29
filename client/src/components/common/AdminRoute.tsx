import { useEffect, type PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, RedirectToSignIn } from '@clerk/clerk-react';
import { useAuthStore } from '../../store/authStore';

export function AdminRoute({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { isLoaded, isSignedIn } = useAuth();
  
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      if (!user.roles?.includes('admin') && !user.roles?.includes('super_admin')) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If signed in with Clerk but not synced to MongoDB, show loading
  if (isSignedIn && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Syncing your account...</p>
        </div>
      </div>
    );
  }

  if (isSignedIn && user) {
    return user.roles?.includes('admin') || user.roles?.includes('super_admin') ? <>{children}</> : null;
  }

  return <RedirectToSignIn />;
}
