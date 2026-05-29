import { type PropsWithChildren } from 'react';
import { useAuth, RedirectToSignIn } from '@clerk/clerk-react';
import { useAuthStore } from '../../store/authStore';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth();
  const user = useAuthStore((s) => s.user);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Check if user is signed in with Clerk AND synced to MongoDB
  if (isSignedIn && user) {
    return <>{children}</>;
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

  return <RedirectToSignIn />;
}
