import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Privacy Policy | AvatarX</title>
        <meta name="description" content="AvatarX Privacy Policy" />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Privacy Policy</h1>
        <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900/50 shadow-sm">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2.1 Data Collection</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Data:</strong> When you register, we collect your email, username, and password.</li>
              <li><strong>Creator Data:</strong> Creators monetizing on the platform must provide KYC (Know Your Customer) data, which may include legal name, address, tax identification, and government ID, processed securely via our payment partners (e.g., Stripe, Razorpay).</li>
              <li><strong>Communication & Telemetry:</strong> We collect chat logs, transaction histories, IP addresses, browser types, and usage telemetry to operate and secure the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2.2 Payment Information</h2>
            <p>AvatarX does not directly store full credit card numbers. All payment processing is handled by compliant third-party gateways. We store only transaction references and payout routing data.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2.3 Use of Data & Third-Party Integrations</h2>
            <p>We use your data to facilitate marketplace transactions, enforce Trust & Safety policies, and improve algorithms. We may share data with third-party service providers (e.g., hosting, analytics, compliance verification) strictly to operate the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2.4 Cookies & Analytics</h2>
            <p>We use cookies to maintain your session and track platform analytics. You may adjust browser settings to refuse cookies, though some platform features may become unavailable.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2.5 Data Retention & Security</h2>
            <p>We employ industry-standard encryption to protect your data. We retain transaction and account data for as long as your account is active, or as necessary to comply with legal obligations (e.g., tax reporting, anti-fraud investigations).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2.6 User Rights (GDPR/CCPA Considerations)</h2>
            <p>Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data. Please contact us to initiate a data request. We reserve the right to retain certain data if required by law or for fraud prevention.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2.7 Children's Privacy</h2>
            <p>AvatarX does not knowingly collect personal data from anyone under the age of 13 (or 16 in certain EU jurisdictions). If we discover an underage user, the account and associated data will be immediately deleted.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
