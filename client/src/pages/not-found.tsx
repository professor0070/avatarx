import { Helmet } from 'react-helmet-async';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <Helmet>
        <title>Page not found | AvatarX</title>
        <meta name="description" content="The page you are looking for does not exist." />
      </Helmet>

      <div className="text-5xl font-extrabold text-slate-900 dark:text-white">404</div>
      <div className="max-w-lg text-sm text-slate-600 dark:text-slate-300">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </div>
    </div>
  );
}

