import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, CreditCard, MessageSquare, CheckCircle, Package, DollarSign } from 'lucide-react';

export function HowItWorksPage() {
  const navigate = useNavigate();

  const buyerSteps = [
    { icon: Search, title: 'Browse Gigs', desc: 'Explore thousands of services offered by talented IMVU creators. Filter by category, price, and seller ratings.' },
    { icon: CreditCard, title: 'Place an Order', desc: 'Select a pricing tier that fits your needs, add any extras, and complete checkout securely.' },
    { icon: MessageSquare, title: 'Collaborate', desc: 'Communicate directly with the seller through our built-in messaging system to share requirements.' },
    { icon: CheckCircle, title: 'Get Delivered', desc: 'Receive your completed work. Review and approve, or request revisions if needed.' },
  ];

  const sellerSteps = [
    { icon: Package, title: 'Create a Gig', desc: 'Showcase your skills by creating a detailed gig with pricing tiers, portfolio samples, and clear descriptions.' },
    { icon: MessageSquare, title: 'Get Orders', desc: 'Receive orders from buyers. Communicate requirements and set expectations before starting.' },
    { icon: DollarSign, title: 'Deliver & Earn', desc: 'Complete the work, deliver on time, and get paid. Build your reputation with every successful order.' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <Helmet>
        <title>How It Works | AvatarX</title>
        <meta name="description" content="Learn how AvatarX works - from browsing gigs to getting paid" />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">How It Works</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Whether you are buying or selling, AvatarX makes it easy to get started.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">For Buyers</h2>
        <div className="space-y-6">
          {buyerSteps.map((step, i) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">{i + 1}</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <step.icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">For Sellers</h2>
        <div className="space-y-6">
          {sellerSteps.map((step, i) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">{i + 1}</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <step.icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
