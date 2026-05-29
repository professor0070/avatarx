import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { FileText, User, Upload, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';

type Step = 'policy' | 'profile' | 'portfolio' | 'complete';

export function CreatorOnboardingPage() {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<Step>('policy');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [hasAcceptedPolicy, setHasAcceptedPolicy] = useState(false);
  const [bio, setBio] = useState<string>((user as any)?.bio || '');
  const [skills, setSkills] = useState<string>((user as any)?.skills?.join(', ') || '');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  const handleNextStep = () => {
    setError(null);
    if (currentStep === 'policy') {
      if (!hasAcceptedPolicy) {
        setError('You must read and accept the Creator Policy to proceed.');
        return;
      }
      setCurrentStep('profile');
    } else if (currentStep === 'profile') {
      if (!bio || !skills) {
        setError('Please fill in your bio and skills to continue.');
        return;
      }
      setCurrentStep('portfolio');
    } else if (currentStep === 'portfolio') {
      submitCreatorProfile();
    }
  };

  const handlePrevStep = () => {
    setError(null);
    if (currentStep === 'profile') setCurrentStep('policy');
    if (currentStep === 'portfolio') setCurrentStep('profile');
  };

  const submitCreatorProfile = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const skillsArray = skills.split(',').map((s: string) => s.trim()).filter(Boolean);
      const portfolioArray = portfolioUrl ? [{ url: portfolioUrl, type: 'image', title: 'Featured Work' }] : [];

      const response = await api.patch('/api/users/me/creator-profile', {
        hasAcceptedCreatorPolicy: hasAcceptedPolicy,
        bio,
        skills: skillsArray,
        portfolio: portfolioArray,
      });

      if (response.data.ok) {
        // Update local session
        if (accessToken && response.data.user) {
          setSession({ accessToken, user: response.data.user });
        }
        setCurrentStep('complete');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400">Please log in to continue.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <Helmet>
        <title>Creator Onboarding | AvatarX</title>
      </Helmet>

      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-800 -z-10 rounded-full" />
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-fuchsia-500 -z-10 rounded-full transition-all duration-500 ${
              currentStep === 'policy' ? 'w-0' : currentStep === 'profile' ? 'w-1/2' : 'w-full'
            }`} />
            
            <div className={`flex flex-col items-center gap-2 ${currentStep === 'policy' ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-slate-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-950 ${currentStep === 'policy' ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-slate-200 dark:bg-slate-800'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">Policy</span>
            </div>

            <div className={`flex flex-col items-center gap-2 ${currentStep === 'profile' ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-slate-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-950 ${currentStep === 'profile' ? 'bg-fuchsia-100 text-fuchsia-600' : currentStep === 'portfolio' || currentStep === 'complete' ? 'bg-fuchsia-500 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
                <User className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">Profile</span>
            </div>

            <div className={`flex flex-col items-center gap-2 ${currentStep === 'portfolio' ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-slate-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-950 ${currentStep === 'portfolio' ? 'bg-fuchsia-100 text-fuchsia-600' : currentStep === 'complete' ? 'bg-fuchsia-500 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">Portfolio</span>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 text-center text-sm font-medium border-b border-red-100 dark:border-red-900/50">
              {error}
            </div>
          )}

          <div className="p-8 sm:p-12">
            {/* Step 1: Policy */}
            {currentStep === 'policy' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Accept Creator Policy</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  To publish digital products and services on AvatarX, you must adhere to our strict Creator Quality Guidelines. By continuing, you agree to maintain high standards, respect intellectual property, and deliver exactly what is promised.
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 mb-8 h-48 overflow-y-auto text-sm text-slate-600 dark:text-slate-400 space-y-4">
                  <p>1. Quality Assurance: All digital assets must be fully tested and functional.</p>
                  <p>2. Copyright: You must own the rights to all materials you upload.</p>
                  <p>3. Delivery: Instant delivery files must be securely uploaded and virus-free.</p>
                  <p>4. Prohibited Content: No unauthorized rips or stolen meshes.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`mt-1 w-6 h-6 rounded flex items-center justify-center border transition-colors ${hasAcceptedPolicy ? 'bg-fuchsia-600 border-fuchsia-600' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 group-hover:border-fuchsia-500'}`}>
                    {hasAcceptedPolicy && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={hasAcceptedPolicy} onChange={(e) => setHasAcceptedPolicy(e.target.checked)} />
                  <span className="text-slate-700 dark:text-slate-300 select-none">
                    I have read, understood, and agree to abide by the AvatarX Creator Policy.
                  </span>
                </label>
              </motion.div>
            )}

            {/* Step 2: Profile */}
            {currentStep === 'profile' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Build Your Profile</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Creator Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell buyers about your experience and what you create..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Skills (Comma separated)</label>
                    <input
                      type="text"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="e.g. 3D Modeling, Texturing, Animation, Graphic Design"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Portfolio */}
            {currentStep === 'portfolio' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Link Your Portfolio</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Add a link to your best work to showcase your capabilities to potential buyers.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Portfolio Image/Video URL (Optional)</label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://example.com/my-portfolio.jpg"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 'complete' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">You're All Set!</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                  Your creator profile is fully configured. You can now start publishing your custom Metaverse services and digital products.
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors shadow-lg shadow-fuchsia-500/30"
                >
                  Go to Creator Dashboard
                </button>
              </motion.div>
            )}
          </div>

          {/* Navigation Footer */}
          {currentStep !== 'complete' && (
            <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 'policy'}
                className={`flex items-center gap-2 font-medium px-4 py-2 rounded-lg transition-colors ${currentStep === 'policy' ? 'opacity-0 pointer-events-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              
              <button
                onClick={handleNextStep}
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-fuchsia-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : currentStep === 'portfolio' ? (
                  'Complete Setup'
                ) : (
                  <>Continue <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
