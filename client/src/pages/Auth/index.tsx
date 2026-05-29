import { Helmet } from 'react-helmet-async';
import { SignIn } from '@clerk/clerk-react';

export function AuthPage() {
  return (
    <>
      <Helmet>
        <title>Sign In - AvatarX</title>
      </Helmet>
      <div className="flex min-h-screen items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-900">
        <div className="w-full max-w-md space-y-8">
          <SignIn signUpUrl="/signup" fallbackRedirectUrl="/dashboard" />
        </div>
      </div>
    </>
  );
}
