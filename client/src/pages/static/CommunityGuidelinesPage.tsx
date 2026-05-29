import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function CommunityGuidelinesPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Community Guidelines | AvatarX</title>
        <meta name="description" content="AvatarX Community Guidelines and rules of conduct." />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Community Guidelines</h1>
        <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900/50 shadow-sm">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6.1 Harassment & Hate Speech</h2>
            <p>AvatarX maintains a zero-tolerance policy for hate speech, targeted harassment, doxxing, or coordinating attacks against other users.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6.2 NSFW & Adult Content Restrictions</h2>
            <p>NSFW content is permitted strictly within designated, age-gated categories. Minors are prohibited from accessing or purchasing NSFW assets. All content must comply with local and international laws regarding explicit material.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6.3 Scam & Fraud Prevention</h2>
            <p>Phishing, spamming, distributing malicious files (malware/viruses), or deploying bots to artificially inflate gig rankings is strictly prohibited.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6.4 Impersonation & Deepfakes</h2>
            <p>You may not impersonate AvatarX staff, other creators, or public figures. The use of deepfakes or synthetic media to deceive or harass others will result in immediate termination.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6.5 Enforcement & Moderation Escalation</h2>
            <p>Violations may result in warnings, temporary suspensions, shadow-bans, asset delisting, or permanent termination. AvatarX moderators have absolute discretion in determining guideline violations.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
