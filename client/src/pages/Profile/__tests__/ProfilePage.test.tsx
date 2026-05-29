import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfilePage } from '../index';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../lib/api';
import type { AvatarXUser } from '../../../types/auth';

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../../lib/api', () => ({
  api: { get: vi.fn() },
}));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

interface StoreState {
  accessToken: string | null;
  user: AvatarXUser | null;
  setSession: ReturnType<typeof vi.fn>;
  clearSession: ReturnType<typeof vi.fn>;
}

const defaultStore: StoreState = {
  accessToken: 'token',
  user: null as AvatarXUser | null,
  setSession: vi.fn(),
  clearSession: vi.fn(),
};

function setStoreUser(user: AvatarXUser | null) {
  defaultStore.user = user;
}

vi.mocked(useAuthStore).mockImplementation((selector?: (s: any) => unknown) => {
  if (selector) return selector(defaultStore);
  return defaultStore;
});

const createAuthUser = (overrides: Partial<AvatarXUser> = {}): AvatarXUser => ({
  id: 'user-1',
  email: 'seller@test.com',
  displayName: 'Test Seller',
  imvuUsername: 'test_seller',
  role: 'seller',
  avatar: 'https://example.com/avatar.png',
  badges: [],
  sellerLevel: 'new',
  isEmailVerified: true,
  isAgeVerified: true,
  isCloudinaryVerified: false,
  isIdVerified: false,
  isProfileVerified: false,
  verificationBadge: false,
  verificationStatus: 'pending',
  isAvailable: true,
  outOfOfficeUntil: null,
  outOfOfficeMessage: '',
  isOnline: true,
  lastSeen: null,
  crWalletBalance: 100,
  ...overrides,
});

const mockProfileData = {
  ok: true,
  user: {
    id: 'user-1',
    username: 'testseller',
    email: 'seller@test.com',
    displayName: 'Test Seller',
    imvuId: null,
    imvuUsername: 'test_seller',
    credits: 500,
    role: 'seller',
    avatar: 'https://example.com/avatar.png',
    badges: ['AP'],
    sellerLevel: 'level2',
    isEmailVerified: true,
    isAgeVerified: true,
    isCloudinaryVerified: true,
    isIdVerified: false,
    isProfileVerified: true,
    verificationBadge: true,
    isAvailable: true,
    outOfOfficeUntil: null,
    outOfOfficeMessage: '',
    isOnline: true,
    lastSeen: null,
    bio: 'Professional 3D artist specializing in avatar creation.',
    skills: ['3D Modeling', 'Texturing', 'Rigging'],
    languages: ['English', 'Spanish'],
    certifications: ['Certified 3D Artist'],
    portfolio: [
      { url: 'https://example.com/work1.png', type: 'image', title: 'Fantasy Armor Set' },
      { url: 'https://example.com/work2.mp4', type: 'video', title: 'Animation Demo' },
    ],
    totalOrdersCompleted: 42,
    totalEarnedINR: 50000,
    totalEarnedUSD: 600,
    crWalletBalance: 100,
    successScore: 98,
    responseRate: 95,
    avgResponseTimeMinutes: 15,
    profileCompleteness: 85,
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  },
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderProfile(queryClient?: QueryClient) {
  const qc = queryClient ?? createQueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ProfilePage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStoreUser(createAuthUser());
    vi.mocked(api.get).mockResolvedValue({ data: mockProfileData });
  });

  it('should show loading skeleton while fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderProfile();
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('should show login prompt when no auth user', () => {
    setStoreUser(null);
    renderProfile();
    expect(screen.getByText('Please log in to view your profile')).toBeInTheDocument();
  });

  it('should render full seller profile with all sections', async () => {
    renderProfile();
    expect(await screen.findByText('Test Seller')).toBeInTheDocument();
    expect(screen.getByText(/seller@test\.com/)).toBeInTheDocument();
    expect(screen.getByText(/@test_seller/)).toBeInTheDocument();
    expect(screen.getByText('Level 2')).toBeInTheDocument();
    expect(screen.getAllByText('✓ Verified').length).toBeGreaterThan(0);
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Professional 3D artist specializing in avatar creation.')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('$600')).toBeInTheDocument();
    expect(screen.getByText('98%')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('3D Modeling')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Certified 3D Artist')).toBeInTheDocument();
    expect(screen.getByText('Fantasy Armor Set')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('AP')).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should show empty states for missing bio, skills, languages', async () => {
    const profileNoExtras = {
      ...mockProfileData,
      user: {
        ...mockProfileData.user,
        bio: '',
        skills: [],
        languages: [],
        certifications: [],
        portfolio: [],
        badges: [],
        sellerLevel: 'new',
      },
    };
    vi.mocked(api.get).mockResolvedValue({ data: profileNoExtras });

    renderProfile();
    expect(await screen.findByText('No bio added yet')).toBeInTheDocument();
    expect(screen.getByText('No skills listed')).toBeInTheDocument();
    expect(screen.getByText('No languages listed')).toBeInTheDocument();
    expect(screen.getByText('No portfolio items')).toBeInTheDocument();
    expect(screen.queryByText('Certifications')).not.toBeInTheDocument();
  });

  it('should show buyer profile without seller-specific elements', async () => {
    setStoreUser(createAuthUser({ role: 'buyer' }));
    const profileBuyer = {
      ...mockProfileData,
      user: { ...mockProfileData.user, role: 'buyer', sellerLevel: 'new' as const },
    };
    vi.mocked(api.get).mockResolvedValue({ data: profileBuyer });

    renderProfile();
    expect(await screen.findByText('Test Seller')).toBeInTheDocument();
    expect(screen.queryByText('Level 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('should fall back to auth store user when API call fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    const qc = createQueryClient();
    renderProfile(qc);
    expect(await screen.findByText('Test Seller')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getAllByText('0%').length).toBe(2);
  });
});
