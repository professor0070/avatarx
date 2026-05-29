import { Helmet } from 'react-helmet-async';
import { SignIn } from '@clerk/clerk-react';

export function LoginPage() {
  return (
    <>
      <Helmet>
        <title>Login - AvatarX</title>
      </Helmet>
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-900">
        <div className="w-full max-w-md space-y-8 flex justify-center">
          <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" routing="path" path="/sign-in" />
        </div>
      </div>
    </>
  );
}
