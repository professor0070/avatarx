import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformSettings extends Document {
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

const platformSettingsSchema = new Schema<IPlatformSettings>({
  platform: {
    name: { type: String, default: 'AvatarX' },
    description: { type: String, default: 'Premium IMVU Marketplace' },
    logo: { type: String, default: '' },
    favicon: { type: String, default: '' },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'Under maintenance. Be right back!' },
  },
  commission: {
    rate: { type: Number, default: 15 },
    freelancerRate: { type: Number, default: 5 },
    affiliateRate: { type: Number, default: 10 },
  },
  limits: {
    maxGigsPerUser: { type: Number, default: 50 },
    maxOrdersPerDay: { type: Number, default: 100 },
    maxFileSize: { type: Number, default: 50 },
    maxMessageLength: { type: Number, default: 5000 },
  },
  features: {
    enableMessaging: { type: Boolean, default: true },
    enableReviews: { type: Boolean, default: true },
    enableDisputes: { type: Boolean, default: true },
    enableAffiliates: { type: Boolean, default: false },
    enableAdultContent: { type: Boolean, default: true },
  },
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
  },
  security: {
    requireEmailVerification: { type: Boolean, default: false },
    enableTwoFactorAuth: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 60 },
    maxLoginAttempts: { type: Number, default: 5 },
  },
});

export async function getPlatformSettings() {
  let settings = await PlatformSettings.findOne();
  if (!settings) {
    settings = await PlatformSettings.create({});
  }
  return settings;
}

export const PlatformSettings = mongoose.model<IPlatformSettings>('PlatformSettings', platformSettingsSchema);
