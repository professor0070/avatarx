import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuthStore } from '../../../store/authStore';
import type { AvatarXUser } from '../../../types/auth';

// Mock the auth store
vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const createMockUser = (overrides: Partial<AvatarXUser> = {}): AvatarXUser => ({
  id: '1',
  email: 'test@example.com',
  displayName: 'Test User',
  imvuUsername: 'imvu_user',
  role: 'buyer',
  avatar: 'https://example.com/avatar.png',
  badges: [],
  sellerLevel: 'new',
  isEmailVerified: false,
  isAgeVerified: false,
  isCloudinaryVerified: false,
  isIdVerified: false,
  isProfileVerified: false,
  verificationBadge: false,
  verificationStatus: 'pending',
  isAvailable: true,
  outOfOfficeUntil: null,
  outOfOfficeMessage: '',
  isOnline: false,
  lastSeen: null,
  crWalletBalance: 0,
  ...overrides,
});

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;
const LoginComponent = () => <div data-testid="login-page">Login Page</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render protected content when user is authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      accessToken: 'valid-token',
      user: createMockUser(),
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<LoginComponent />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<TestComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      accessToken: null,
      user: null,
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<LoginComponent />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<TestComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('should redirect to login when access token is missing', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      accessToken: null,
      user: createMockUser(),
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<LoginComponent />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<TestComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });
});
