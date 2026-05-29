import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Terms of Service | AvatarX</title>
        <meta name="description" content="AvatarX Terms of Service" />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Terms of Service</h1>
        <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900/50 shadow-sm">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          
          <p className="text-base font-medium">
            Welcome to AvatarX. These Terms of Service ("Terms") govern your access to and use of the AvatarX platform, website, and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms.
          </p>

          <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 my-8">
            <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100 mt-0 mb-3">1.1 Independent Platform Disclaimer</h2>
            <p className="text-amber-800 dark:text-amber-200 mb-0">
              AvatarX is an independent virtual marketplace platform. <strong>AvatarX is NOT affiliated with, endorsed by, associated with, sponsored by, or connected to IMVU, Second Life, Roblox, or any other third-party virtual platform, metaverse, or software provider.</strong> All third-party trademarks, logos, and brand names are the property of their respective owners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1.2 Eligibility & Account Rules</h2>
            <p>You must be at least 13 years old to use the Service (or older if required by your local jurisdiction). By creating an account, you represent that you meet this age requirement. You are solely responsible for maintaining the confidentiality of your account credentials. You may not share, sell, or transfer your account. AvatarX reserves the right to suspend or terminate accounts that provide false information or violate these Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1.3 Virtual Goods & Digital Asset Licensing</h2>
            <p>AvatarX operates a marketplace for virtual goods, 3D assets, and digital content (collectively, "Digital Assets").</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>No Real-World Ownership:</strong> Purchasing or acquiring Digital Assets grants you a limited, non-exclusive, non-transferable, revocable license to use the Digital Assets solely within the AvatarX ecosystem. You do not acquire real-world property rights, ownership, or equity in any Digital Assets.</li>
              <li><strong>Platform Rights:</strong> AvatarX reserves the right to modify, restrict, delist, or delete any Digital Asset at our sole discretion, without liability for any perceived loss of value.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1.4 User & Creator Responsibilities</h2>
            <p>Users must adhere to our Community Guidelines. Creators uploading content must adhere to our Creator Policy. You retain intellectual property rights to your original content; however, by uploading content to AvatarX, you grant us a worldwide, royalty-free, perpetual, sublicensable license to host, display, distribute, and monetize your content on the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1.5 Moderation Authority & Termination Rights</h2>
            <p>AvatarX reserves the absolute right, but not the obligation, to monitor, review, and remove any content or user from the platform at our sole discretion, with or without notice. We may suspend or terminate your access to the Service at any time for any reason, including violations of these Terms or actions that pose a legal, financial, or reputational risk to the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1.6 Payment, Refunds, and Platform Reserves</h2>
            <p>All transactions are subject to our Refund Policy. AvatarX processes payments via third-party providers (e.g., Razorpay, Stripe). We reserve the right to institute payout holds, maintain platform reserve funds, and freeze accounts suspected of fraud, chargeback abuse, or money laundering.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1.7 Service Interruption Disclaimer</h2>
            <p>The Service is provided on an "AS-IS" and "AS-AVAILABLE" basis. We do not guarantee that the Service will be uninterrupted, error-free, or secure. AvatarX reserves the right to pause, modify, or discontinue the Service (or any part thereof) at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1.8 Limitation of Liability</h2>
            <p className="uppercase font-semibold">
              To the maximum extent permitted by law, AvatarX and its founders, employees, and investors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, resulting from (A) your use or inability to use the service; (B) any conduct or content of any third party; or (C) unauthorized access to your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1.9 Indemnification</h2>
            <p>You agree to indemnify and hold harmless AvatarX from any claims, damages, or legal fees arising from your use of the Service, your violation of these Terms, or your infringement of any intellectual property rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1.10 Dispute Resolution & Arbitration</h2>
            <p>Any dispute arising out of these Terms shall be resolved through binding, individual arbitration. <strong>Class actions and representative actions are strictly prohibited.</strong></p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1.11 Policy Modifications</h2>
            <p>AvatarX reserves the right to update these Terms at any time. Continued use of the Service after updates constitutes acceptance of the revised Terms.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
