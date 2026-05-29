import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-screen ml-[calc(50%-50vw)] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      {/* Top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">

          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AvatarX</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              The premier marketplace for IMVU services, digital products, and custom creations.
            </p>
            <p className="text-xs text-slate-500 mt-4">
              Not affiliated with IMVU, Second Life, or Roblox.
            </p>
          </div>

          {/* AvatarX Column */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">AvatarX</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/trust-safety" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                  Trust &amp; Safety
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/terms" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/community-guidelines" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Creators Column */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">Creators</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/creator-policy" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                  Creator Policy
                </Link>
              </li>
              <li>
                <Link to="/dmca" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                  DMCA / Copyright
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                  Seller Portal
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-14 border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            &copy; {currentYear} AvatarX Marketplace. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/terms" className="text-sm text-slate-500 hover:text-indigo-400 transition-colors">Terms</Link>
            <Link to="/privacy" className="text-sm text-slate-500 hover:text-indigo-400 transition-colors">Privacy</Link>
            <Link to="/cookies" className="text-sm text-slate-500 hover:text-indigo-400 transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
