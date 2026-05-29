import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function VerificationPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [cloudinaryUsername, setCloudinaryUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState('');

  // Fetch current verification status
  const { data: verificationData, refetch: refetchVerification } = useQuery({
    queryKey: ['verification-status'],
    queryFn: async () => {
      const response = await api.get('/api/verification/status');
      return response.data;
    },
    enabled: !!user,
  });

  const verification = verificationData?.verification || {
    email: false,
    cloudinary: false,
    age: false,
    id: false,
    profile: false,
    badge: false,
  };

  // Mutations for various verifications
  const emailMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/verification/email/request');
      return response.data;
    },
    onSuccess: () => {
      alert('Verification email sent! Please check your inbox.');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      alert(error.response?.data?.error?.message || 'Failed to send verification email.');
    },
  });

  const cloudinaryMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/verification/cloudinary', {
        cloudinaryUsername,
      });
      return response.data;
    },
    onSuccess: () => {
      refetchVerification();
      alert('Cloudinary account verified successfully!');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      alert(error.response?.data?.error?.message || 'Failed to verify Cloudinary account.');
    },
  });

  const ageMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/verification/age', {
        dateOfBirth,
      });
      return response.data;
    },
    onSuccess: () => {
      refetchVerification();
      alert('Age verified successfully!');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      alert(error.response?.data?.error?.message || 'Failed to verify age.');
    },
  });

  const idMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/verification/id', {
        idNumber,
        idType,
      });
      return response.data;
    },
    onSuccess: () => {
      refetchVerification();
      alert('ID verification submitted successfully!');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      alert(error.response?.data?.error?.message || 'Failed to submit ID verification.');
    },
  });

  const profileMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/verification/profile/request');
      return response.data;
    },
    onSuccess: () => {
      refetchVerification();
      alert('Profile verification badge requested!');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      alert(error.response?.data?.error?.message || 'Failed to request badge.');
    },
  });

  const becomeSellerMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/users/become-seller');
      return response.data;
    },
    onSuccess: (data) => {
      // Update local store user object with new role
      useAuthStore.getState().setSession({ 
        accessToken: useAuthStore.getState().accessToken || '', 
        user: data.user 
      });
      alert('Congratulations! You are now a seller.');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      alert(error.response?.data?.error?.message || 'Failed to upgrade to seller.');
    },
  });

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-slate-600 dark:text-slate-400">Please log in to access verification</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Helmet>
        <title>Verification - AvatarX</title>
        <meta name="description" content="Verify your account" />
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Account Verification
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Complete verifications to build trust and unlock features
          </p>
        </div>

        {/* Verification Status Overview */}
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Verification Progress</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className={`rounded-lg p-4 ${verification.email ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Email</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{verification.email ? '✓ Verified' : '✗ Not Verified'}</p>
            </div>
            <div className={`rounded-lg p-4 ${verification.cloudinary ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Cloudinary</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{verification.cloudinary ? '✓ Verified' : '✗ Not Verified'}</p>
            </div>
            <div className={`rounded-lg p-4 ${verification.age ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Age</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{verification.age ? '✓ Verified' : '✗ Not Verified'}</p>
            </div>
            <div className={`rounded-lg p-4 ${verification.id ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <p className="text-sm font-medium text-slate-900 dark:text-white">ID</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{verification.id ? '✓ Verified' : '✗ Not Verified'}</p>
            </div>
            <div className={`rounded-lg p-4 ${verification.profile ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Profile</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{verification.profile ? '✓ Verified' : '✗ Not Verified'}</p>
            </div>
            <div className={`rounded-lg p-4 ${verification.badge ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Badge</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{verification.badge ? '✓ Verified' : '✗ Not Verified'}</p>
            </div>
          </div>
        </div>

        {/* Verification Forms */}
        <div className="space-y-6">
          {/* Email Verification */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Email Verification</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Verify your email address</p>
              </div>
              {verification.email ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                  ✓ Verified
                </span>
              ) : (
                <button
                  onClick={() => emailMutation.mutate()}
                  disabled={emailMutation.isPending}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {emailMutation.isPending ? 'Sending...' : 'Verify Email'}
                </button>
              )}
            </div>
          </div>

          {/* Cloudinary Verification */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cloudinary Verification</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Verify your Cloudinary/IMVU account</p>
                {!verification.cloudinary && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={cloudinaryUsername}
                      onChange={(e) => setCloudinaryUsername(e.target.value)}
                      placeholder="Enter your Cloudinary username"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
              {verification.cloudinary ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                  ✓ Verified
                </span>
              ) : (
                <button
                  onClick={() => cloudinaryMutation.mutate()}
                  disabled={cloudinaryMutation.isPending || !cloudinaryUsername}
                  className="ml-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {cloudinaryMutation.isPending ? 'Verifying...' : 'Verify'}
                </button>
              )}
            </div>
          </div>

          {/* Age Verification */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Age Verification</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Confirm you are 18 or older</p>
                {!verification.age && (
                  <div className="mt-3">
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
              {verification.age ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                  ✓ Verified
                </span>
              ) : (
                <button
                  onClick={() => ageMutation.mutate()}
                  disabled={ageMutation.isPending || !dateOfBirth}
                  className="ml-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {ageMutation.isPending ? 'Verifying...' : 'Verify'}
                </button>
              )}
            </div>
          </div>

          {/* ID Verification */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">ID Verification</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Verify your government ID</p>
                {!verification.id && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="Enter ID number"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="">Select ID type</option>
                      <option value="passport">Passport</option>
                      <option value="drivers_license">Driver's License</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>
                )}
              </div>
              {verification.id ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                  ✓ Verified
                </span>
              ) : (
                <button
                  onClick={() => idMutation.mutate()}
                  disabled={idMutation.isPending || !idNumber || !idType}
                  className="ml-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {idMutation.isPending ? 'Verifying...' : 'Verify'}
                </button>
              )}
            </div>
          </div>

          {/* Profile Verification */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Profile Verification</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Complete your profile and request verification badge</p>
              </div>
              {verification.profile ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                  ✓ Verified
                </span>
              ) : (
                <button
                  onClick={() => profileMutation.mutate()}
                  disabled={profileMutation.isPending}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {profileMutation.isPending ? 'Submitting...' : 'Request Verification'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Become a Seller Section */}
        {(!user.roles?.includes('seller') && !user.roles?.includes('creator')) && (
          <div className="mt-12 rounded-2xl bg-indigo-600 p-8 text-center text-white shadow-xl dark:bg-indigo-500">
            <h2 className="text-2xl font-bold">Ready to Start Earning?</h2>
            <p className="mt-2 text-indigo-100">
              Complete your verification and upgrade your account to start selling your Avatar creations.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4">
              <button
                onClick={() => {
                  if (!verification.email || !verification.profile) {
                    alert('Please verify your email and complete your profile before becoming a seller.');
                    return;
                  }
                  becomeSellerMutation.mutate();
                }}
                disabled={becomeSellerMutation.isPending}
                className="rounded-full bg-white px-8 py-3 font-bold text-indigo-600 shadow-lg hover:bg-indigo-50 transition-all disabled:opacity-50"
              >
                {becomeSellerMutation.isPending ? 'Upgrading...' : 'Become a Seller'}
              </button>
              <p className="text-xs text-indigo-200">
                Requires: Email Verification & Completed Profile
              </p>
            </div>
          </div>
        )}

        {(user.roles?.includes('seller') || user.roles?.includes('creator')) && (
          <div className="mt-12 rounded-2xl bg-green-600 p-8 text-center text-white shadow-xl dark:bg-green-500">
            <h2 className="text-2xl font-bold">You're a Seller!</h2>
            <p className="mt-2 text-green-100">
              Your account is fully activated for selling. Visit your dashboard to manage your gigs.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 rounded-full bg-white px-8 py-3 font-bold text-green-600 shadow-lg hover:bg-green-50 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
