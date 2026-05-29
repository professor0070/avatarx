import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Briefcase } from 'lucide-react';

export function CareersPage() {
  const navigate = useNavigate();

  const positions = [
    { title: 'Senior Full-Stack Developer', dept: 'Engineering', location: 'Remote', type: 'Full-time' },
    { title: 'Community Manager', dept: 'Community', location: 'Remote', type: 'Full-time' },
    { title: 'Product Designer', dept: 'Design', location: 'Remote', type: 'Full-time' },
    { title: 'Customer Support Lead', dept: 'Support', location: 'Remote', type: 'Full-time' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <Helmet>
        <title>Careers | AvatarX</title>
        <meta name="description" content="Join the AvatarX team and help build the future of IMVU freelancing" />
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Careers</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Help us empower the IMVU creator community. Join our remote-first team.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Open Positions</h2>
        <div className="space-y-4">
          {positions.map((p) => (
            <div key={p.title} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700">
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">{p.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {p.dept}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {p.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {p.type}</span>
                </div>
              </div>
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Apply</button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Dont see a role that fits? Send your resume to <span className="text-indigo-600 dark:text-indigo-400">careers@avatarx.com</span>
        </p>
      </div>
    </div>
  );
}
