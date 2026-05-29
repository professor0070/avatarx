import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function CookiesPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <Helmet>
        <title>Cookie Policy | AvatarX</title>
        <meta name="description" content="AvatarX Cookie Policy" />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Cookie Policy</h1>
        <p className="text-sm text-slate-500">Last updated: January 1, 2024</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">What Are Cookies</h2>
            <p>Cookies are small text files stored on your device by your web browser. They help websites remember your preferences, authenticate your session, and improve your browsing experience.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">How We Use Cookies</h2>
            <p>AvatarX uses cookies for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Essential Cookies:</strong> Required for platform operation, including authentication and security.</li>
              <li><strong>Preference Cookies:</strong> Remember your settings, theme preferences, and language choices.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform to improve it.</li>
              <li><strong>Functional Cookies:</strong> Enable features like live chat and real-time notifications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Third-Party Cookies</h2>
            <p>We may use third-party services (such as analytics providers) that set their own cookies. These are governed by the respective third-partys privacy policies. We do not control these cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Managing Cookies</h2>
            <p>You can control and manage cookies through your browser settings. Most browsers allow you to block or delete cookies. Note that disabling essential cookies may affect platform functionality.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Your Choices</h2>
            <p>By continuing to use AvatarX, you consent to our use of cookies as described in this policy. You can withdraw consent at any time by adjusting your browser settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Updates</h2>
            <p>We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated revision date.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Contact</h2>
            <p>For questions about our Cookie Policy, contact us at privacy@avatarx.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
