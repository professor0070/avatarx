import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, CreditCard, User, FileText, MessageSquare, AlertTriangle } from 'lucide-react';

export function HelpPage() {
  const navigate = useNavigate();

  const categories = [
    { icon: User, title: 'Account & Profile', desc: 'Manage your account settings, password, and profile information.' },
    { icon: CreditCard, title: 'Payments & Billing', desc: 'Learn about pricing, payouts, transaction fees, and billing.' },
    { icon: Shield, title: 'Orders & Disputes', desc: 'Track orders, request revisions, and open disputes when needed.' },
    { icon: FileText, title: 'Gigs & Listings', desc: 'Create, manage, and optimize your gig listings for success.' },
    { icon: MessageSquare, title: 'Messaging & Communication', desc: 'Using the chat system, notifications, and buyer/seller communication.' },
    { icon: AlertTriangle, title: 'Safety & Reporting', desc: 'Report issues, understand our safety guidelines, and protect your account.' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <Helmet>
        <title>Help Center | AvatarX</title>
        <meta name="description" content="Get help with your AvatarX account, orders, payments, and more" />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Help Center</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Find answers to common questions and learn how to make the most of AvatarX.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((c) => (
          <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-indigo-100 p-2.5 dark:bg-indigo-900/50">
                <c.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">{c.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{c.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Still need help?</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Our support team is here for you</p>
        <button onClick={() => navigate('/contact')} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          Contact Support
        </button>
      </div>
    </div>
  );
}
