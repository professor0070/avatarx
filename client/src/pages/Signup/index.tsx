import { Helmet } from 'react-helmet-async';
import { SignUp } from '@clerk/clerk-react';

export function SignupPage() {
  return (
    <>
      <Helmet>
        <title>Sign Up - AvatarX</title>
      </Helmet>
      <div className="flex min-h-screen items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-900">
        <div className="w-full max-w-md space-y-8">
          <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" routing="path" path="/sign-up" />
        </div>
      </div>
    </>
  );
}
