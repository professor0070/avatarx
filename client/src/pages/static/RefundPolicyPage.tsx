import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function RefundPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Refund Policy | AvatarX</title>
        <meta name="description" content="AvatarX Refund & Virtual Goods Policy." />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Refund Policy</h1>
        <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900/50 shadow-sm">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5.1 Digital Goods Non-Refundability</h2>
            <p className="font-semibold uppercase tracking-wide">
              Due to the irrevocable nature of digital goods, all sales of virtual assets, custom gigs, and digital downloads are final and non-refundable once the asset is delivered or downloaded, except where legally mandated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5.2 Exceptional Refund Situations</h2>
            <p>Refunds may only be granted at AvatarX's sole discretion under the following conditions:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>The digital file is demonstrably corrupt or completely fails to match the listing description.</li>
              <li>The order was mutually canceled by both the Buyer and Creator before delivery.</li>
              <li>AvatarX determines the transaction was fraudulent.</li>
            </ul>
          </section>

          <section className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 my-8">
            <h2 className="text-lg font-bold text-red-900 dark:text-red-100 mt-0 mb-3">5.3 Chargeback Abuse Protections</h2>
            <p className="text-red-800 dark:text-red-200 mb-0">
              Filing a fraudulent chargeback or payment dispute with your bank/credit card company for a delivered digital good constitutes fraud. AvatarX aggressively disputes fraudulent chargebacks and will permanently ban any account (and ban the associated IP/hardware) that initiates an unauthorized chargeback.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
