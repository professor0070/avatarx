import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'creator'>('profile');
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    bio: '',
    skills: '',
    languages: '',
    isAvailable: true,
    hasAcceptedCreatorPolicy: false,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    orderUpdates: true,
    messageNotifications: true,
    promotionEmails: false,
  });

  interface ProfileData {
    displayName: string;
    bio: string;
    skills: string[];
    languages: string[];
    isAvailable: boolean;
    hasAcceptedCreatorPolicy?: boolean;
  }

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const response = await api.patch('/api/users/me', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      alert('Profile updated successfully');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/logout', {});
    },
    onSuccess: () => {
      clearSession();
      navigate('/', { replace: true });
    },
  });

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault();

    const skills = formData.skills
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);

    const languages = formData.languages
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s);

    updateProfileMutation.mutate({
      displayName: formData.displayName,
      bio: formData.bio,
      skills,
      languages,
      isAvailable: formData.isAvailable,
      hasAcceptedCreatorPolicy: formData.hasAcceptedCreatorPolicy,
    });
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logoutMutation.mutate();
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-slate-600 dark:text-slate-400">Please log in to access settings</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Helmet>
        <title>Settings - AvatarX</title>
        <meta name="description" content="Manage your account settings" />
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2 text-sm font-medium ${
              activeTab === 'profile'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-2 text-sm font-medium ${
              activeTab === 'notifications'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2 text-sm font-medium ${
              activeTab === 'security'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('creator')}
            className={`pb-2 text-sm font-medium ${
              activeTab === 'creator'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Creator
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Settings</h2>
            <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="Tell clients about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="e.g., 3D modeling, animation, texturing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Languages (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.languages}
                  onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="e.g., English, Spanish, French"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                />
                <label htmlFor="isAvailable" className="text-sm text-slate-700 dark:text-slate-300">
                  Available for new orders
                </label>
              </div>

              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notification Settings</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Email Notifications</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Receive notifications via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.emailNotifications}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Push Notifications</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Receive browser push notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.pushNotifications}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, pushNotifications: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Order Updates</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Get notified about order status changes</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.orderUpdates}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, orderUpdates: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Message Notifications</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Get notified about new messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.messageNotifications}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, messageNotifications: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Promotional Emails</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Receive promotional emails and offers</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.promotionEmails}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, promotionEmails: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security Settings</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Email Verified</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {user.isEmailVerified ? '✓ Your email is verified' : '✗ Email not verified'}
                </p>
              </div>

              <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Age Verified</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {user.isAgeVerified ? '✓ Your age is verified' : '✗ Age not verified'}
                </p>
              </div>

              <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Cloudinary Verified</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {user.isCloudinaryVerified ? '✓ Cloudinary account verified' : '✗ Cloudinary not verified'}
                </p>
              </div>

              <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-white">ID Verified</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {user.isIdVerified ? '✓ Your ID is verified' : '✗ ID not verified'}
                </p>
              </div>

              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="mt-4 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {logoutMutation.isPending ? 'Logging out...' : 'Log Out'}
              </button>
            </div>
          </div>
        )}

        {/* Creator Tab */}
        {activeTab === 'creator' && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Creator Onboarding & Payouts</h2>
            <div className="mt-4 space-y-6">
              
              <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">Action Required: Creator Policy Agreement</h3>
                <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                  Before you can activate your seller dashboard and receive payouts, you must agree to the Creator Policy.
                </p>
                <div className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="creatorPolicy"
                    checked={formData.hasAcceptedCreatorPolicy}
                    onChange={(e) => {
                      setFormData({ ...formData, hasAcceptedCreatorPolicy: e.target.checked });
                      if (e.target.checked) {
                        updateProfileMutation.mutate({
                          displayName: formData.displayName,
                          bio: formData.bio,
                          skills: formData.skills.split(',').filter(s => s),
                          languages: formData.languages.split(',').filter(s => s),
                          isAvailable: formData.isAvailable,
                          hasAcceptedCreatorPolicy: true
                        });
                      }
                    }}
                    className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:border-amber-500 dark:border-amber-700 dark:bg-amber-900"
                  />
                  <label htmlFor="creatorPolicy" className="text-sm text-amber-900 dark:text-amber-100 font-medium leading-tight">
                    I agree to the Creator Policy. I understand that I am an independent contractor, solely responsible for my own taxes, and that off-platform transactions will result in an immediate ban.
                  </label>
                </div>
              </div>

              {formData.hasAcceptedCreatorPolicy && (
                <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">✓ Creator Policy Accepted</p>
                  <p className="mt-1 text-sm text-green-800 dark:text-green-200">You are eligible to receive payouts. Please ensure your KYC documents are up to date with our payment processor.</p>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
