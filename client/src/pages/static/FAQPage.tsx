import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'What is AvatarX?',
    a: 'AvatarX is a freelance marketplace built exclusively for the IMVU community. It connects IMVU creators with buyers looking for services like outfit design, room building, animation, brand management, and more.',
  },
  {
    q: 'How do I get started as a seller?',
    a: 'Create an account, complete your seller profile, and create your first gig. Make sure to include clear descriptions, pricing tiers, and portfolio samples to attract buyers.',
  },
  {
    q: 'How do payments work?',
    a: 'Payments are processed securely through our platform. Buyers pay upfront, and funds are held in escrow until the order is completed and approved. Sellers can withdraw their earnings to their linked payment method.',
  },
  {
    q: 'What fees does AvatarX charge?',
    a: 'AvatarX charges a competitive service fee on each transaction. The exact percentage is displayed during checkout. There are no fees for browsing, messaging, or creating an account.',
  },
  {
    q: 'How is dispute resolution handled?',
    a: 'If a dispute arises, both parties can submit evidence through our dispute resolution system. Our team reviews the case and makes a fair decision. We aim to resolve disputes within 48 hours.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Refund eligibility depends on the order status and seller agreement. If the seller has not started work, a full refund is available. For in-progress or completed orders, refunds are handled through the dispute process.',
  },
  {
    q: 'How do I verify my account?',
    a: 'Account verification can be completed through the Verification page. You will need to verify your email, Cloudinary account, age (18+), and government-issued ID for certain features.',
  },
  {
    q: 'What is adult content policy?',
    a: 'Sellers can offer adult content services, but they must be properly tagged. Adult content gigs are only visible to age-verified users who have opted in to view adult content.',
  },
  {
    q: 'How do I contact support?',
    a: 'You can reach our support team through the Contact page, by emailing support@avatarx.com, or through the live chat feature available during business hours.',
  },
];

export function FAQPage() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <Helmet>
        <title>FAQ | AvatarX</title>
        <meta name="description" content="Frequently asked questions about AvatarX" />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Everything you need to know about using AvatarX.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {faqs.map((faq, i) => (
          <div key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-4 text-left"
            >
              <span className="font-medium text-slate-900 dark:text-white">{faq.q}</span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
            </button>
            {openIndex === i && (
              <div className="px-6 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
