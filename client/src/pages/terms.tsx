import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Store } from 'lucide-react';

export default function TermsAndPoliciesPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Terms & Policies | AvatarX</title>
        <meta name="description" content="AvatarX Terms & Policies: Trust & Safety, DMCA, and Seller Portal Terms" />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Terms & Policies</h1>
        <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-md p-8 dark:border-slate-800 dark:bg-slate-900/50 shadow-sm">
        <div className="space-y-12">
          
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/50">
                <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">1. Trust & Safety Guidelines for Virtual Traders</h2>
            </div>
            <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                AvatarX prioritizes the safety and security of all participants in our virtual marketplace. 
                Our Trust & Safety framework ensures that all trades are conducted securely via our escrow protocol.
              </p>
              <ul>
                <li>Never share your account credentials or personal information with other users.</li>
                <li>All payments must remain strictly within the AvatarX platform.</li>
                <li>Hate speech, harassment, and discriminatory behavior are strictly prohibited.</li>
                <li>Fraudulent chargebacks or attempts to bypass the escrow system will result in immediate permanent suspension.</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/50">
                <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">2. DMCA & Digital Asset Copyright Protection Procedures</h2>
            </div>
            <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                AvatarX respects intellectual property rights and complies strictly with the Digital Millennium Copyright Act (DMCA). 
                We provide a streamlined mechanism for original copyright holders to report infringing digital assets or virtual goods.
              </p>
              <p>
                If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement and is accessible via the Service, please notify our Copyright Agent with the following information:
              </p>
              <ul>
                <li>A physical or electronic signature of a person authorized to act on behalf of the copyright owner.</li>
                <li>Identification of the copyrighted work claimed to have been infringed.</li>
                <li>Identification of the material that is claimed to be infringing.</li>
                <li>Contact information including your address, telephone number, and email.</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/50">
                <Store className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">3. Metaverse Seller Portal Merchant Terms</h2>
            </div>
            <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                By onboarding as a creator in the AvatarX Seller Portal, you agree to uphold the highest standards of professional conduct and service delivery.
              </p>
              <ul>
                <li><strong>Asset Delivery:</strong> All digital goods must be delivered within the promised timeframe. Failure to do so will automatically refund the buyer from the locked escrow ledger.</li>
                <li><strong>Quality Assurance:</strong> Listed assets must accurately reflect the portfolio imagery and descriptions provided.</li>
                <li><strong>Dispute Adjudication:</strong> In the event of a dispute, sellers must provide verifiable evidence of delivery and communication. AvatarX administrative rulings are final and binding.</li>
                <li><strong>Platform Fees:</strong> Standard commission rates apply to all successful transactions and will be automatically deducted before final ledger clearance.</li>
              </ul>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
