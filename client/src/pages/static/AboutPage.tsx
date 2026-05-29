import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Users, Zap, Globe, Award, Heart } from 'lucide-react';

export function AboutPage() {
  const navigate = useNavigate();

  const values = [
    { icon: Shield, title: 'Trust & Safety', desc: 'Every transaction is protected by our dispute resolution system and escrow-based payments.' },
    { icon: Users, title: 'Community First', desc: 'Built by the IMVU community, for the IMVU community. Your success is our mission.' },
    { icon: Zap, title: 'Fast & Reliable', desc: 'Real-time messaging, instant delivery options, and responsive support team.' },
    { icon: Globe, title: 'Global Reach', desc: 'Connect with talented creators and buyers from around the world.' },
    { icon: Award, title: 'Quality Assured', desc: 'Seller verification, portfolio reviews, and rating systems ensure top-quality services.' },
    { icon: Heart, title: 'Passion-Driven', desc: 'We are passionate about empowering creators to turn their skills into income.' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <Helmet>
        <title>About Us | AvatarX</title>
        <meta name="description" content="Learn about AvatarX - the premier freelance marketplace for the IMVU community" />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">About AvatarX</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          The premier freelance marketplace built exclusively for the IMVU community.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Our Mission</h2>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          AvatarX was created to bridge the gap between virtual metaverse talent and global opportunity. We provide a secure, 
          transparent platform where creators can monetize their skills — whether it is designing outfits, 
          building rooms, creating animations, or managing brands. Our mission is to empower every IMVU 
          enthusiast to turn their passion into a thriving freelance career.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">What We Stand For</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map((v) => (
            <div key={v.title} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/50">
                  <v.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{v.title}</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
