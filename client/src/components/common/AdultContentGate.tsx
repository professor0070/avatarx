import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { AlertTriangle, Check } from 'lucide-react';

interface AdultContentGateProps {
  children: React.ReactNode;
  content: {
    isAdultContent: boolean;
    category?: string;
  };
  onVerified?: () => void;
}

export function AdultContentGate({ children, content, onVerified }: AdultContentGateProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If not adult content, show children directly
  if (!content.isAdultContent) {
    return <>{children}</>;
  }

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="mb-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-600 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-white" strokeWidth={1.1} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-200 mb-4">
          Adult Content - Login Required
        </h2>
        
        <p className="text-amber-900/80 dark:text-amber-100/80 mb-6 max-w-md mx-auto">
          This content contains adult material. You must be logged in and verified to access it.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/auth')}
            className="rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-700"
          >
            Login to Continue
          </button>
          <button
            onClick={() => navigate('/browse')}
            className="rounded-lg border border-amber-200 bg-white px-6 py-3 font-semibold text-amber-900 hover:border-amber-300 dark:border-amber-800 dark:bg-slate-950 dark:text-amber-200"
          >
            Browse Other Gigs
          </button>
        </div>
      </div>
    );
  }

  // Check if user is age verified and has required badges
  const isAgeVerified = user.isAgeVerified;
  const adultBadges = ['AP', 'VIP', 'Marriage Pack'];
  const hasAdultBadge = user.badges.some((badge: string) => adultBadges.includes(badge));

  // If user is verified, show content
  if (isAgeVerified && hasAdultBadge) {
    return <>{children}</>;
  }

  // Show verification prompt
  const handleAgeVerification = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      // Check if user meets requirements
      if (!isAgeVerified) {
        setError('Age verification required. Please verify your age in your profile settings.');
        return;
      }

      if (!hasAdultBadge) {
        setError('Adult badge required. Please acquire an AP, VIP, or Marriage Pack badge to access adult content.');
        return;
      }

      // If all checks pass, call onVerified callback
      onVerified?.();
    } catch {
      setError('Failed to verify access. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="mb-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-amber-600 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-white" strokeWidth={1.1} />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-200 mb-4">
        18+ Adult Content
      </h2>

      <p className="text-amber-900/80 dark:text-amber-100/80 mb-6 max-w-md mx-auto">
        This content contains adult material. Access is restricted to users who are age verified (18+) and have the required badges.
      </p>

      {/* Verification Status */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isAgeVerified ? 'bg-green-600' : 'bg-slate-300'
          }`}>
            {isAgeVerified && (
              <Check className="w-4 h-4 text-white fill-white" strokeWidth={1.1} />
            )}
          </div>
          <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Age Verified (18+)
          </span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            hasAdultBadge ? 'bg-green-600' : 'bg-slate-300'
          }`}>
            {hasAdultBadge && (
              <Check className="w-4 h-4 text-white fill-white" strokeWidth={1.1} />
            )}
          </div>
          <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Adult Badge (AP/VIP/Marriage Pack)
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleAgeVerification}
          disabled={isVerifying}
          className="rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? 'Verifying...' : 'Verify Access'}
        </button>
        
        <button
          onClick={() => navigate('/profile')}
          className="rounded-lg border border-amber-200 bg-white px-6 py-3 font-semibold text-amber-900 hover:border-amber-300 dark:border-amber-800 dark:bg-slate-950 dark:text-amber-200"
        >
          Update Profile
        </button>
        
        <button
          onClick={() => navigate('/browse')}
          className="rounded-lg border border-amber-200 bg-white px-6 py-3 font-semibold text-amber-900 hover:border-amber-300 dark:border-amber-800 dark:bg-slate-950 dark:text-amber-200"
        >
          Browse Other Gigs
        </button>
      </div>

      <div className="mt-6 text-xs text-amber-900/60 dark:text-amber-100/60">
        By accessing adult content, you confirm that you are 18+ and have the required verification.
      </div>
    </div>
  );
}
