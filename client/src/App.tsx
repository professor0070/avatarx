import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/Footer';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { HomePage } from './pages/Home';
import { AuthPage } from './pages/Auth';
import { NotFoundPage } from './pages/not-found';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminRoute } from './components/common/AdminRoute';
import { SellerRoute } from './components/common/SellerRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RoleInterceptor } from './components/common/RoleInterceptor';
import { AuthSync } from './components/common/AuthSync';
import { LenisProvider } from './components/LenisProvider';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';

const GigPage = lazy(() => import('./pages/Gig').then((m) => ({ default: m.GigPage })));
const CreateGigPage = lazy(() => import('./pages/CreateGig').then((m) => ({ default: m.CreateGigPage })));
const EditGigPage = lazy(() => import('./pages/EditGig').then((m) => ({ default: m.EditGigPage })));
const BrowsePage = lazy(() => import('./pages/Browse').then((m) => ({ default: m.BrowsePage })));
const CheckoutPage = lazy(() => import('./pages/Checkout').then((m) => ({ default: m.CheckoutPage })));
const MessagesPage = lazy(() => import('./pages/Messages').then((m) => ({ default: m.MessagesPage })));
const ProfilePage = lazy(() => import('./pages/Profile').then((m) => ({ default: m.ProfilePage })));
const DashboardPage = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage })));
const OrdersPage = lazy(() => import('./pages/Orders').then((m) => ({ default: m.OrdersPage })));
const EscrowTrackingView = lazy(() => import('./pages/Orders/[id]').then((m) => ({ default: m.default })));
const WishlistPage = lazy(() => import('./pages/Wishlist').then((m) => ({ default: m.WishlistPage })));
const AdminPage = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const BuyerRequestsPage = lazy(() => import('./pages/BuyerRequests').then((m) => ({ default: m.BuyerRequestsPage })));
const CreateBuyerRequestPage = lazy(() => import('./pages/CreateBuyerRequest').then((m) => ({ default: m.CreateBuyerRequestPage })));
const BuyerRequestDetailPage = lazy(() => import('./pages/BuyerRequestDetail').then((m) => ({ default: m.BuyerRequestDetailPage })));
const CustomOffersPage = lazy(() => import('./pages/CustomOffers').then((m) => ({ default: m.CustomOffersPage })));
const FreelancerProfilePage = lazy(() => import('./pages/FreelancerProfile').then((m) => ({ default: m.FreelancerProfilePage })));
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));
const VerificationPage = lazy(() => import('./pages/Verification').then((m) => ({ default: m.VerificationPage })));
const AssetUploadPage = lazy(() => import('./pages/AssetUpload').then((m) => ({ default: m.AssetUploadPage })));
const NotificationsPage = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.NotificationsPage })));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPassword').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/Auth/ResetPassword').then((m) => ({ default: m.ResetPasswordPage })));
const AboutPage = lazy(() => import('./pages/static/AboutPage').then((m) => ({ default: m.AboutPage })));
const HowItWorksPage = lazy(() => import('./pages/static/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage })));
const CareersPage = lazy(() => import('./pages/static/CareersPage').then((m) => ({ default: m.CareersPage })));
const HelpPage = lazy(() => import('./pages/static/HelpPage').then((m) => ({ default: m.HelpPage })));
const ContactPage = lazy(() => import('./pages/static/ContactPage').then((m) => ({ default: m.ContactPage })));
const FAQPage = lazy(() => import('./pages/static/FAQPage').then((m) => ({ default: m.FAQPage })));
const TermsAndPoliciesPage = lazy(() => import('./pages/terms').then((m) => ({ default: m.default })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy })));
const CookiesPage = lazy(() => import('./pages/static/CookiesPage').then((m) => ({ default: m.CookiesPage })));
const CreatorPolicyPage = lazy(() => import('./pages/static/CreatorPolicyPage').then((m) => ({ default: m.CreatorPolicyPage })));
const RefundPolicyPage = lazy(() => import('./pages/static/RefundPolicyPage').then((m) => ({ default: m.RefundPolicyPage })));
const CommunityGuidelinesPage = lazy(() => import('./pages/static/CommunityGuidelinesPage').then((m) => ({ default: m.CommunityGuidelinesPage })));
const LoginPage = lazy(() => import('./pages/Login').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/Signup').then((m) => ({ default: m.SignupPage })));
const CreatorOnboardingPage = lazy(() => import('./pages/CreatorOnboarding').then((m) => ({ default: m.CreatorOnboardingPage })));
const LeaderboardPage = lazy(() => import('./pages/Leaderboard').then((m) => ({ default: m.LeaderboardPage })));
const CreatorDashboard = lazy(() => import('./components/creator/CreatorDashboard').then((m) => ({ default: m.CreatorDashboard })));
import { TestConsole } from './components/debug/TestConsole';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><BrowsePage /></Suspense></ErrorBoundary>} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>} />
          <Route path="/auth/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />
          <Route path="/gig/:gigId" element={<Suspense fallback={<PageLoader />}><GigPage /></Suspense>} />
          <Route path="/buyer-requests" element={<Suspense fallback={<PageLoader />}><BuyerRequestsPage /></Suspense>} />
          <Route path="/buyer-requests/create" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><CreateBuyerRequestPage /></Suspense></ProtectedRoute>} />
          <Route path="/buyer-requests/:requestId" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><BuyerRequestDetailPage /></Suspense></ProtectedRoute>} />
          <Route path="/custom-offers" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><CustomOffersPage /></Suspense></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<Suspense fallback={<PageLoader />}><FreelancerProfilePage /></Suspense>} />
          <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><SettingsPage /></Suspense></ProtectedRoute>} />
          <Route path="/verification" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><VerificationPage /></Suspense></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense></ProtectedRoute>} />
          <Route path="/asset-upload" element={<SellerRoute allowedRoles={['seller', 'creator', 'admin', 'super_admin']}><Suspense fallback={<PageLoader />}><AssetUploadPage /></Suspense></SellerRoute>} />
          <Route path="/create-gig" element={<SellerRoute allowedRoles={['seller', 'creator', 'admin', 'super_admin']}><Suspense fallback={<PageLoader />}><CreateGigPage /></Suspense></SellerRoute>} />
          <Route path="/edit-gig/:gigId" element={<SellerRoute allowedRoles={['seller', 'creator', 'admin', 'super_admin']}><Suspense fallback={<PageLoader />}><EditGigPage /></Suspense></SellerRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><ErrorBoundary><Suspense fallback={<PageLoader />}><CheckoutPage /></Suspense></ErrorBoundary></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><MessagesPage /></Suspense></ProtectedRoute>} />
          <Route path="/messages/:conversationId" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><MessagesPage /></Suspense></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ProfilePage /></Suspense></ProtectedRoute>} />
          <Route path="/dashboard" element={<Navigate to="/dashboard/user" replace />} />
          <Route path="/dashboard/user" element={<ProtectedRoute><ErrorBoundary><Suspense fallback={<PageLoader />}><DashboardPage /></Suspense></ErrorBoundary></ProtectedRoute>} />
          <Route path="/dashboard/creator" element={<SellerRoute><ErrorBoundary><Suspense fallback={<PageLoader />}><CreatorDashboard /></Suspense></ErrorBoundary></SellerRoute>} />
          <Route path="/orders" element={<ProtectedRoute><ErrorBoundary><Suspense fallback={<PageLoader />}><OrdersPage /></Suspense></ErrorBoundary></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><ErrorBoundary><Suspense fallback={<PageLoader />}><EscrowTrackingView /></Suspense></ErrorBoundary></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><ErrorBoundary><Suspense fallback={<PageLoader />}><AdminPage /></Suspense></ErrorBoundary></AdminRoute>} />
          <Route path="/admin-verifications" element={<AdminRoute><ErrorBoundary><Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense></ErrorBoundary></AdminRoute>} />
          <Route path="/about" element={<Suspense fallback={<PageLoader />}><AboutPage /></Suspense>} />
          <Route path="/how-it-works" element={<Suspense fallback={<PageLoader />}><HowItWorksPage /></Suspense>} />
          <Route path="/careers" element={<Suspense fallback={<PageLoader />}><CareersPage /></Suspense>} />
          <Route path="/help" element={<Suspense fallback={<PageLoader />}><HelpPage /></Suspense>} />
          <Route path="/contact" element={<Suspense fallback={<PageLoader />}><ContactPage /></Suspense>} />
          <Route path="/faq" element={<Suspense fallback={<PageLoader />}><FAQPage /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsAndPoliciesPage /></Suspense>} />
          <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
          <Route path="/cookies" element={<Suspense fallback={<PageLoader />}><CookiesPage /></Suspense>} />
          <Route path="/creator-policy" element={<Suspense fallback={<PageLoader />}><CreatorPolicyPage /></Suspense>} />
          <Route path="/creator-onboarding" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><CreatorOnboardingPage /></Suspense></ProtectedRoute>} />
          <Route path="/refund-policy" element={<Suspense fallback={<PageLoader />}><RefundPolicyPage /></Suspense>} />
          <Route path="/community-guidelines" element={<Suspense fallback={<PageLoader />}><CommunityGuidelinesPage /></Suspense>} />
          <Route path="/sign-up/*" element={<Suspense fallback={<PageLoader />}><SignupPage /></Suspense>} />
          <Route path="/sign-in/*" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
          <Route path="/leaderboard" element={<Suspense fallback={<PageLoader />}><LeaderboardPage /></Suspense>} />
          <Route path="/wishlist" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><WishlistPage /></Suspense></ProtectedRoute>} />
          <Route path="/debug/test-console" element={<TestConsole />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  const { theme, setTheme } = useThemeStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [health, setHealth] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    const saved = window.localStorage.getItem('avatarx.theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? setHealth('ok') : setHealth('error')))
      .catch(() => setHealth('error'));
  }, []);

  return (
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SocketProvider>
          <NotificationProvider>
          <LenisProvider>
            <AuthSync />
            <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
              <RoleInterceptor />
              <Navbar />
              <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex-grow">
                {/* API health indicator — visible to admin and super_admin only */}
                {isAdmin && (
                  <div className="mb-4 flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-500 dark:text-gray-400">API:</span>
                    {health === 'loading' && (
                      <span className="text-yellow-500">checking…</span>
                    )}
                    {health === 'ok' && (
                      <span className="flex items-center gap-1 text-green-600">
                        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                        connected
                      </span>
                    )}
                    {health === 'error' && (
                      <span className="flex items-center gap-1 text-red-600">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                        disconnected
                      </span>
                    )}
                  </div>
                )}
                <ErrorBoundary>
                  <AnimatedRoutes />
                </ErrorBoundary>
              </main>
              <Footer />
            </div>
          </LenisProvider>
          </NotificationProvider>
          </SocketProvider>
        </BrowserRouter>
        </QueryClientProvider>
      </HelmetProvider>
  );
}
