import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface SystemSettings {
  platform: {
    name: string;
    description: string;
    logo: string;
    favicon: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  commission: {
    rate: number;
    freelancerRate: number;
    affiliateRate: number;
  };
  limits: {
    maxGigsPerUser: number;
    maxOrdersPerDay: number;
    maxFileSize: number;
    maxMessageLength: number;
  };
  features: {
    enableMessaging: boolean;
    enableReviews: boolean;
    enableDisputes: boolean;
    enableAffiliates: boolean;
    enableAdultContent: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
  };
  security: {
    requireEmailVerification: boolean;
    enableTwoFactorAuth: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
}

type TabId = 'platform' | 'commission' | 'limits' | 'features' | 'notifications' | 'security';

interface Tab {
  id: TabId;
  label: string;
}

export function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('platform');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch system settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await api.get('/api/admin/settings');
      return response.data;
    },
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<SystemSettings>) => {
      const response = await api.put('/api/admin/settings', newSettings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setIsSaving(false);
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  // Update settings when data is loaded
  useState(() => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings);
    }
  });

  const handleSettingChange = (category: keyof SystemSettings, field: string, value: unknown) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      [category]: {
        ...prev![category],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    if (!settings) return;
    
    setIsSaving(true);
    updateSettings.mutate(settings);
  };

  const handleReset = () => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="animate-pulse">
            <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-12 border border-slate-200 dark:border-slate-700 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚙️</span>
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Unable to load settings
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Please try refreshing the page
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          System Settings
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex space-x-8">
          {([
            { id: 'platform', label: 'Platform' },
            { id: 'commission', label: 'Commission' },
            { id: 'limits', label: 'Limits' },
            { id: 'features', label: 'Features' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'security', label: 'Security' },
          ] as Tab[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform Settings */}
      {activeTab === 'platform' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Platform Settings
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={settings.platform.name}
                  onChange={(e) => handleSettingChange('platform', 'name', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Platform Description
                </label>
                <input
                  type="text"
                  value={settings.platform.description}
                  onChange={(e) => handleSettingChange('platform', 'description', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Logo URL
                </label>
                <input
                  type="text"
                  value={settings.platform.logo}
                  onChange={(e) => handleSettingChange('platform', 'logo', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Favicon URL
                </label>
                <input
                  type="text"
                  value={settings.platform.favicon}
                  onChange={(e) => handleSettingChange('platform', 'favicon', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white">Maintenance Mode</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Enable to put the platform in maintenance mode
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('platform', 'maintenanceMode', !settings.platform.maintenanceMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.platform.maintenanceMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.platform.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Maintenance Message
                </label>
                <textarea
                  value={settings.platform.maintenanceMessage}
                  onChange={(e) => handleSettingChange('platform', 'maintenanceMessage', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Settings */}
      {activeTab === 'commission' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Commission Settings
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Platform Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.commission.rate}
                  onChange={(e) => handleSettingChange('commission', 'rate', parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Platform takes this percentage from each transaction
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Freelancer Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.commission.freelancerRate}
                  onChange={(e) => handleSettingChange('commission', 'freelancerRate', parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Additional commission for premium freelancers
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Affiliate Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.commission.affiliateRate}
                  onChange={(e) => handleSettingChange('commission', 'affiliateRate', parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Commission for affiliate referrals
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Limits Settings */}
      {activeTab === 'limits' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            System Limits
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Max Gigs Per User
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.limits.maxGigsPerUser}
                  onChange={(e) => handleSettingChange('limits', 'maxGigsPerUser', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Max Orders Per Day
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.limits.maxOrdersPerDay}
                  onChange={(e) => handleSettingChange('limits', 'maxOrdersPerDay', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.limits.maxFileSize}
                  onChange={(e) => handleSettingChange('limits', 'maxFileSize', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Max Message Length
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.limits.maxMessageLength}
                  onChange={(e) => handleSettingChange('limits', 'maxMessageLength', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Settings */}
      {activeTab === 'features' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Feature Toggles
          </h3>
          
          <div className="space-y-4">
            {Object.entries(settings.features).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {key === 'enableMessaging' && 'Allow users to send messages to each other'}
                    {key === 'enableReviews' && 'Allow users to leave reviews for gigs and freelancers'}
                    {key === 'enableDisputes' && 'Allow users to open disputes for orders'}
                    {key === 'enableAffiliates' && 'Enable affiliate program for referrals'}
                    {key === 'enableAdultContent' && 'Allow adult content on the platform'}
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('features', key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Notification Settings
          </h3>
          
          <div className="space-y-4">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {key === 'emailNotifications' && 'Send notifications via email'}
                    {key === 'pushNotifications' && 'Send push notifications to users'}
                    {key === 'smsNotifications' && 'Send SMS notifications to users'}
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('notifications', key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Security Settings
          </h3>
          
          <div className="space-y-6">
            <div className="space-y-4">
              {Object.entries(settings.security).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {key === 'requireEmailVerification' && 'Require users to verify their email address'}
                      {key === 'enableTwoFactorAuth' && 'Enable two-factor authentication for users'}
                      {key === 'sessionTimeout' && 'Session timeout in minutes'}
                      {key === 'maxLoginAttempts' && 'Maximum login attempts before account lockout'}
                    </p>
                  </div>
                  {typeof value === 'boolean' ? (
                    <button
                      onClick={() => handleSettingChange('security', key, !value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={value}
                      onChange={(e) => handleSettingChange('security', key, parseInt(e.target.value))}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
