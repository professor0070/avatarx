import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function CreatorPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Creator Policy | AvatarX</title>
        <meta name="description" content="AvatarX Creator Policy and monetization rules." />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Creator Policy</h1>
        <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900/50 shadow-sm">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4.1 Creator Eligibility & Responsibilities</h2>
            <p>To monetize on AvatarX, Creators must be in good standing, pass any required KYC verifications, and strictly adhere to this Creator Policy. Creators are solely responsible for ensuring their uploads do not violate third-party IP rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4.2 Prohibited Uploads & Copyright Rules</h2>
            <p>Creators may not upload:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Assets ripped, stolen, or improperly ported from other games (including IMVU).</li>
              <li>Copyrighted or trademarked material without explicit commercial licenses.</li>
              <li>Defamatory, illegal, or grossly offensive material.</li>
            </ul>
            <p className="mt-4 font-semibold">AvatarX processes all valid DMCA takedown requests and actively terminates repeat infringers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4.3 Payouts, Commissions, & Tax Responsibility</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Platform Fees:</strong> AvatarX deducts a set commission from every sale.</li>
              <li><strong>Payouts:</strong> Payouts are subject to a clearing period (e.g., 14 days) to clear escrow and prevent chargeback fraud.</li>
              <li><strong>Taxes:</strong> Creators are strictly independent contractors. Creators are 100% responsible for calculating, reporting, and remitting all local, state, and international taxes (including VAT/Sales Tax) arising from their sales.</li>
            </ul>
          </section>

          <section className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 my-8">
            <h2 className="text-lg font-bold text-red-900 dark:text-red-100 mt-0 mb-3">4.4 Off-Platform Transaction Restrictions</h2>
            <p className="text-red-800 dark:text-red-200 mb-0">
              Directing AvatarX users to complete transactions off-platform (e.g., via CashApp, PayPal, or Crypto wallets) to bypass platform fees is strictly prohibited. Violators face immediate permanent bans and forfeiture of all pending payouts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4.5 AI-Generated Content Rules</h2>
            <p>If a creator uses AI to generate assets or promotional material, the creator retains full liability for that content. AI content must not infringe on the likeness, voice, or copyright of any real person or entity.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4.6 KYC Verification & Fraud Protections</h2>
            <p>AvatarX reserves the right to mandate identity verification for any creator at any time. We reserve the right to freeze payouts, reverse transactions, and lock accounts suspected of money laundering, fake engagement, or chargeback manipulation.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
